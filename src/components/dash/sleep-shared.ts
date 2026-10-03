// 睡眠模块共享的类型、常量与纯工具函数（无 JSX），供月报面板与日历面板复用。

// ---- 佳明 sleepLevels.activityLevel 阶段编码 ----
export const STAGE_DEEP = 0;
export const STAGE_LIGHT = 1;
export const STAGE_REM = 2;
export const STAGE_AWAKE = 3;

// 统一使用佳明官方中文术语
export const STAGE_META: Record<number, { label: string; color: string }> = {
  [STAGE_AWAKE]: { label: '清醒', color: '#E24B4A' },
  [STAGE_REM]: { label: 'REM', color: '#1D9E75' },
  [STAGE_LIGHT]: { label: '浅睡', color: '#378ADD' },
  [STAGE_DEEP]: { label: '深睡', color: '#7F77DD' },
};

// 自上而下：清醒 / REM / 浅睡 / 深睡
export const ROW_ORDER = [STAGE_AWAKE, STAGE_REM, STAGE_LIGHT, STAGE_DEEP];

export const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

export interface SleepDaily {
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

export interface SleepLevel {
  start_at: string;
  end_at: string;
  duration_seconds: number;
  activity_level: number;
}

export interface MonthDay {
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

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m}分钟`;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

/** 极坐标：0 度在正上方，顺时针递增 */
export function polar(
  cx: number,
  cy: number,
  r: number,
  deg: number
): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
