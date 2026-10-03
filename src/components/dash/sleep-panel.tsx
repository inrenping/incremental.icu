'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@tabler/icons-react';

// ---- 佳明 sleepLevels.activityLevel 阶段编码 ----
const STAGE_DEEP = 0;
const STAGE_LIGHT = 1;
const STAGE_REM = 2;
const STAGE_AWAKE = 3;

// 统一使用佳明官方中文术语
const STAGE_META: Record<number, { label: string; color: string }> = {
  [STAGE_AWAKE]: { label: '清醒', color: '#E24B4A' },
  [STAGE_REM]: { label: 'REM', color: '#1D9E75' },
  [STAGE_LIGHT]: { label: '浅睡', color: '#378ADD' },
  [STAGE_DEEP]: { label: '深睡', color: '#7F77DD' },
};

// 自上而下：清醒 / REM / 浅睡 / 深睡（与参考图一致）
const ROW_ORDER = [STAGE_AWAKE, STAGE_REM, STAGE_LIGHT, STAGE_DEEP];

interface SleepDaily {
  calendar_date: string;
  sleep_start_at: string | null;
  sleep_end_at: string | null;
  local_offset_minutes: number | null;
  sleep_time_seconds: number | null;
  nap_time_seconds: number | null;
  deep_sleep_seconds: number | null;
  light_sleep_seconds: number | null;
  rem_sleep_seconds: number | null;
  awake_sleep_seconds: number | null;
  awake_count: number | null;
  sleep_score: number | null;
}

interface SleepLevel {
  start_at: string;
  end_at: string;
  duration_seconds: number;
  activity_level: number;
}

