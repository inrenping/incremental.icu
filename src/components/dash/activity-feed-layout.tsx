import type { Activity } from '@/lib/activities';
import { formatDuration, formatDistance } from '@/lib/activities';
import { ActivitySportIcon } from '@/lib/activity-icons';
import dayjs from 'dayjs';

/** 中等桌面宽度：核心字段 */
export const FEED_GRID_MD =
  'grid-cols-[minmax(0,5rem)_minmax(0,1.5fr)_5rem_8.5rem_4.5rem_4rem_4.5rem]';

/** 宽屏桌面：与表格页一致的全部字段（不含 ID） */
export const FEED_GRID_XL =
  'grid-cols-[minmax(0,5rem)_minmax(0,1.2fr)_5rem_8.5rem_4.5rem_4.5rem_4rem_4.5rem_8.5rem]';

export const FEED_HEADER_MD = ['type', 'name', 'distance', 'startTime', 'movingTime', 'elevation', 'platform'] as const;

export const FEED_HEADER_XL = [
  'type',
  'name',
  'distance',
  'startTime',
  'movingTime',
  'totalTime',
  'elevation',
  'platform',
  'syncTime',
] as const;

type TranslateFn = (key: string) => string;

function FeedCells({ activity, full }: { activity: Activity; full: boolean }) {
  const hasDistance = activity.distance_meters > 0;

  return (
    <>
      <span className="flex items-center gap-1.5 capitalize truncate text-muted-foreground">
        <ActivitySportIcon sportType={activity.sport_type_raw} className="h-3.5 w-3.5 shrink-0" />
        {activity.sport_type_raw}
      </span>
      <span className="font-medium truncate text-foreground">
        {activity.activity_name || activity.sport_type_raw}
      </span>
      <span className="text-right font-semibold tabular-nums text-foreground">
        {hasDistance ? formatDistance(activity.distance_meters) : '--'}
      </span>
      <span className="text-right tabular-nums text-muted-foreground">
        {dayjs(activity.start_time_local).format('YYYY-MM-DD HH:mm')}
      </span>
      <span className="text-right tabular-nums text-muted-foreground">
        {formatDuration(activity.moving_duration_seconds)}
      </span>
      {full && (
        <span className="text-right tabular-nums text-muted-foreground">
          {formatDuration(activity.duration_seconds)}
        </span>
      )}
      <span className="text-right tabular-nums text-muted-foreground">
        {activity.elevation_gain} m
      </span>
      <span className="text-right truncate text-xs text-muted-foreground uppercase">
        {activity.source_type}
      </span>
      {full && (
        <span className="text-center tabular-nums text-muted-foreground">
          {dayjs(activity.created_at).format('YYYY-MM-DD HH:mm')}
        </span>
      )}
    </>
  );
}

export function ActivityFeedDesktopCells({ activity }: { activity: Activity }) {
  return (
    <div className="hidden md:flex flex-1 min-w-0">
      <div className={`grid xl:hidden flex-1 gap-3 items-center min-w-0 text-sm ${FEED_GRID_MD}`}>
        <FeedCells activity={activity} full={false} />
      </div>
      <div className={`hidden xl:grid flex-1 gap-3 items-center min-w-0 text-sm ${FEED_GRID_XL}`}>
        <FeedCells activity={activity} full={true} />
      </div>
    </div>
  );
}

export function ActivityFeedDesktopHeader({ t }: { t: TranslateFn }) {
  const align = (key: string) => {
    if (key === 'distance' || key === 'movingTime' || key === 'totalTime' || key === 'elevation')
      return 'text-right';
    if (key === 'platform' || key === 'syncTime') return 'text-center';
    return '';
  };

  const renderHeader = (keys: readonly string[], gridClass: string, visibility: string) => (
    <div className={`${visibility} bg-muted/50 text-xs text-muted-foreground border-b border-border`}>
      <div className="flex items-center gap-4 px-4 py-2.5">
        <div className="w-9 shrink-0" />
        <div className={`grid flex-1 gap-3 ${gridClass}`}>
          {keys.map((key) => (
            <span key={key} className={align(key)}>
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderHeader(FEED_HEADER_MD, FEED_GRID_MD, 'hidden md:block xl:hidden')}
      {renderHeader(FEED_HEADER_XL, FEED_GRID_XL, 'hidden xl:block')}
    </>
  );
}
