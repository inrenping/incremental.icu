'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

/**
 * 跑步类运动的原始类型 key。
 * 后端 /api/v1/main/getActivitiesByPage 会把这些 key 展开成对应的 name
 * （100/101/102/103 → running / treadmill_running / trail_running / track_running）。
 */
const RUNNING_SPORT_TYPES = '100,101,102,103';

const WINDOW_DAYS = 30;

interface ActivityRow {
  id: number;
  start_time_local: string | null;
  distance_meters: number | string | null;
}

interface DailyPoint {
  date: string;
  label: string;
  distance: number;
  count: number;
}



/** 把活动列表按自然日聚合，并把窗口内没有运动的日子补成 0 */
function buildDailyPoints(rows: ActivityRow[]): DailyPoint[] {
  const bucket = new Map<string, { distance: number; count: number }>();

  for (const row of rows) {
    if (!row.start_time_local) continue;
    const key = dayjs(row.start_time_local).format('YYYY-MM-DD');
    const current = bucket.get(key) ?? { distance: 0, count: 0 };
    current.distance += Number(row.distance_meters ?? 0) / 1000;
    current.count += 1;
    bucket.set(key, current);
  }

  const today = dayjs().startOf('day');
  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const day = today.subtract(WINDOW_DAYS - 1 - index, 'day');
    const key = day.format('YYYY-MM-DD');
    const hit = bucket.get(key);
    return {
      date: key,
      label: day.format('M/D'),
      distance: hit ? Number(hit.distance.toFixed(2)) : 0,
      count: hit?.count ?? 0,
    };
  });
}

export function Running30dChart({
  connectId,
  className,
}: {
  connectId?: number;
  className?: string;
}) {
  const t = useTranslations('DashPage');
  const tr = useTranslations('Running30dChart');
  // shadcn 的 chartConfig 要求 label 是静态字符串，这里在渲染期按语言组装
  const chartConfig = {
    distance: { label: tr('distanceLabel'), color: '#10A56C' },
  };
  const [points, setPoints] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!connectId) return;

    const start = dayjs().subtract(WINDOW_DAYS - 1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
    // 后端是 `start_time_local <= end_date` 直接比较，只传日期（当天 00:00）会漏掉当天的全部活动
    const end = dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss');

    const params = new URLSearchParams({
      connect_id: String(connectId),
      page_size: '200',
      start_date: start,
      end_date: end,
      sport_types: RUNNING_SPORT_TYPES,
    });

    // 数据源：t_main_activity（主数据源汇总表），不是 t_base_activity
    authFetch(`/api/v1/main/getActivitiesByPage?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((result) => {
        if (cancelled) return;
        const rows: ActivityRow[] = Array.isArray(result?.data) ? result.data : [];
        setPoints(buildDailyPoints(rows));
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connectId]);

  const summary = useMemo(() => {
    const total = points.reduce((sum, point) => sum + point.distance, 0);
    const count = points.reduce((sum, point) => sum + point.count, 0);
    return { total, count, avg: total / WINDOW_DAYS };
  }, [points]);

  return (
    <Card className={cn('h-full gap-0 py-0 shadow-sm', className)}>
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">{t('runningLast30Days')}</CardTitle>
        <CardDescription>
          {t('running30dSummary', {
            total: summary.total.toFixed(2),
            count: summary.count,
            avg: summary.avg.toFixed(1),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 py-4 sm:px-4">
        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {t('loading')}
          </div>
        ) : failed ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {t('chartLoadFailed')}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={4}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
                tickFormatter={(value: number) => String(Number(value.toFixed(1)))}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="date" indicator="dot" />}
              />
              <Bar
                dataKey="distance"
                fill="var(--color-distance)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
