'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';

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

const CHART_WIDTH = 940;
const CHART_HEIGHT = 450;
const LEFT_PANEL_WIDTH = 140;

// Inline chart styles to inject into the SVG
const CHART_CSS = `
svg {
  --color-heartRate: hsl(0 72% 51%);
  --color-yesterdayHeartRate: hsl(0 0% 60%);
}
`;

export default function HeartSvgPage() {
  const searchParams = useSearchParams();
  const dateStr = searchParams.get('date_str') || dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD');

  const [data, setData] = useState<HeartRateData | null>(null);
  const [yesterdayData, setYesterdayData] = useState<HeartRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
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
        setError('获取数据失败');
        setData(null);
        setYesterdayData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateStr, yesterdayStr]);

  // Build yesterday heart rate map by time (HH:mm)
  let chartData: ChartDataPoint[] = [];
  if (data?.details) {
    const yesterdayMap = new Map<string, number>();
    if (yesterdayData) {
      for (const d of yesterdayData.details) {
        yesterdayMap.set(dayjs(d.sample_time).format('HH:mm'), d.heart_rate);
      }
    }
    chartData = data.details.map(d => {
      const time = dayjs(d.sample_time).format('HH:mm');
      return {
        time,
        heartRate: d.heart_rate,
        yesterdayHeartRate: yesterdayMap.get(time) ?? null,
      };
    });
  }

  // After recharts renders the SVG, capture it
  useEffect(() => {
    if (loading || chartData.length === 0) return;

    const timer = setTimeout(() => {
      const container = renderRef.current;
      if (!container) return;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(CHART_WIDTH));
      clone.setAttribute('height', String(CHART_HEIGHT));
      clone.setAttribute('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

      const svgNs = 'http://www.w3.org/2000/svg';

      // Add white background as the very first child (bottom layer)
      const bgRect = document.createElementNS(svgNs, 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', '#ffffff');
      clone.insertBefore(bgRect, clone.firstChild);

      // Embed chart styles (behind the chart but above background)
      const styleEl = document.createElementNS(svgNs, 'style');
      styleEl.textContent = CHART_CSS;
      clone.appendChild(styleEl);

      // Build right stats panel
      const daily = data!.daily;
      const stats = [
        { label: '最高心率', value: String(daily.max_heart_rate) },
        { label: '最低心率', value: String(daily.min_heart_rate) },
        { label: '静息心率', value: String(daily.resting_heart_rate) },
        { label: '近7日平均\n静息', value: String(daily.last_seven_days_avg_resting_heart_rate) },
      ];

      const panelX = CHART_WIDTH - LEFT_PANEL_WIDTH / 2;
      const spacing = (CHART_HEIGHT - 60) / stats.length;

      const statsGroup = document.createElementNS(svgNs, 'g');

      stats.forEach((s, i) => {
        const cy = 30 + spacing * i + spacing / 2;
        const lines = s.label.split('\n');

        // Value (large, centered)
        const valEl = document.createElementNS(svgNs, 'text');
        valEl.setAttribute('x', String(panelX));
        valEl.setAttribute('y', String(cy - 8));
        valEl.setAttribute('text-anchor', 'middle');
        valEl.setAttribute('fill', '#222');
        valEl.setAttribute('font-size', '18');
        valEl.setAttribute('font-weight', 'bold');
        valEl.setAttribute('font-family', 'sans-serif');
        valEl.textContent = s.value;
        statsGroup.appendChild(valEl);

        // Label (small, below value)
        lines.forEach((line, li) => {
          const lEl = document.createElementNS(svgNs, 'text');
          lEl.setAttribute('x', String(panelX));
          lEl.setAttribute('y', String(cy + 10 + li * 14));
          lEl.setAttribute('text-anchor', 'middle');
          lEl.setAttribute('fill', '#888');
          lEl.setAttribute('font-size', '11');
          lEl.setAttribute('font-family', 'sans-serif');
          lEl.textContent = line;
          statsGroup.appendChild(lEl);
        });
      });

      // Left border of right panel
      const borderX = CHART_WIDTH - LEFT_PANEL_WIDTH;
      const borderLine = document.createElementNS(svgNs, 'line');
      borderLine.setAttribute('x1', String(borderX));
      borderLine.setAttribute('y1', '0');
      borderLine.setAttribute('x2', String(borderX));
      borderLine.setAttribute('y2', String(CHART_HEIGHT));
      borderLine.setAttribute('stroke', '#e0e0e0');
      borderLine.setAttribute('stroke-width', '1');
      statsGroup.appendChild(borderLine);

      clone.appendChild(statsGroup);

      const serializer = new XMLSerializer();
      setSvgContent(serializer.serializeToString(clone));
    }, 200);

    return () => clearTimeout(timer);
  }, [loading, chartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        {error || '无数据'}
      </div>
    );
  }

  return (
    <div
      style={{
        '--color-heartRate': 'hsl(0 72% 51%)',
        '--color-yesterdayHeartRate': 'hsl(0 0% 60%)',
      } as React.CSSProperties}
    >
      {/* Hidden container for recharts to render the chart */}
      <div
        ref={renderRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, width: CHART_WIDTH, height: CHART_HEIGHT }}
      >
        <ResponsiveContainer width={CHART_WIDTH - LEFT_PANEL_WIDTH} height={CHART_HEIGHT}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 30 }}>
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
              interval={120}
              tick={{ fill: '#666', fontSize: 11 }}
              tickFormatter={(value: string) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={['dataMin - 10', 'dataMax + 10']}
              tick={{ fill: '#666', fontSize: 12 }}
              tickCount={6}
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
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rendered standalone SVG */}
      {svgContent ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen text-muted-foreground">
          正在生成 SVG...
        </div>
      )}
    </div>
  );
}
