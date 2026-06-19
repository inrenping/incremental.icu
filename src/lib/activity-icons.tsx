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
  const Icon = getActivityIconComponent(sportType);
  return <Icon className={className} />;
}

interface ActivityTypeIconProps {
  name: string;
  className?: string;
}

export function ActivityTypeIcon({ name, className }: ActivityTypeIconProps) {
  const Icon = ACTIVITY_ICON_MAP[getActivityIconByName(name)];
  return <Icon className={className} />;
}
