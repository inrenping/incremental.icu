import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

export const runtime = 'nodejs';

const CHART_W = 800;
const CHART_H = 450;
const PANEL_W = 140;
const TOTAL_W = CHART_W + PANEL_W;
const PAD = { top: 20, right: 20, left: 50, bottom: 30 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

interface DailyHR {
  max_heart_rate: number;
  min_heart_rate: number;
  resting_heart_rate: number;
  last_seven_days_avg_resting_heart_rate: number;
}
interface HRDetail { sample_time: string; heart_rate: number }
interface HRData { daily: DailyHR; details: HRDetail[] }

function S(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function buildErrorSvg(msg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" font-family="sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="200" y="100" text-anchor="middle" fill="#888" font-size="16">${S(msg)}</text></svg>`;
}

function buildPanel(d: DailyHR) {
  const items = [
    { l: '最高心率', v: String(d.max_heart_rate) },
    { l: '最低心率', v: String(d.min_heart_rate) },
    { l: '静息心率', v: String(d.resting_heart_rate) },
    { l: '近7日平均\n静息', v: String(d.last_seven_days_avg_resting_heart_rate) },
  ];
  const spacing = (CHART_H - 60) / items.length;
  const cx = CHART_W + PANEL_W / 2;
  let out = '';
  items.forEach((it, i) => {
    const cy = 30 + spacing * i + spacing / 2;
    const lines = it.l.split('\n');
    out += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#222" font-size="18" font-weight="bold">${S(it.v)}</text>`;
    lines.forEach((ln, li) => {
      out += `<text x="${cx}" y="${cy + 10 + li * 14}" text-anchor="middle" fill="#888" font-size="11">${S(ln)}</text>`;
    });
  });
  out += `<line x1="${CHART_W}" y1="0" x2="${CHART_W}" y2="${CHART_H}" stroke="#e0e0e0" stroke-width="1"/>`;
  return out;
}

function toY(val: number, yMin: number, scaleY: number) {
  // SVG y=0 is top; start from plot bottom and go up
  return PAD.top + PLOT_H - (val - yMin) * scaleY;
}

function buildGridLines(yTicks: number[], yMin: number, scaleY: number) {
  return yTicks.map(y => {
    const yy = toY(y, yMin, scaleY);
    return `<line x1="${PAD.left}" y1="${yy}" x2="${PAD.left + PLOT_W}" y2="${yy}" stroke="#e0e0e0" stroke-width="1"/>`;
  }).join('\n');
}

function buildPath(data: { x: number; y: number | null }[], yMin: number, scaleY: number) {
  let d = '';
  for (const pt of data) {
    if (pt.y === null) { d += 'Z'; continue; }
    const yy = toY(pt.y, yMin, scaleY);
    if (d === '') d = `M${pt.x},${yy}`;
    else d += `L${pt.x},${yy}`;
  }
  return d;
}

function buildAreaPath(data: { x: number; y: number | null }[], yMin: number, scaleY: number) {
  const baselineY = PAD.top + PLOT_H;
  let d = '';
  let segStart = -1;
  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    if (pt.y === null) {
      if (segStart >= 0) {
        const lastX = data[i - 1].x;
        d += `L${lastX},${baselineY}Z`;
        segStart = -1;
      }
      continue;
    }
    const yy = toY(pt.y, yMin, scaleY);
    if (segStart < 0) {
      d += `M${pt.x},${baselineY}L${pt.x},${yy}`;
      segStart = i;
    } else {
      d += `L${pt.x},${yy}`;
    }
  }
  if (segStart >= 0) {
    const lastX = data[data.length - 1].x;
    d += `L${lastX},${baselineY}Z`;
  }
  return d;
}