interface MonthDay {
  calendar_date: string;
  sleep_start_at: string | null;
  sleep_end_at: string | null;
  sleep_time_seconds: number | null;
  deep_sleep_seconds: number | null;
  light_sleep_seconds: number | null;
  rem_sleep_seconds: number | null;
  awake_sleep_seconds: number | null;
  awake_count: number | null;
  sleep_score: number | null;
  levels: SleepLevel[];
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m}分钟`;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

/** 极坐标：0 度在正上方，顺时针递增 */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

/** 圆环扇形路径（用于月报的每一天） */
function arcPath(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  a1: number,
  a2: number
): string {
  const [x1o, y1o] = polar(cx, cy, r2, a1);
  const [x2o, y2o] = polar(cx, cy, r2, a2);
  const [x2i, y2i] = polar(cx, cy, r1, a2);
  const [x1i, y1i] = polar(cx, cy, r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return [
    `M ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
    `A ${r2} ${r2} 0 ${large} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)}`,
    `L ${x2i.toFixed(2)} ${y2i.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// ==================== 日视图：阶段时间轴 ====================

const DAY_W = 820;
const DAY_PAD = { top: 18, right: 20, bottom: 46, left: 96 };
const DAY_ROW_H = 60;
const DAY_PLOT_H = ROW_ORDER.length * DAY_ROW_H;
const DAY_H = DAY_PAD.top + DAY_PLOT_H + DAY_PAD.bottom;
const DAY_PLOT_W = DAY_W - DAY_PAD.left - DAY_PAD.right;

function DayChart({
  dateStr,
  daily,
  levels,
}: {
  dateStr: string;
  daily: SleepDaily | null;
  levels: SleepLevel[];
}) {
  // 时间窗默认：前一天 18:00 → 当天 12:00（18 小时），数据超出时自动扩展，
  // 这样绝大多数夜晚落在同一窗口内，跨天对比不会被拉伸错觉干扰
  const anchor = dayjs(dateStr);
  let windowStart = anchor.subtract(1, 'day').hour(18).minute(0).second(0);
  let windowEnd = anchor.hour(12).minute(0).second(0);

  const parsed = levels
    .map((lv) => ({ ...lv, s: dayjs(lv.start_at), e: dayjs(lv.end_at) }))
    .filter((lv) => lv.s.isValid() && lv.e.isValid())
    .sort((a, b) => a.s.valueOf() - b.s.valueOf());

  for (const lv of parsed) {
    if (lv.s.isBefore(windowStart)) windowStart = lv.s.subtract(30, 'minute');
    if (lv.e.isAfter(windowEnd)) windowEnd = lv.e.add(30, 'minute');
  }

  const spanMs = Math.max(windowEnd.diff(windowStart), 3600_000);
  const toX = (t: dayjs.Dayjs) =>
    DAY_PAD.left +
    ((t.valueOf() - windowStart.valueOf()) / spanMs) * DAY_PLOT_W;

  const ticks: dayjs.Dayjs[] = [];
  let cursor = windowStart.add(1, 'hour').startOf('hour');
  while (cursor.isBefore(windowEnd) && ticks.length < 48) {
    ticks.push(cursor);
    cursor = cursor.add(1, 'hour');
  }
  const tickStep = spanMs > 20 * 3600_000 ? 3 : 2;

  const durationByStage = useMemo(() => {
    const acc: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const lv of levels) {
      acc[lv.activity_level] = (acc[lv.activity_level] || 0) + lv.duration_seconds;
    }
    return acc;
  }, [levels]);

  if (!daily) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        暂无睡眠数据，点右上角同步按钮拉取
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${DAY_W} ${DAY_H}`}
      width="100%"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>当日睡眠阶段时间轴</title>

      {ROW_ORDER.map((stage, rowIdx) => {
        const rowY = DAY_PAD.top + rowIdx * DAY_ROW_H;
        const meta = STAGE_META[stage];
        return (
          <g key={stage}>
            <rect
              x={DAY_PAD.left}
              y={rowY + 14}
              width={DAY_PLOT_W}
              height={30}
              rx={6}
              fill="var(--muted)"
              opacity={0.35}
            />
            <text
              x={8}
              y={rowY + 24}
              fontSize={13}
              fontWeight={500}
              fill="var(--foreground)"
            >
              {meta.label}
            </text>
            <text x={8} y={rowY + 42} fontSize={12} fill="var(--muted-foreground)">
              {formatDuration(durationByStage[stage])}
            </text>
          </g>
        );
      })}

      {ticks.map((tick) => {
        const x = toX(tick);
        return (
          <line
            key={tick.valueOf()}
            x1={x}
            y1={DAY_PAD.top}
            x2={x}
            y2={DAY_PAD.top + DAY_PLOT_H}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray="3 4"
          />
        );
      })}

      {parsed.map((lv, idx) => {
        const rowIdx = ROW_ORDER.indexOf(lv.activity_level);
        if (rowIdx < 0) return null;
        const x1 = toX(lv.s);
        const x2 = toX(lv.e);
        const w = Math.max(x2 - x1, 2);
        const y = DAY_PAD.top + rowIdx * DAY_ROW_H + 14;
        return (
          <rect
            key={`${lv.start_at}-${idx}`}
            x={x1}
            y={y}
            width={w}
            height={30}
            rx={3}
            fill={STAGE_META[lv.activity_level].color}
          />
        );
      })}

      <line
        x1={DAY_PAD.left}
        y1={DAY_PAD.top + DAY_PLOT_H + 6}
        x2={DAY_PAD.left + DAY_PLOT_W}
        y2={DAY_PAD.top + DAY_PLOT_H + 6}
        stroke="var(--border)"
        strokeWidth={0.5}
      />
      {ticks.map((tick, idx) => {
        if (idx % tickStep !== 0) return null;
        const x = toX(tick);
        return (
          <text
            key={`label-${tick.valueOf()}`}
            x={x}
            y={DAY_PAD.top + DAY_PLOT_H + 28}
            fontSize={12}
            fill="var(--muted-foreground)"
            textAnchor="middle"
          >
            {tick.format('HH:mm')}
          </text>
        );
      })}
    </svg>
  );
}

// ==================== 月视图：当月睡眠报告（时钟环形 · 参考小米风格） ====================

const MONTH_W = 880;
const MONTH_H = 760;
const MONTH_CX = 470;
const MONTH_CY = 392;
const MONTH_R_INNER = 128;
const MONTH_R_OUTER = 318;

/** 时钟角：0:00 在正上方、6:00 在正下方，顺时针每小时 30°（polar 的 0° 即正上方） */
function clockAngle(iso: string): number {
  const t = dayjs(iso);
  return (30 * ((t.hour() + t.minute() / 60) % 12) + 360) % 360;
}

/** 分钟数（自 0:00 起）转时钟角 */
function minutesToClockAngle(minutes: number): number {
  return (30 * ((minutes / 60) % 12) + 360) % 360;
}

