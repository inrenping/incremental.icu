'use client';

import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { storage } from '@/lib/storage';
import { useLayout } from '@/hooks/use-layout';
import { cn } from '@/lib/utils';
import { formatDuration, formatDistance } from '@/lib/activities';
import { ActivitySportIcon } from '@/lib/activity-icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconLoader2 } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface MainActivity {
  id: number;
  activity_id: string;
  activity_name: string;
  start_time_local: string;
  sport_type_raw: string;
  moving_duration_seconds: number;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain: number;
  average_hr: number | null;
  source_type: string;
  device_name?: string;
  location?: string;
  username?: string;
}

function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (!distanceMeters || !durationSeconds) return '--';
  const paceSeconds = durationSeconds / (distanceMeters / 1000);
  const m = Math.floor(paceSeconds / 60);
  const s = Math.floor(paceSeconds % 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

function getPlatformDisplayName(sourceType: string): string {
  if (sourceType === 'garmin_cn') return 'Garmin';
  if (sourceType === 'garmin') return 'Garmin';
  if (sourceType === 'coros') return 'COROS';
  return sourceType.toUpperCase();
}

export default function MainFeedPage() {
  const { layout } = useLayout();
  const [activities, setActivities] = useState<MainActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const user = (() => {
    try {
      const raw = storage.get('user');
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch {
      return null;
    }
  })();

  const fetchActivities = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await authFetch(
        `/api/v1/main/getActivitiesByPage?page_size=10&page_count=${pageNum}`
      );
      if (response.ok) {
        const result = await response.json();
        const data: MainActivity[] = result.data || [];
        if (append) {
          setActivities((prev) => [...prev, ...data]);
        } else {
          setActivities(data);
        }
        setHasMore(data.length >= 10);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoaded(true);
    }
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  useEffect(() => {
    if (!initialLoaded) {
      fetchActivities(1, false);
    }
  }, [initialLoaded, fetchActivities]);

  return (
    <div
      className={cn(
        'mx-auto flex flex-1 flex-col gap-4 bg-background p-6 text-sm transition-all duration-300',
        layout === 'fixed' ? 'max-w-7xl' : 'max-w-none w-full'
      )}
    >
      {loading && !initialLoaded ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="gap-0 py-0 shadow-sm">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="flex gap-6">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">暂无运动数据</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {activities.map((activity) => (
              <Card key={activity.id} className="gap-0 py-0 shadow-sm overflow-hidden">
                {/* User header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {activity.username?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.username || user?.username || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(activity.start_time_local).format('YYYY年M月D日于HH:mm')}
                      {activity.device_name && (
                        <> · {getPlatformDisplayName(activity.source_type)} {activity.device_name}</>
                      )}
                      {activity.location && (
                        <> · {activity.location}</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Activity content */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ActivitySportIcon sportType={activity.sport_type_raw} className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">{activity.activity_name}</h3>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">距离</p>
                      <p className="text-lg font-semibold tabular-nums">{formatDistance(activity.distance_meters)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">配速</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatPace(activity.distance_meters, activity.moving_duration_seconds)}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">/km</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">时间</p>
                      <p className="text-lg font-semibold tabular-nums">{formatDuration(activity.moving_duration_seconds)}</p>
                    </div>
                    {activity.elevation_gain > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">爬升</p>
                        <p className="text-lg font-semibold tabular-nums">{activity.elevation_gain} m</p>
                      </div>
                    )}
                    {activity.average_hr && activity.average_hr > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">平均心率</p>
                        <p className="text-lg font-semibold tabular-nums">
                          {activity.average_hr}
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">bpm</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full px-8"
              >
                {loadingMore ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </Button>
            </div>
          )}
          {!hasMore && activities.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">— 没有更多数据了 —</p>
          )}
        </>
      )}
    </div>
  );
}
