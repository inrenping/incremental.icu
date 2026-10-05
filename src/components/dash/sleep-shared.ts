// 睡眠模块共享的类型、常量与纯工具函数（无 JSX），供月报面板与日历面板复用。

import { useTranslations } from 'next-intl';

// ---- 佳明 sleepLevels.activityLevel 阶段编码 ----
export const STAGE_DEEP = 0;
export const STAGE_LIGHT = 1;
export const STAGE_REM = 2;
export const STAGE_AWAKE = 3;

// 阶段配色与文案分离：颜色是固定设计 token，文案走 SleepPanel 命名空间。
export const STAGE_COLORS: Record<number, string> = {
  [STAGE_AWAKE]: '#E24B4A',
  [STAGE_REM]: '#1D9E75',
  [STAGE_LIGHT]: '#378ADD',
  [STAGE_DEEP]: '#7F77DD',
};

/** 阶段 → SleepPanel 下的翻译键 */
export const STAGE_LABEL_KEYS: Record<number, string> = {
  [STAGE_AWAKE]: 'stageAwake',
  [STAGE_REM]: 'stageRem',
  [STAGE_LIGHT]: 'stageLight',
  [STAGE_DEEP]: 'stageDeep',
};

// 自上而下：清醒 / REM / 浅睡 / 深睡
export const ROW_ORDER = [STAGE_AWAKE, STAGE_REM, STAGE_LIGHT, STAGE_DEEP];

/** 周一 ~ 周日 → CalendarPage 下的翻译键 */
export const WEEKDAY_LABEL_KEYS = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
] as const;

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

/** 阶段名（清醒 / REM / 浅睡 / 深睡），随语言切换 */
export function useStageLabel() {
  const t = useTranslations('SleepPanel');
  return (stage: number): string => {
    const key = STAGE_LABEL_KEYS[stage];
    return key ? t(key) : '--';
  };
}

/** 周一 ~ 周日表头（不带「周」前缀，由调用方决定是否拼接） */
export function useWeekdayLabels(namespace: 'SleepPanel' | 'CalendarPage' = 'CalendarPage') {
  const t = useTranslations(namespace);
  return WEEKDAY_LABEL_KEYS.map((key) => t(key));
}

/** 「7小时36分钟」这类长时长 */
export function useSleepDuration() {
  const t = useTranslations('SleepPanel');

  return (seconds?: number | null): string => {
    if (!seconds || seconds <= 0) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h <= 0) return t('durationMinutes', { m });
    return m > 0 ? t('durationHoursMinutes', { h, m }) : t('durationHours', { h });
  };
}

/** 「7时36分」这类短时长，用于 SVG 中心大字与日历格子 */
export function useSleepDurationShort() {
  const t = useTranslations('SleepPanel');

  return (seconds?: number | null): string => {
    if (!seconds || seconds <= 0) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h <= 0) return t('shortMinutes', { m });
    return m > 0 ? t('shortHoursMinutes', { h, m }) : t('shortHours', { h });
  };
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