export async function GET(request: NextRequest) {
  const dateStr = request.nextUrl.searchParams.get('date_str') || dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs(dateStr).subtract(1, 'day').format('YYYY-MM-DD');
  const token = request.nextUrl.searchParams.get('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const baseUrl = request.nextUrl.origin;

  try {
    const [mainRes, yestRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/garmin/getDailyHeartRate?date_str=${dateStr}`, { headers }),
      fetch(`${baseUrl}/api/v1/garmin/getDailyHeartRate?date_str=${yesterdayStr}`, { headers }),
    ]);
    if (!mainRes.ok) return new NextResponse(buildErrorSvg('获取数据失败'), { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });

    const mainJson = await mainRes.json();
    const yestJson = yestRes.ok ? await yestRes.json() : { status: 'error' };
    const data: HRData | null = mainJson.status === 'success' ? mainJson.data : null;
    const yesterdayData: HRData | null = yestJson.status === 'success' ? yestJson.data : null;
    if (!data?.daily || !data.details?.length) return new NextResponse(buildErrorSvg('无数据'), { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });

    const yesterdayMap = new Map<string, number>();
    if (yesterdayData?.details) for (const d of yesterdayData.details) yesterdayMap.set(dayjs(d.sample_time).format('HH:mm'), d.heart_rate);

    const pts = data.details.map(d => ({ time: dayjs(d.sample_time).format('HH:mm'), hr: d.heart_rate, yhr: yesterdayMap.get(dayjs(d.sample_time).format('HH:mm')) ?? null }));
    const yMin = 0;
    const yMax = 200;
    const scaleY = PLOT_H / (yMax - yMin);
    const xStep = pts.length > 1 ? PLOT_W / (pts.length - 1) : PLOT_W;

    const mapped = pts.map((p, i) => ({ x: PAD.left + xStep * i, y: p.hr }));
    const yMapped = pts.map((p, i) => ({ x: PAD.left + xStep * i, y: p.yhr }));

    // Y axis ticks
    const tickCount = 6;
    const yTicks: number[] = [];
    for (let i = 0; i < tickCount; i++) yTicks.push(yMin + (yMax - yMin) * i / (tickCount - 1));

    // X axis ticks — evenly spaced, avoid overlap at the end
    const maxXTicks = 7;
    const xInterval = Math.max(1, Math.floor(pts.length / maxXTicks));
    const xTicks = pts.filter((_, i) => i % xInterval === 0);

    // Build area fill (polygon to bottom)
    const areaD = buildAreaPath(mapped, yMin, scaleY);
    const yesterdayAreaD = buildAreaPath(yMapped, yMin, scaleY);
    const lineD = buildPath(mapped, yMin, scaleY);
    const yLineD = buildPath(yMapped, yMin, scaleY);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${CHART_H}" viewBox="0 0 ${TOTAL_W} ${CHART_H}" font-family="sans-serif">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <defs>
    <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stop-color="#e53e3e" stop-opacity="0.8"/><stop offset="95%" stop-color="#e53e3e" stop-opacity="0.1"/></linearGradient>
    <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stop-color="#999" stop-opacity="0.4"/><stop offset="95%" stop-color="#999" stop-opacity="0.05"/></linearGradient>
  </defs>`;

    // Grid lines
    svg += buildGridLines(yTicks, yMin, scaleY);

    // Yesterday area + line
    svg += `<path d="${S(yesterdayAreaD)}" fill="url(#yg)"/>`;
    svg += `<path d="${S(yLineD)}" fill="none" stroke="#999" stroke-width="1.5" stroke-dasharray="4 4"/>`;

    // Today area + line
    svg += `<path d="${S(areaD)}" fill="url(#fg)"/>`;
    svg += `<path d="${S(lineD)}" fill="none" stroke="#e53e3e" stroke-width="2"/>`;

    // Y axis labels
    for (const y of yTicks) {
      const yy = toY(y, yMin, scaleY);
      svg += `<text x="${PAD.left - 8}" y="${yy + 4}" text-anchor="end" fill="#888" font-size="12">${Math.round(y)}</text>`;
    }

    // X axis labels
    for (const t of xTicks) {
      const idx = pts.indexOf(t);
      const xx = PAD.left + xStep * idx;
      svg += `<text x="${xx}" y="${CHART_H - 8}" text-anchor="middle" fill="#888" font-size="11">${S(t.time)}</text>`;
    }

    // Axis lines
    svg += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + PLOT_H}" stroke="#ddd" stroke-width="1"/>`;
    svg += `<line x1="${PAD.left}" y1="${PAD.top + PLOT_H}" x2="${PAD.left + PLOT_W}" y2="${PAD.top + PLOT_H}" stroke="#ddd" stroke-width="1"/>`;

    // Stats panel
    svg += buildPanel(data.daily);

    svg += '</svg>';

    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('Heart SVG route error:', err);
    return new NextResponse(buildErrorSvg('服务器错误'), {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=60' },
    });
  }
}
