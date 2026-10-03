'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
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
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import { MonthDay, STAGE_META, ROW_ORDER, polar } from './sleep-shared';

// ==================== 月视图：当月睡眠报告（时钟环形） ====================

const MONTH_W = 720;
const MONTH_H = 600;
const MONTH_CX = 372;
const MONTH_CY = 300;
const MONTH_R_INNER = 86;
const MONTH_R_OUTER = 226;

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

      {/* 图例（左上，竖排） */}
      {[...ROW_ORDER].reverse().map((stage, idx) => (
        <g key={`legend-${stage}`}>
          <line
            x1={20}
            y1={30 + idx * 22}
            x2={42}
            y2={30 + idx * 22}
            stroke={STAGE_META[stage].color}
            strokeWidth={3}
          />
          <text x={50} y={30 + idx * 22 + 4} fontSize={11} fill="var(--muted-foreground)">
            {STAGE_META[stage].label}
          </text>
        </g>
      ))}
      <circle cx={31} cy={30 + 4 * 22} r={3} fill="var(--foreground)" />
      <text x={50} y={30 + 4 * 22 + 4} fontSize={11} fill="var(--muted-foreground)">
        入睡时间
      </text>
      <circle cx={31} cy={30 + 5 * 22} r={3} fill="var(--muted-foreground)" />
      <text x={50} y={30 + 5 * 22 + 4} fontSize={11} fill="var(--muted-foreground)">
        睡醒时间
      </text>

      {/* 标题（右上） */}
      <text
        x={MONTH_W - 20}
        y={38}
        textAnchor="end"
        fontSize={17}
        fontWeight={600}
        fill="var(--foreground)"
      >
        {dayjs(monthStr + '-01').format('YYYY[年]M[月]')} 睡眠报告
      </text>

      {/* 月份水印 */}
      <text
        x={MONTH_CX}
        y={MONTH_CY + 14}
        textAnchor="middle"
        fontSize={40}
        fontWeight={600}
        letterSpacing={3}
        fill="var(--muted-foreground)"
        opacity={0.12}
      >
        {dayjs(monthStr + '-01').format('MMMM').toUpperCase()}
      </text>

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
              fontSize={10}
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
        y={MONTH_CY - 6}
        fontSize={26}
        fontWeight={600}
        fill="var(--foreground)"
        textAnchor="middle"
      >
        {formatShort(stats.avgSleep ? Math.round(stats.avgSleep) : null)}
      </text>
      <text
        x={MONTH_CX}
        y={MONTH_CY + 18}
        fontSize={12}
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
      <text fontSize={12} fill="var(--secondary-foreground)">
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

// ==================== 面板主体（仅月报） ====================

export function SleepPanel({ className }: { className?: string }) {
  const [monthStr, setMonthStr] = useState(dayjs().format('YYYY-MM'));
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
      const todayStr = dayjs().format('YYYY-MM-DD');
      const yestStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      // 睡眠一天同步一次即可：只拉当天和昨天
      await Promise.all([
        authFetch(`/api/v1/garmin/syncDailySleep?date=${todayStr}`),
        authFetch(`/api/v1/garmin/syncDailySleep?date=${yestStr}`),
      ]);
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
              <Link
                href="/sleep"
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                日历
              </Link>

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
                title="同步当天和昨天的睡眠数据"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconRefresh className={cn('h-4 w-4', syncing && 'animate-spin')} />
              </button>
            </div>
          </CardAction>
          <CardTitle className="sr-only">睡眠月报</CardTitle>
          <CardDescription className="self-center text-right">
            当前月份共 {monthDays.length} 天有记录，缺失的日期保持空白 ·{' '}
            <Link href="/sleep" className="underline underline-offset-2 hover:text-foreground">
              查看日历视图
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[640px]">
              <MonthChart monthStr={monthStr} days={monthDays} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
