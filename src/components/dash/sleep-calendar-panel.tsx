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
} from './sleep-shared';

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
                className="min-h-24 border-b border-r p-1 first:border-l-0 [&:nth-child(7n)]:border-r-0"
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
                'flex min-h-24 flex-col items-stretch gap-1 border-b border-r p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0',
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

// ==================== 面板主体 ====================

export function SleepCalendarPanel({ className }: { className?: string }) {
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
          <CardTitle className="sr-only">睡眠日历</CardTitle>
          <CardDescription className="self-center text-right">
            点击日期查看当日睡眠详情；日期按佳明口径 = 起床那天（10/3 表示 10/2 夜间那一觉）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              加载中…
            </div>
          ) : (
            <SleepCalendar
              monthStr={monthStr}
              days={monthDays}
              today={today}
              onPick={openDay}
            />
          )}
        </CardContent>
      </Card>

      {/* 当日睡眠详情弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogDate
                ? `${dayjs(dialogDate).format('YYYY年M月D日')} 睡眠详情`
                : '睡眠详情'}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                佳明口径 = 起床那天
              </span>
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