/** 平均时刻显示：23:53 */
function formatHM(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** 中心大字用的简短时长：7时36分 */
function formatShort(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m}分`;
  return m > 0 ? `${h}时${String(m).padStart(2, '0')}分` : `${h}时`;
}

/** 细环线弧段路径 */
function arcStroke(
  cx: number,
  cy: number,
  r: number,
  a1: number,
  a2: number
): string {
  const [x1, y1] = polar(cx, cy, r, a1);
  const [x2, y2] = polar(cx, cy, r, a2);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** 弯曲文字路径：cw=true 顺时针（弧顶文字可读），false 逆时针（弧底可读） */
function arcTextPath(
  cx: number,
  cy: number,
  r: number,
  a1: number,
  a2: number,
  cw: boolean
): string {
  const [x1, y1] = polar(cx, cy, r, a1);
  const [x2, y2] = polar(cx, cy, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${cw ? 1 : 0} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** 圆上一点，转成 circle 的 cx/cy 属性 */
function polarAttrs(
  cx: number,
  cy: number,
  r: number,
  deg: number
): { cx: number; cy: number } {
  const [x, y] = polar(cx, cy, r, deg);
  return { cx: x, cy: y };
}

function MonthChart({ monthStr, days }: { monthStr: string; days: MonthDay[] }) {
  const daysInMonth = dayjs(monthStr + '-01').daysInMonth();
  const thickness = (MONTH_R_OUTER - MONTH_R_INNER) / daysInMonth;

  const stats = useMemo(() => {
    let sleepSum = 0;
    let deepSum = 0;
    let count = 0;
    const bedMins: number[] = [];
    const wakeMins: number[] = [];

    for (const d of days) {
      if (d.sleep_time_seconds && d.sleep_time_seconds > 0) {
        sleepSum += d.sleep_time_seconds;
        deepSum += d.deep_sleep_seconds || 0;
        count += 1;
      }
      if (d.sleep_start_at) {
        const t = dayjs(d.sleep_start_at);
        let m = t.hour() * 60 + t.minute();
        if (m < 12 * 60) m += 24 * 60; // 凌晨入睡视作前一夜
        bedMins.push(m);
      }
      if (d.sleep_end_at) {
        const t = dayjs(d.sleep_end_at);
        wakeMins.push(t.hour() * 60 + t.minute());
      }
    }

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      daysWithData: count,
      avgSleep: count ? sleepSum / count : null,
      avgDeep: count ? deepSum / count : null,
      avgBedMin: avg(bedMins),
      avgWakeMin: avg(wakeMins),
    };
  }, [days]);

  const bedLabel =
    stats.avgBedMin === null ? null : `日均入睡 ${formatHM(stats.avgBedMin)}`;
  const wakeLabel =
    stats.avgWakeMin === null ? null : `日均醒来 ${formatHM(stats.avgWakeMin)}`;
  const bedAngle =
    stats.avgBedMin === null ? null : minutesToClockAngle(stats.avgBedMin);
  const wakeAngle =
    stats.avgWakeMin === null ? null : minutesToClockAngle(stats.avgWakeMin);
  const monthNo = dayjs(monthStr + '-01').month() + 1;

  if (stats.daysWithData === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        本月还没有睡眠数据，同步后才会出现
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${MONTH_W} ${MONTH_H}`}
      width="100%"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{monthStr} 睡眠报告</title>

      {/* 标题（右上） */}
      <text
        x={MONTH_W - 28}
        y={46}
        textAnchor="end"
        fontSize={22}
        fontWeight={600}
        fill="var(--foreground)"
      >
        {dayjs(monthStr + '-01').format('YYYY[年]M[月]')} 睡眠报告
      </text>

      {/* 图例（左上，竖排） */}
      {[...ROW_ORDER].reverse().map((stage, idx) => (
        <g key={`legend-${stage}`}>
          <line
            x1={24}
            y1={38 + idx * 24}
            x2={48}
            y2={38 + idx * 24}
            stroke={STAGE_META[stage].color}
            strokeWidth={3.5}
          />
          <text x={56} y={38 + idx * 24 + 4} fontSize={12} fill="var(--muted-foreground)">
            {STAGE_META[stage].label}
          </text>
        </g>
      ))}
      <circle cx={36} cy={38 + 4 * 24} r={3.5} fill="var(--foreground)" />
      <text x={56} y={38 + 4 * 24 + 4} fontSize={12} fill="var(--muted-foreground)">
        入睡时间
      </text>
      <circle cx={36} cy={38 + 5 * 24} r={3.5} fill="var(--muted-foreground)" />
      <text x={56} y={38 + 5 * 24 + 4} fontSize={12} fill="var(--muted-foreground)">
        睡醒时间
      </text>

      {/* 月份水印（参考图 SEPTEMBER） */}
      <text
        x={MONTH_CX}
        y={MONTH_CY + 18}
        textAnchor="middle"
        fontSize={54}
        fontWeight={600}
        letterSpacing={4}
        fill="var(--muted-foreground)"
        opacity={0.12}
      >
        {dayjs(monthStr + '-01').format('MMMM').toUpperCase()}
      </text>

      {/* 每天一条细环线：从入睡时刻顺时针画到醒来时刻 */}
      {days.map((d) => {
        const dayIndex = Number(d.calendar_date.slice(8, 10)) - 1;
        if (dayIndex < 0 || dayIndex >= daysInMonth) return null;
        const r = MONTH_R_INNER + (dayIndex + 0.5) * thickness;
        const w = Math.max(thickness * 0.55, 2);

        const segments =
          d.levels && d.levels.length > 0
            ? d.levels.map((lv) => {
                const a1 = clockAngle(lv.start_at);
                let a2 = clockAngle(lv.end_at);
                while (a2 <= a1) a2 += 360;
                return {
                  level: lv.activity_level,
                  a1,
                  a2: Math.min(a2, a1 + 359.9),
                };
              })
            : proportionalSegments(d);
        if (segments.length === 0) return null;

        return (
          <g key={d.calendar_date}>
            {segments.map((seg, idx) => {
              const a2 = Math.max(seg.a2, seg.a1 + 0.3);
              return (
                <path
                  key={idx}
                  d={arcStroke(MONTH_CX, MONTH_CY, r, seg.a1, a2)}
                  stroke={STAGE_META[seg.level]?.color ?? 'var(--muted)'}
                  strokeWidth={w}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}

            {d.sleep_start_at && (
              <circle
                {...polarAttrs(MONTH_CX, MONTH_CY, r, clockAngle(d.sleep_start_at))}
                r={2}
                fill="var(--foreground)"
              />
            )}
            {d.sleep_end_at && (
              <circle
                {...polarAttrs(MONTH_CX, MONTH_CY, r, clockAngle(d.sleep_end_at))}
                r={2}
                fill="var(--muted-foreground)"
              />
            )}
          </g>
        );
      })}

      {/* 外圈日间色带：醒来 → 入睡 之间的空档（日均） */}
      {bedAngle !== null && wakeAngle !== null && (() => {
        let a2 = bedAngle;
        while (a2 <= wakeAngle) a2 += 360;
        return (
          <path
            d={arcPath(MONTH_CX, MONTH_CY, MONTH_R_OUTER + 2, MONTH_R_OUTER + 30, wakeAngle, a2)}
            fill="var(--secondary)"
          />
        );
      })()}

      {/* 内圈时钟表盘：0:00 在正上方 */}
      <circle
        cx={MONTH_CX}
        cy={MONTH_CY}
        r={MONTH_R_INNER}
        fill="none"
        stroke="var(--border)"
        strokeWidth={1}
      />
      {Array.from({ length: 12 }, (_, h) => {
        const a = 30 * h;
        const major = h % 3 === 0;
        const [x1, y1] = polar(MONTH_CX, MONTH_CY, MONTH_R_INNER, a);
        const [x2, y2] = polar(MONTH_CX, MONTH_CY, MONTH_R_INNER - (major ? 10 : 5), a);
        const [tx, ty] = polar(MONTH_CX, MONTH_CY, MONTH_R_INNER - 26, a);
        return (
          <g key={`clock-${h}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1} />
            <text
              x={tx}
              y={ty}
              fontSize={12}
              fill="var(--muted-foreground)"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {h === 0 ? 12 : h}
            </text>
          </g>
        );
      })}

      {/* 日期标线：N/1（最内圈）→ N/末（最外圈），落在 9:00 方向的空档 */}
      <line
        x1={MONTH_CX - MONTH_R_OUTER - 6}
        y1={MONTH_CY}
        x2={MONTH_CX - MONTH_R_INNER + 2}
        y2={MONTH_CY}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={MONTH_CX - MONTH_R_INNER - 8}
        y={MONTH_CY - 8}
        fontSize={12}
        fill="var(--muted-foreground)"
        textAnchor="end"
      >
        {monthNo}/1
      </text>
      <text
        x={MONTH_CX - MONTH_R_OUTER - 10}
        y={MONTH_CY - 8}
        fontSize={12}
        fill="var(--muted-foreground)"
        textAnchor="end"
      >
        {monthNo}/{daysInMonth}
      </text>

      {/* 中心统计 */}
      <text
        x={MONTH_CX}
        y={MONTH_CY - 30}
        fontSize={30}
        fontWeight={600}
        fill="var(--foreground)"
        textAnchor="middle"
      >
        {formatShort(stats.avgSleep ? Math.round(stats.avgSleep) : null)}
      </text>
      <text
        x={MONTH_CX}
        y={MONTH_CY - 4}
        fontSize={12}
        fill="var(--muted-foreground)"
        textAnchor="middle"
      >
        日均睡眠
      </text>
      <text
        x={MONTH_CX}
        y={MONTH_CY + 34}
        fontSize={24}
        fontWeight={500}
        fill="var(--foreground)"
        textAnchor="middle"
      >
        {formatShort(stats.avgDeep ? Math.round(stats.avgDeep) : null)}
      </text>
      <text
        x={MONTH_CX}
        y={MONTH_CY + 58}
        fontSize={12}
        fill="var(--muted-foreground)"
        textAnchor="middle"
      >
        日均深睡
      </text>

      {/* 外圈弧形标签：日均入睡 / 日均醒来（沿色带弯曲排布） */}
      {bedAngle !== null && bedLabel !== null && (
        <CurvedAngleLabel deg={bedAngle} text={bedLabel} idPrefix={`${monthStr}-bed`} />
      )}
      {wakeAngle !== null && wakeLabel !== null && (
        <CurvedAngleLabel deg={wakeAngle} text={wakeLabel} idPrefix={`${monthStr}-wake`} />
      )}
    </svg>
  );
}

/** 沿外圈色带弯曲排布的标签（弧顶顺时针可读、弧底逆时针可读） */
function CurvedAngleLabel({
  deg,
  text,
  idPrefix,
}: {
  deg: number;
  text: string;
  idPrefix: string;
}) {
  const n = ((deg % 360) + 360) % 360;
  const bottom = n > 92 && n < 268;
  const r = bottom ? MONTH_R_OUTER + 22 : MONTH_R_OUTER + 10;
  const a1 = bottom ? deg + 64 : deg - 64;
  const a2 = bottom ? deg + 6 : deg - 6;
  const id = `${idPrefix}-${Math.round(n)}`;
  return (
    <g>
      <defs>
        <path id={id} d={arcTextPath(MONTH_CX, MONTH_CY, r, a1, a2, !bottom)} />
      </defs>
      <text fontSize={13} fill="var(--secondary-foreground)">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </g>
  );
}

/** 没有阶段片段时，按各阶段时长比例顺序排布（视觉等价） */
function proportionalSegments(d: MonthDay) {
  if (!d.sleep_start_at || !d.sleep_end_at) return [];
  const a1 = clockAngle(d.sleep_start_at);
  let a2 = clockAngle(d.sleep_end_at);
  while (a2 <= a1) a2 += 360;
  const total = Math.min(Math.max(a2 - a1, 1), 359.9);
  const parts: { level: number; seconds: number }[] = [
    { level: STAGE_LIGHT, seconds: d.light_sleep_seconds || 0 },
    { level: STAGE_DEEP, seconds: d.deep_sleep_seconds || 0 },
    { level: STAGE_REM, seconds: d.rem_sleep_seconds || 0 },
    { level: STAGE_AWAKE, seconds: d.awake_sleep_seconds || 0 },
  ];
  const sum = parts.reduce((acc, p) => acc + p.seconds, 0);
  if (sum <= 0) return [{ level: STAGE_LIGHT, a1, a2 }];

  let cursor = a1;
  return parts
    .filter((p) => p.seconds > 0)
    .map((p) => {
      const width = (p.seconds / sum) * total;
      const seg = { level: p.level, a1: cursor, a2: cursor + width };
      cursor += width;
      return seg;
    });
}

// ==================== 面板主体 ====================

export function SleepPanel({ className }: { className?: string }) {
  const [view, setView] = useState<'day' | 'month'>('day');
  const today = dayjs().format('YYYY-MM-DD');
  const [dateStr, setDateStr] = useState(today);
  const [monthStr, setMonthStr] = useState(dayjs().format('YYYY-MM'));
  const [daily, setDaily] = useState<SleepDaily | null>(null);
  const [levels, setLevels] = useState<SleepLevel[]>([]);
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDay = useCallback(async (d: string) => {
    try {
      const res = await authFetch(`/api/v1/garmin/getDailySleep?date_str=${d}`);
      const json = await res.json();
      if (json.status === 'success') {
        setDaily(json.data?.daily ?? null);
        setLevels(json.data?.levels ?? []);
      } else {
        setDaily(null);
        setLevels([]);
      }
    } catch (err) {
      console.error('Failed to fetch sleep data:', err);
      setDaily(null);
      setLevels([]);
    }
  }, []);

  const fetchMonth = useCallback(async (m: string) => {
    try {
      const res = await authFetch(`/api/v1/garmin/getMonthlySleep?month=${m}`);
      const json = await res.json();
      setMonthDays(json.status === 'success' ? json.data?.days ?? [] : []);
    } catch (err) {
      console.error('Failed to fetch monthly sleep data:', err);
      setMonthDays([]);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const yestStr = dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD');
      // 睡眠一天同步一次即可：只拉当天和昨天
      await Promise.all([
        authFetch(`/api/v1/garmin/syncDailySleep?date=${dateStr}`),
        authFetch(`/api/v1/garmin/syncDailySleep?date=${yestStr}`),
      ]);
      await fetchDay(dateStr);
      await fetchMonth(monthStr);
    } catch (err) {
      console.error('Failed to sync sleep data:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDay(dateStr), fetchMonth(monthStr)]).finally(() =>
      setLoading(false)
    );
  }, [dateStr, monthStr, fetchDay, fetchMonth]);

  const bedtimeLabel = daily?.sleep_start_at
    ? dayjs(daily.sleep_start_at).format('HH:mm')
    : '--:--';
  const wakeLabel = daily?.sleep_end_at
    ? dayjs(daily.sleep_end_at).format('HH:mm')
    : '--:--';

  return (
    <div className={cn('space-y-6 w-full', className)}>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              睡眠时长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(daily?.sleep_time_seconds)}
            </div>
            <p className="text-xs text-muted-foreground">
              {bedtimeLabel} → {wakeLabel}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              深睡
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(daily?.deep_sleep_seconds)}
            </div>
            <p className="text-xs text-muted-foreground">恢复性睡眠</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              REM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(daily?.rem_sleep_seconds)}
            </div>
            <p className="text-xs text-muted-foreground">快速动眼期</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              睡眠分数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daily?.sleep_score ?? '--'}</div>
            <p className="text-xs text-muted-foreground">
              清醒 {daily?.awake_count ?? '--'} 次
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="has-[[data-slot=card-action]]:grid-cols-[auto_1fr]">
          <CardAction className="col-start-1 row-span-2 row-start-1 self-center justify-self-start">
            <div className="flex items-center gap-1">
              <div className="mr-1 inline-flex h-9 items-center rounded-md border border-input bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setView('day')}
                  className={cn(
                    'inline-flex h-8 items-center rounded px-2 text-sm transition-colors',
                    view === 'day'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  日视图
                </button>
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className={cn(
                    'inline-flex h-8 items-center rounded px-2 text-sm transition-colors',
                    view === 'month'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  月报
                </button>
              </div>

              {view === 'day' ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setDateStr(dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD'))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    max={today}
                    className="flex h-9 w-[130px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  {dateStr !== today && (
                    <button
                      type="button"
                      onClick={() =>
                        setDateStr(dayjs(dateStr).add(1, 'day').format('YYYY-MM-DD'))
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <IconChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setMonthStr(
                        dayjs(monthStr + '-01').subtract(1, 'month').format('YYYY-MM')
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="month"
                    value={monthStr}
                    onChange={(e) => setMonthStr(e.target.value)}
                    max={dayjs().format('YYYY-MM')}
                    className="flex h-9 w-[130px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  {monthStr !== dayjs().format('YYYY-MM') && (
                    <button
                      type="button"
                      onClick={() =>
                        setMonthStr(
                          dayjs(monthStr + '-01').add(1, 'month').format('YYYY-MM')
                        )
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <IconChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                title="同步当天和昨天的睡眠数据"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconRefresh className={cn('h-4 w-4', syncing && 'animate-spin')} />
              </button>
            </div>
          </CardAction>
          <CardDescription className="self-center text-right">
            {view === 'day'
              ? '日期按佳明口径 = 起床那天（10/3 表示 10/2 夜间那一觉）'
              : `当前月份共 ${monthDays.length} 天有记录，缺失的日期保持空白`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              加载中…
            </div>
          ) : view === 'day' ? (
            <DayChart dateStr={dateStr} daily={daily} levels={levels} />
          ) : (
            <MonthChart monthStr={monthStr} days={monthDays} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
