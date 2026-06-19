'use client';

import React from 'react';
import dayjs from 'dayjs';
import {
  IconRun,
  IconBike,
  IconSwimming,
  IconWalk,
  IconMountain,
  IconActivity,
  IconRoute,
  IconClock,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface Activity {
  id: number;
  activity_id: string;
  activity_name: string;
  start_time_local: string;
  sport_type_raw: string;
  moving_duration_seconds: number;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain: number;
  source_type: string;
  created_at: string;
}

const formatDuration = (seconds: number) => {
  if (seconds === null || seconds === undefined) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
  return parts.join(':');
};

const getSportIcon = (sport: string) => {
  const s = (sport || '').toLowerCase();
  if (s.includes('run')) return IconRun;
  if (s.includes('cycl') || s.includes('bik')) return IconBike;
  if (s.includes('swim')) return IconSwimming;
  if (s.includes('walk') || s.includes('hik')) return IconWalk;
  if (s.includes('mountain') || s.includes('trail')) return IconMountain;
  return IconActivity;
};

interface ActivityCardProps {
  activity: Activity;
  onClick: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const SportIcon = getSportIcon(activity.sport_type_raw);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left',
        'shadow-sm transition-all hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]'
      )}
    >
      {/* 运动类型图标 */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SportIcon size={20} />
      </div>

      {/* 主体信息 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {activity.activity_name}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {dayjs(activity.start_time_local).format('MM-DD HH:mm')}
          </span>
        </div>

        {/* 关键数据：一行展示 */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-mono font-medium text-foreground">
            <IconRoute size={13} className="text-muted-foreground" />
            {(activity.distance_meters / 1000).toFixed(2)} km
          </span>
          <span className="flex items-center gap-1 font-mono">
            <IconClock size={13} />
            {formatDuration(activity.moving_duration_seconds)}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <IconArrowUpRight size={13} />
            {activity.elevation_gain} m
          </span>
          <span className="ml-auto truncate capitalize">{activity.sport_type_raw}</span>
        </div>
      </div>
    </button>
  );
}
