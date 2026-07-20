'use client';

import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/api';
import { useLayout } from '@/hooks/use-layout';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/lib/activities';
import { Button } from '@/components/ui/button';
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface MainActivity {
  id: number;
  activity_id: string;
  activity_name: string;
  start_time_local: string;
  sport_type_raw: string;
  moving_duration_seconds: number;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain: number;
  average_hr: number | null;
  source_type: string;
  device_name?: string;
  location?: string;
  username?: string;
  max_hr?: number | null;
  average_speed?: number | null;
  max_speed?: number | null;
  calories?: number | null;
}

const WEEKDAY_HEADERS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getSportColor(sportType: string): string {
  const s = sportType.toLowerCase();
  if (s.includes('run') || s.includes('跑')) return 'bg-green-500';
  if (s.includes('cycl') || s.includes('bike') || s.includes('骑') || s.includes('ride')) return 'bg-orange-500';
  if (s.includes('swim') || s.includes('游')) return 'bg-blue-500';
  if (s.includes('walk') || s.includes('walk')) return 'bg-yellow-500';
  return 'bg-gray-400';
}

/** Get Monday of the week containing the given date */
function getWeekStart(date: dayjs.Dayjs): dayjs.Dayjs {
  const day = date.day(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // Mon=0
  return date.startOf('day').subtract(diff, 'day');
}

/** Circle size scales with calories: <100kcal=18px, 1500kcal+=68px */
function getCircleSize(calories: number | null | undefined): number {
  const cal = calories || 0;
  const size = 18 + Math.min(Math.max(cal - 100, 0) / 1400, 1) * 50;
  return Math.round(size);
}

/** Convert speed (m/s) to pace string (min/km) */
function speedToPace(speed: number | null | undefined): string {
  if (!speed || speed <= 0) return '--';
  const paceSeconds = 1000 / speed;
  const m = Math.floor(paceSeconds / 60);
  const s = Math.floor(paceSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Format seconds to HH:MM:SS or MM:SS */
function fmtDuration(seconds: number): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
  return parts.join(':');
}

interface WeekRow {
  weekStart: dayjs.Dayjs;
  weekEnd: dayjs.Dayjs;
  activities: (MainActivity & { dateStr: string })[];
  totalDistance: number;
  runningDistance: number;
}

function groupByWeek(activities: MainActivity[]): WeekRow[] {
  const weekMap = new Map<string, WeekRow>();

  for (const a of activities) {
    const d = dayjs(a.start_time_local);
    const monday = getWeekStart(d);
    const key = monday.format('YYYY-MM-DD');

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        weekStart: monday,
        weekEnd: monday.add(6, 'day'),
        activities: [],
        totalDistance: 0,
        runningDistance: 0,
      });
    }

    const row = weekMap.get(key)!;
    row.activities.push({ ...a, dateStr: d.format('YYYY-MM-DD') });
    row.totalDistance += a.distance_meters;
    const sport = a.sport_type_raw.toLowerCase();
    if (sport.includes('run') || sport.includes('跑')) {
      row.runningDistance += a.distance_meters;
    }
  }

  // Sort weeks descending (newest first)
  return Array.from(weekMap.values()).sort((a, b) =>
    b.weekStart.valueOf() - a.weekStart.valueOf()
  );
}

