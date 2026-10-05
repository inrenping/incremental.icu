'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const WINDOW_DAYS = 30;

interface HeartRatePoint {
  calendar_date: string;
  resting_heart_rate: number | null;
  min_heart_rate: number | null;
  max_heart_rate: number | null;
}

const CHART_COLORS = {
  resting_heart_rate: '#2563EB',
  max_heart_rate: '#EF4444',
};

export function HeartRate30dChart({ className }: { className?: string }) {
  const t = useTranslations('DashPage');
  const th = useTranslations('HeartRate30dChart');
  // shadcn 的 chartConfig 要求 label 是静态字符串，这里在渲染期按语言组装
  const chartConfig = {
    resting_heart_rate: { label: th('restingLabel'), color: CHART_COLORS.resting_heart_rate },
    max_heart_rate: { label: th('maxLabel'), color: CHART_COLORS.max_heart_rate },
  };
  const [points, setPoints] = useState<HeartRatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = dayjs().subtract(WINDOW_DAYS - 1, 'day').format('YYYY-MM-DD');
    const end = dayjs().format('YYYY-MM-DD');
    const params = new URLSearchParams({ start, end });

    authFetch(`/api/v1/garmin/getDailyHeartRateRange?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((result) => {
        if (cancelled) return;
        const rows: HeartRatePoint[] = Array.isArray(result?.data) ? result.data : [];
        setPoints(
          rows.map((row) => ({
            calendar_date: row.calendar_date,
            resting_heart_rate: row.resting_heart_rate ?? null,
            min_heart_rate: row.min_heart_rate ?? null,
            max_heart_rate: row.max_heart_rate ?? null,
          })),
        );
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
  }, []);

  const summary = useMemo(() => {
    const valid = points.filter((p) => p.resting_heart_rate != null && p.max_heart_rate != null);
    if (valid.length === 0) return null;
    const avgRest =
      valid.reduce((sum, p) => sum + (p.resting_heart_rate ?? 0), 0) / valid.length;
    const avgMax =
      valid.reduce((sum, p) => sum + (p.max_heart_rate ?? 0), 0) / valid.length;
    return { avgRest, avgMax, days: valid.length };
  }, [points]);

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: dayjs(p.calendar_date).format('M/D'),
      })),
    [points],
  );

  return (
    <Card className={cn('h-full gap-0 py-0 shadow-sm', className)}>
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">{th('title')}</CardTitle>
        <CardDescription>
          {summary
            ? th('summary', {
                resting: summary.avgRest.toFixed(0),
                max: summary.avgMax.toFixed(0),
                days: summary.days,
              })
            : th('noData')}
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
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                domain={[40, 200]}
                tickFormatter={(value: number) => String(Math.round(value))}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="label" indicator="dot" />}
              />
              <Line
                dataKey="resting_heart_rate"
                type="monotone"
                stroke="var(--color-resting_heart_rate)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="max_heart_rate"
                type="monotone"
                stroke="var(--color-max_heart_rate)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
