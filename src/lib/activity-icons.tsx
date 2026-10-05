import { createElement } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconRun,
  IconBike,
  IconSwimming,
  IconWalk,
  IconActivity,
  IconTreadmill,
  IconMountain,
  IconPool,
  IconBarbell,
  IconHeartbeat,
  IconFlame,
  IconStairs,
  IconSnowboarding,
  IconSkiJumping,
  IconKayak,
  IconWaterpolo,
  IconWind,
  IconSailboat,
  IconYoga,
} from '@tabler/icons-react';
import activityTypes from '@/lib/activity_type.json';

export const ACTIVITY_ICON_MAP = {
  IconRun,
  IconBike,
  IconSwimming,
  IconWalk,
  IconActivity,
  IconTreadmill,
  IconMountain,
  IconPool,
  IconBarbell,
  IconHeartbeat,
  IconFlame,
  IconStairs,
  IconSnowboarding,
  IconSkiJumping,
  IconKayak,
  IconWaterpolo,
  IconWind,
  IconSailboat,
  IconYoga,
} as const;

export type ActivityIconName = keyof typeof ACTIVITY_ICON_MAP;

export interface ActivityTypeEntry {
  name: string;
  name_zh: string;
  key: number;
  icon?: string;
  children?: ActivityTypeEntry[];
}

export const ACTIVITY_TYPES = activityTypes as ActivityTypeEntry[];

const iconByName = new Map<string, ActivityIconName>();

for (const group of ACTIVITY_TYPES) {
  const groupIcon = (group.icon as ActivityIconName | undefined) ?? 'IconActivity';
  iconByName.set(group.name.toLowerCase(), groupIcon);

  for (const child of group.children ?? []) {
    iconByName.set(child.name.toLowerCase(), (child.icon as ActivityIconName | undefined) ?? groupIcon);
  }
}

export function getActivityIconName(sportType: string): ActivityIconName {
  const normalized = sportType.toLowerCase().trim();
  const configured = iconByName.get(normalized);
  if (configured) return configured;

  const keyMatch = normalized.match(/^\d+$/);
  if (keyMatch) {
    const key = parseInt(keyMatch[0]);
    const iconByKey = getIconByKey(key);
    if (iconByKey) return iconByKey;
  }

  if (normalized.includes('run')) return 'IconRun';
  if (normalized.includes('cycl') || normalized.includes('bike')) return 'IconBike';
  if (normalized.includes('swim')) return 'IconSwimming';
  if (normalized.includes('hik')) return 'IconMountain';
  if (normalized.includes('walk')) return 'IconWalk';
  if (normalized.includes('yoga')) return 'IconYoga';
  if (normalized.includes('ski') || normalized.includes('snow')) return 'IconSnowboarding';
  if (normalized.includes('row')) return 'IconKayak';
  if (normalized.includes('sail')) return 'IconSailboat';

  return 'IconActivity';
}

/**
 * get icon by key
 * @param key 
 * @returns 
 */
function getIconByKey(key: number): ActivityIconName | null {
  const keyToIcon: Record<number, ActivityIconName> = {
    100: 'IconRun',
    101: 'IconTreadmill',
    102: 'IconMountain',
    103: 'IconRun',
    200: 'IconBike',
    201: 'IconBike',
    202: 'IconMountain',
    300: 'IconSwimming',
    301: 'IconPool',
    302: 'IconSwimming',
    400: 'IconMountain',
    500: 'IconBarbell',
    501: 'IconBarbell',
    502: 'IconFlame',
    503: 'IconYoga',
    505: 'IconKayak',
    600: 'IconSnowboarding',
    601: 'IconSnowboarding',
    602: 'IconSkiJumping',
    700: 'IconWalk',
    800: 'IconKayak',
    801: 'IconKayak',
    802: 'IconKayak',
    803: 'IconKayak',
    804: 'IconWaterpolo',
    805: 'IconWind',
    806: 'IconSailboat',
    900: 'IconActivity',
  };

  return keyToIcon[key] || null;
}

export function getActivityIconComponent(sportType: string) {
  return ACTIVITY_ICON_MAP[getActivityIconName(sportType)];
}

export function getActivityIconByName(name: string): ActivityIconName {
  const icon = iconByName.get(name.toLowerCase());
  if (icon && icon in ACTIVITY_ICON_MAP) return icon;
  return 'IconActivity';
}

interface ActivitySportIconProps {
  sportType: string;
  className?: string;
}

export function ActivitySportIcon({ sportType, className }: ActivitySportIconProps) {
  const iconName = getActivityIconName(sportType);
  const Icon = ACTIVITY_ICON_MAP[iconName];
  return createElement(Icon, { className });
}

interface ActivityTypeIconProps {
  name: string;
  className?: string;
}

export function ActivityTypeIcon({ name, className }: ActivityTypeIconProps) {
  const iconName = getActivityIconByName(name);
  const Icon = ACTIVITY_ICON_MAP[iconName];
  return createElement(Icon, { className });
}

/**
 * 运动类型显示名。优先查 ActivityTypes.<原始 name>，命中失败再按关键字猜测，
 * 都查不到就退回原始 key（多数情况下是可读的英文 slug）。
 * 注意：调用方必须保证组件在 NextIntlClientProvider 内部（全部页面均满足）。
 */
export function useActivityTypeLabel() {
  const t = useTranslations('ActivityTypes');

  return (raw: string | null | undefined, opts?: { group?: boolean }): string => {
    const key = (raw ?? '').toLowerCase().trim();
    if (!key) return '';

    const prefixed = opts?.group ? `group_${key}` : key;
    if (t.has(prefixed)) return t(prefixed);

    const direct = t.has(key) ? t(key) : null;
    if (direct) return direct;

    const guess = guessTypeKey(key);
    if (guess && t.has(guess)) return t(guess);

    return key;
  };
}

/** 原始 sport_type 字符串 → ActivityTypes 里的翻译键 */
function guessTypeKey(normalized: string): string | null {
  if (normalized.includes('run')) return 'running';
  if (normalized.includes('cycl') || normalized.includes('bike')) return 'cycling';
  if (normalized.includes('swim')) return 'lap_swimming';
  if (normalized.includes('hik')) return 'hiking';
  if (normalized.includes('walk')) return 'walking';
  if (normalized.includes('yoga')) return 'yoga';
  if (normalized.includes('row')) return 'rowing';
  if (normalized.includes('ski') || normalized.includes('snow')) return 'resort_skiing_snowboarding_ws';
  if (normalized.includes('sail')) return 'sailing';
  if (normalized.includes('raft') || normalized.includes('kayak')) return 'whitewater_rafting_keyaking';
  if (normalized.includes('surf')) return 'surfing';
  if (normalized.includes('wind')) return 'windsurfing';
  return null;
}
