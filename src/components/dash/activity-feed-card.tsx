'use client';

import { cn } from '@/lib/utils';
import { type Activity, getSportColor } from '@/lib/activities';
import { ActivitySportIcon } from '@/lib/activity-icons';
import { ActivityFeedDesktopCells } from '@/components/dash/activity-feed-layout';
import dayjs from 'dayjs';
import { formatDuration, formatDistance } from '@/lib/activities';

interface ActivityFeedCardProps {
  activity: Activity;
  onClick: () => void;
}

export function ActivityFeedCard({ activity, onClick }: ActivityFeedCardProps) {
  const hasDistance = activity.distance_meters > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 md:gap-4 px-3 md:px-4 py-2.5 md:py-2.5 text-left border-b border-border hover:bg-muted/40 active:bg-muted/60 transition-colors"
    >
      <div
        className={cn(
          'flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full',
          getSportColor(activity.sport_type_raw)
        )}
      >
        <ActivitySportIcon sportType={activity.sport_type_raw} className="h-3.5 w-3.5 text-white" />
      </div>

      {/* Mobile: compact two-line layout */}
      <div className="flex-1 min-w-0 md:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-sm truncate text-foreground">
            {activity.activity_name }
          </span>
          {hasDistance && (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatDistance(activity.distance_meters)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="capitalize shrink-0">{activity.sport_type_raw}</span>
          <span>·</span>
          <span className="tabular-nums shrink-0">
            {formatDuration(activity.moving_duration_seconds)}
          </span>
          <span>·</span>
          <span className="tabular-nums truncate">
            {dayjs(activity.start_time_local).format('MM-DD HH:mm')}
          </span>
          {activity.elevation_gain > 0 && (
            <>
              <span>·</span>
              <span className="shrink-0">{activity.elevation_gain} m</span>
            </>
          )}
        </div>
      </div>

      {/* Desktop: responsive column layouts */}
      <ActivityFeedDesktopCells activity={activity} />
    </button>
  );
}
