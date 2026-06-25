'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { authFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface DailyHeartRate {
  id: number;
  user_id: number;
  calendar_date: string;
  max_heart_rate: number;
  min_heart_rate: number;
  resting_heart_rate: number;
  last_seven_days_avg_resting_heart_rate: number;
}

interface HeartRateDetail {
  sample_time: string;
  heart_rate: number;
}

interface HeartRateData {
  daily: DailyHeartRate;
  details: HeartRateDetail[];
}

interface ChartDataPoint {
  time: string;
  heartRate: number;
  yesterdayHeartRate: number | null;
}

const chartConfig = {
  heartRate: {
    label: '今日心率',
    color: 'hsl(0 72% 51%)',
  },
  yesterdayHeartRate: {
    label: '昨日心率',
    color: 'hsl(0 0% 60%)',
  },
};

export default function HeartPage() {
  const [data, setData] = useState<HeartRateData | null>(null);
  const [yesterdayData, setYesterdayData] = useState<HeartRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = dayjs().format('YYYY-MM-DD');
  const [dateStr, setDateStr] = useState(today);

  const yesterdayStr = dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [mainRes, yestRes] = await Promise.all([
          authFetch(`/api/v1/garmin/getDailyHeartRate?date_str=${dateStr}`),
          authFetch(`/api/v1/garmin/getDailyHeartRate?date_str=${yesterdayStr}`),
        ]);
        const mainJson = await mainRes.json();
        const yestJson = await yestRes.json();
        setData(mainJson.status === 'success' ? mainJson.data : null);
        setYesterdayData(yestJson.status === 'success' ? yestJson.data : null);
      } catch (err) {
        console.error('Failed to fetch heart rate data:', err);
        setData(null);
        setYesterdayData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateStr, yesterdayStr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.daily) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">无数据</div>
      </div>
    );
  }

  // Build yesterday heart rate map by time (HH:mm)
  const yesterdayMap = new Map<string, number>();
  if (yesterdayData) {
    for (const d of yesterdayData.details) {
      yesterdayMap.set(dayjs(d.sample_time).format('HH:mm'), d.heart_rate);
    }
  }

  const chartData: ChartDataPoint[] = data.details.map(d => {
    const time = dayjs(d.sample_time).format('HH:mm');
    return {
      time,
      heartRate: d.heart_rate,
      yesterdayHeartRate: yesterdayMap.get(time) ?? null,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">无数据</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 心率摘要卡片 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              最高心率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daily.max_heart_rate}</div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              最低心率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daily.min_heart_rate}</div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              静息心率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daily.resting_heart_rate}</div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              近7日平均静息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daily.last_seven_days_avg_resting_heart_rate}</div>
            <p className="text-xs text-muted-foreground">bpm</p>
          </CardContent>
        </Card>
      </div>

      {/* 心率趋势面积图 */}
      <Card>
        <CardHeader className="has-[[data-slot=card-action]]:grid-cols-[auto_1fr]">
          <CardAction className="col-start-1 row-span-2 row-start-1 self-center justify-self-start">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              max={dayjs().format('YYYY-MM-DD')}
              className="flex h-9 w-[130px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </CardAction>
          <CardDescription className="self-center text-right">
            共 {chartData.length} 个采样点
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="fillHeartRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-heartRate)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-heartRate)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillYesterdayHeartRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-yesterdayHeartRate)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-yesterdayHeartRate)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={30}
                tickFormatter={(value: string) => value}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => String(label)}
                  />
                }
              />
              <Area
                dataKey="yesterdayHeartRate"
                type="monotone"
                fill="url(#fillYesterdayHeartRate)"
                stroke="var(--color-yesterdayHeartRate)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
              <Area
                dataKey="heartRate"
                type="monotone"
                fill="url(#fillHeartRate)"
                stroke="var(--color-heartRate)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