export default function MainFeedPage() {
  const { layout } = useLayout();
  const [activities, setActivities] = useState<MainActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePopover, setActivePopover] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const today = dayjs();
  const [currentYear, setCurrentYear] = useState(today.year());
  const [currentMonth, setCurrentMonth] = useState(today.month() + 1);

  useEffect(() => {
    let cancelled = false;
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await authFetch(`/api/v1/main/getActivitiesByMonth?year=${currentYear}&month=${currentMonth}`);
        if (response.ok) {
          const result = await response.json();
          if (!cancelled) {
            setActivities(result.data || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchActivities();
    return () => { cancelled = true; };
  }, [currentYear, currentMonth]);

  const weekRows = useMemo(() => groupByWeek(activities), [activities]);

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.year());
    setCurrentMonth(today.month() + 1);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await authFetch('/api/v1/main/syncBaseToMainActivity');
      // Re-fetch activities after sync
      const response = await authFetch(`/api/v1/main/getActivitiesByMonth?year=${currentYear}&month=${currentMonth}`);
      if (response.ok) {
        const result = await response.json();
        setActivities(result.data || []);
      }
    } catch (err) {
      console.error('Failed to sync activities:', err);
    } finally {
      setSyncing(false);
    }
  };

  const todayStr = today.format('YYYY-MM-DD');

  return (
    <div
      className={cn(
        'mx-auto flex flex-1 flex-col bg-background px-6 py-6 text-sm transition-all duration-300',
        layout === 'fixed' ? 'w-full max-w-7xl' : 'max-w-none w-full'
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{currentYear}</h1>
          <Button variant="ghost" size="sm" onClick={goToToday} className="h-7 px-3 text-xs">
            今天
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSync}
            disabled={syncing}
          >
            <IconRefresh className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <IconChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex border-b pb-4">
              <div className="w-32 shrink-0 space-y-1">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex flex-1 gap-4">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="flex-1">
                    <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : weekRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">暂无运动数据</p>
        </div>
      ) : (
        <div>
          {/* Weekday header row */}
          <div className="flex border-b">
            <div className="w-32 shrink-0" />
            <div className="grid flex-1 grid-cols-7">
              {WEEKDAY_HEADERS.map((d) => (
                <div key={d} className="py-2 text-center text-xs text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Week rows */}
          {weekRows.map((week) => {
            // Build 7 day columns
            const dayColumns: MainActivity[][] = Array.from({ length: 7 }, () => []);

            // Group activities by day of week (0=Mon)
            for (const act of week.activities) {
              const d = dayjs(act.start_time_local);
              const dayOfWeek = d.day() === 0 ? 6 : d.day() - 1; // Mon=0
              dayColumns[dayOfWeek].push(act);
            }

            return (
              <div key={week.weekStart.format('YYYY-MM-DD')} className="flex border-b">
                {/* Left sidebar: week info */}
                <div className="w-32 shrink-0 py-3 pr-4">
                  <p className="text-xs text-muted-foreground">
                    {week.weekStart.format('M/D')} – {week.weekEnd.format('M/D')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">总距离</p>
                  <p className="text-sm font-semibold">{formatDistance(week.totalDistance)}</p>
                  {week.runningDistance > 0 && (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">跑步距离</p>
                      <p className="text-sm font-semibold">{formatDistance(week.runningDistance)}</p>
                    </>
                  )}
                </div>

                {/* 7 day columns */}
                <div className="grid flex-1 grid-cols-7">
                  {dayColumns.map((dayActivities, colIdx) => {
                    const cellDate = week.weekStart.add(colIdx, 'day');
                    const cellDateStr = cellDate.format('YYYY-MM-DD');
                    const isToday = cellDateStr === todayStr;

                    return (
                      <div
                        key={colIdx}
                        className="flex min-h-32 flex-col items-center border-l px-1 pt-2 first:border-l-0"
                      >
                        {isToday && (
                          <span className="mb-1 text-[10px] font-medium text-orange-500">今天</span>
                        )}

                        <div className="flex flex-col items-center gap-2">
                          {dayActivities.map((act) => {
                            const size = getCircleSize(act.calories);
                            const color = getSportColor(act.sport_type_raw);
                            const showDistance = act.distance_meters >= 5000;
                            const isPopoverOpen = activePopover === act.id;

                            return (
                              <div key={act.id} className="relative flex flex-col items-center">
                                <div
                                  className={cn(
                                    'flex items-center justify-center rounded-full text-white font-semibold shadow-sm cursor-pointer transition-transform hover:scale-110',
                                    color
                                  )}
                                  style={{ width: size, height: size, fontSize: size > 36 ? 10 : 8 }}
                                  onMouseEnter={() => setActivePopover(act.id)}
                                  onMouseLeave={() => setActivePopover(null)}
                                  onClick={() => setActivePopover(isPopoverOpen ? null : act.id)}
                                >
                                  {showDistance ? (
                                    <span className="leading-tight text-center">
                                      {act.distance_meters >= 1000
                                        ? `${(act.distance_meters / 1000).toFixed(1)}`
                                        : `${Math.round(act.distance_meters)}m`}
                                    </span>
                                  ) : (
                                    <span className="text-[10px]">·</span>
                                  )}
                                </div>
                                <span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground text-center">
                                  {act.activity_name}
                                </span>

                                {/* Popover */}
                                {isPopoverOpen && (
                                  <div
                                    className="absolute left-1/2 z-50 -translate-x-1/2"
                                    style={{ top: size + 40 }}
                                    onMouseEnter={() => setActivePopover(act.id)}
                                    onMouseLeave={() => setActivePopover(null)}
                                  >
                                    <div className="w-56 rounded-lg border bg-card p-3 shadow-lg">
                                      <p className="text-xs text-muted-foreground">
                                        {dayjs(act.start_time_local).format('YYYY/MM/DD HH:mm')}
                                      </p>
                                      <p className="mt-0.5 text-sm font-semibold text-emerald-600">
                                        {act.location ? `${act.location} ` : ''}{act.activity_name}
                                      </p>
                                      <div className="mt-2 space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">总里程</span>
                                          <span className="font-medium tabular-nums">{formatDistance(act.distance_meters)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">累计时间</span>
                                          <span className="font-medium tabular-nums">{fmtDuration(act.duration_seconds)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">运动时间</span>
                                          <span className="font-medium tabular-nums">{fmtDuration(act.moving_duration_seconds)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">平均配速</span>
                                          <span className="font-medium tabular-nums">{speedToPace(act.average_speed)} /km</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">最大配速</span>
                                          <span className="font-medium tabular-nums">{speedToPace(act.max_speed)} /km</span>
                                        </div>
                                        {act.average_hr && act.average_hr > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">平均心率</span>
                                            <span className="font-medium tabular-nums">{act.average_hr} bpm</span>
                                          </div>
                                        )}
                                        {act.max_hr && act.max_hr > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">最大心率</span>
                                            <span className="font-medium tabular-nums">{act.max_hr} bpm</span>
                                          </div>
                                        )}
                                        {act.elevation_gain > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">累计爬升</span>
                                            <span className="font-medium tabular-nums">{act.elevation_gain} m</span>
                                          </div>
                                        )}
                                        {act.calories && act.calories > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">累计消耗</span>
                                            <span className="font-medium tabular-nums">{act.calories} kcal</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 h-3 w-3 rotate-45 border-l border-t bg-card" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
