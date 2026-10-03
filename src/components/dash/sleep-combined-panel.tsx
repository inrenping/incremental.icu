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
  CardAction,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import {
  SleepDaily,
  SleepLevel,
  MonthDay,
  STAGE_DEEP,
  STAGE_LIGHT,
  STAGE_REM,
  STAGE_AWAKE,
  STAGE_META,
  ROW_ORDER,
  WEEKDAY_HEADERS,
  formatDuration,
  polar,
} from './sleep-shared';

// ==================== 月视图：当月睡眠报告（时钟环形） ====================

const MONTH_W = 640;
const MONTH_H = 640;
const MONTH_CX = 320;
const MONTH_CY = 320;
const MONTH_R_INNER = 112;
const MONTH_R_OUTER = 272;

/** 时钟角：0:00 在正上方、6:00 在正下方，顺时针每小时 30°（polar 的 0° 即正上方） */
function clockAngle(iso: string): number {
  const t = dayjs(iso);
  return (30 * ((t.hour() + t.minute() / 60) % 12) + 360) % 360;
}

/** 中心大字用的简短时长：7时36分 */
function formatShort(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m}分`;
  return m > 0 ? `${h}时${String(m).padStart(2, '0')}分` : `${h}时`;
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

  const stats = (() => {
    let sleepSum = 0;
    let count = 0;
    const bedMins: number[] = [];
    const wakeMins: number[] = [];

    for (const d of days) {
      if (d.sleep_time_seconds && d.sleep_time_seconds > 0) {
        sleepSum += d.sleep_time_seconds;
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
      avgBedMin: avg(bedMins),
      avgWakeMin: avg(wakeMins),
    };
  })();

  const bedLabel =
    stats.avgBedMin === null ? null : `日均入睡 ${formatHM(stats.avgBedMin)}`;
  const wakeLabel =
    stats.avgWakeMin === null ? null : `日均醒来 ${formatHM(stats.avgWakeMin)}`;
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

      {/* 外圈日间色带：整圈闭合的圆环 */}
      <circle
        cx={MONTH_CX}
        cy={MONTH_CY}
        r={MONTH_R_OUTER + 15}
        fill="none"
        stroke="var(--secondary)"
        strokeWidth={28}
      />

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
                r={1.8}
                fill="var(--foreground)"
              />
            )}
            {d.sleep_end_at && (
              <circle
                {...polarAttrs(MONTH_CX, MONTH_CY, r, clockAngle(d.sleep_end_at))}
                r={1.8}
                fill="var(--muted-foreground)"
              />
            )}
          </g>
        );
      })}

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
        const [x2, y2] = polar(MONTH_CX, MONTH_CY, MONTH_R_INNER - (major ? 8 : 4), a);
        const [tx, ty] = polar(MONTH_CX, MONTH_CY, MONTH_R_INNER - 20, a);
        return (
          <g key={`clock-${h}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1} />
            <text
              x={tx}
              y={ty}
              fontSize={11}
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
        x1={MONTH_CX - MONTH_R_OUTER - 4}
        y1={MONTH_CY}
        x2={MONTH_CX - MONTH_R_INNER + 2}
        y2={MONTH_CY}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={MONTH_CX - MONTH_R_INNER - 6}
        y={MONTH_CY - 6}
        fontSize={11}
        fill="var(--muted-foreground)"
        textAnchor="end"
      >
        {monthNo}/1
      </text>
      <text
        x={MONTH_CX - MONTH_R_OUTER - 8}
        y={MONTH_CY - 6}
        fontSize={11}
        fill="var(--muted-foreground)"
        textAnchor="end"
      >
        {monthNo}/{daysInMonth}
      </text>

      {/* 中心统计：只显示日均睡眠 */}
      <text
        x={MONTH_CX}
        y={MONTH_CY - 8}
        fontSize={42}
        fontWeight={600}
        fill="var(--foreground)"
        textAnchor="middle"
      >
        {formatShort(stats.avgSleep ? Math.round(stats.avgSleep) : null)}
      </text>
      <text
        x={MONTH_CX}
        y={MONTH_CY + 30}
        fontSize={16}
        fill="var(--muted-foreground)"
        textAnchor="middle"
      >
        日均睡眠
      </text>

      {/* 外圈弧形标签：日均入睡 / 日均醒来（沿闭合色带弯曲排布） */}
      {bedLabel !== null && stats.avgBedMin !== null && (
        <CurvedAngleLabel
          deg={minutesToClockAngle(stats.avgBedMin)}
          text={bedLabel}
          idPrefix={`${monthStr}-bed`}
        />
      )}
      {wakeLabel !== null && stats.avgWakeMin !== null && (
        <CurvedAngleLabel
          deg={minutesToClockAngle(stats.avgWakeMin)}
          text={wakeLabel}
          idPrefix={`${monthStr}-wake`}
        />
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
  const r = bottom ? MONTH_R_OUTER + 21 : MONTH_R_OUTER + 9;
  const a1 = bottom ? deg + 64 : deg - 64;
  const a2 = bottom ? deg + 6 : deg - 6;
  const id = `${idPrefix}-${Math.round(n)}`;
  return (
    <g>
      <defs>
        <path id={id} d={arcTextPath(MONTH_CX, MONTH_CY, r, a1, a2, !bottom)} />
      </defs>
      <text fontSize={14} fill="var(--secondary-foreground)">
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
    { level: 1, seconds: d.light_sleep_seconds || 0 },
    { level: 0, seconds: d.deep_sleep_seconds || 0 },
    { level: 2, seconds: d.rem_sleep_seconds || 0 },
    { level: 3, seconds: d.awake_sleep_seconds || 0 },
  ];
  const sum = parts.reduce((acc, p) => acc + p.seconds, 0);
  if (sum <= 0) return [{ level: 1, a1, a2 }];

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

// ==================== 日视图（弹窗内）：阶段时间轴 ====================

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
  // 时间窗默认：前一天 18:00 → 当天 12:00（18 小时），数据超出时自动扩展
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
    DAY_PAD.left + ((t.valueOf() - windowStart.valueOf()) / spanMs) * DAY_PLOT_W;

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
        {dateStr} 暂无睡眠数据
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

// ==================== 日历视图：月历 + 点击弹窗看当日详情 ====================

function SleepCalendar({
  monthStr,
  days,
  today,
  onPick,
}: {
  monthStr: string;
  days: MonthDay[];
  today: string;
  onPick: (dateStr: string) => void;
}) {
  const first = dayjs(monthStr + '-01');
  const daysInMonth = first.daysInMonth();
  // 周一 = 第 0 列
  const lead = (first.day() + 6) % 7;

  const byDate = useMemo(
    () => new Map(days.map((d) => [d.calendar_date, d])),
    [days]
  );

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      first.add(i, 'day').format('YYYY-MM-DD')
    ),
  ];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="py-2 text-center text-xs text-muted-foreground">
            周{d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dateStr, idx) => {
          if (!dateStr)
            return (
              <div
                key={`blank-${idx}`}
                className="min-h-28 border-b border-r p-1 first:border-l-0 [&:nth-child(7n)]:border-r-0"
              />
            );
          const d = byDate.get(dateStr);
          const dayNo = Number(dateStr.slice(8, 10));
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const hasData = !!d && (d.sleep_time_seconds ?? 0) > 0;

          // 阶段占比条（深/浅/REM/清醒）
          const secs = d
            ? [
                { level: STAGE_DEEP, v: d.deep_sleep_seconds || 0 },
                { level: STAGE_LIGHT, v: d.light_sleep_seconds || 0 },
                { level: STAGE_REM, v: d.rem_sleep_seconds || 0 },
                { level: STAGE_AWAKE, v: d.awake_sleep_seconds || 0 },
              ]
            : [];
          const secsSum = secs.reduce((acc, s) => acc + s.v, 0);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isFuture}
              onClick={() => onPick(dateStr)}
              className={cn(
                'flex min-h-28 flex-col items-stretch gap-1 border-b border-r p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0',
                'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isFuture && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                !d && 'text-muted-foreground'
              )}
            >
              <span className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full',
                    isToday && 'bg-orange-500 font-medium text-white'
                  )}
                >
                  {dayNo}
                </span>
                {hasData && (
                  <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">
                    {formatDuration(d?.sleep_time_seconds)}
                  </span>
                )}
              </span>
              {hasData && d?.sleep_score != null && (
                <span className="flex flex-1 items-center justify-center text-4xl font-bold leading-none tabular-nums text-foreground">
                  {d.sleep_score}
                </span>
              )}
              {hasData && secsSum > 0 && (
                <span className="mt-auto flex h-1.5 w-full overflow-hidden rounded-full">
                  {secs
                    .filter((s) => s.v > 0)
                    .map((s) => (
                      <span
                        key={s.level}
                        style={{
                          width: `${(s.v / secsSum) * 100}%`,
                          background: STAGE_META[s.level].color,
                        }}
                      />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 睡眠面板（日历在上 + 月报在下，共用同一个月份控件） ====================

export function SleepCombinedPanel({ className }: { className?: string }) {
  const today = dayjs().format('YYYY-MM-DD');
  const [monthStr, setMonthStr] = useState(dayjs().format('YYYY-MM'));
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 日详情弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogDaily, setDialogDaily] = useState<SleepDaily | null>(null);
  const [dialogLevels, setDialogLevels] = useState<SleepLevel[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

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

  const openDay = useCallback(async (d: string) => {
    setDialogDate(d);
    setDialogDaily(null);
    setDialogLevels([]);
    setDialogOpen(true);
    setDialogLoading(true);
    try {
      const res = await authFetch(`/api/v1/garmin/getDailySleep?date_str=${d}`);
      const json = await res.json();
      if (json.status === 'success') {
        setDialogDaily(json.data?.daily ?? null);
        setDialogLevels(json.data?.levels ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch sleep data:', err);
    } finally {
      setDialogLoading(false);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // 一次同步当前选中月份的整月数据
      await authFetch(`/api/v1/garmin/syncMonthlySleep?month=${monthStr}`);
      await fetchMonth(monthStr);
    } catch (err) {
      console.error('Failed to sync sleep data:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMonth(monthStr).finally(() => setLoading(false));
  }, [monthStr, fetchMonth]);

  return (
    <div className={cn('space-y-6 w-full', className)}>
      <Card>
        <CardHeader className="has-[[data-slot=card-action]]:grid-cols-[auto_1fr]">
          <CardAction className="col-start-1 row-span-2 row-start-1 self-center justify-self-start">
            <div className="flex items-center gap-1">
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

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                title="同步整月睡眠数据"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconRefresh className={cn('h-4 w-4', syncing && 'animate-spin')} />
              </button>
            </div>
          </CardAction>
          <CardTitle className="sr-only">睡眠</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* 日历（上） */}
              <SleepCalendar
                monthStr={monthStr}
                days={monthDays}
                today={today}
                onPick={openDay}
              />

              {/* 月报环形（下） */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {[...ROW_ORDER].reverse().map((stage) => (
                    <span key={stage} className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-[3px] w-4 rounded-full"
                        style={{ background: STAGE_META[stage].color }}
                      />
                      {STAGE_META[stage].label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                    入睡时间
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    睡醒时间
                  </span>
                </div>
                <div className="mx-auto w-full max-w-4xl">
                  <MonthChart monthStr={monthStr} days={monthDays} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 当日睡眠详情弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {dialogDate
                ? `${dayjs(dialogDate).format('YYYY年M月D日')} 睡眠详情`
                : '睡眠详情'}
            </DialogTitle>
          </DialogHeader>
          {dialogLoading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <DayChart
              dateStr={dialogDate ?? today}
              daily={dialogDaily}
              levels={dialogLevels}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
