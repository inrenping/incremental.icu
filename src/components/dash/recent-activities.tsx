'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ActivitySportIcon } from '@/lib/activity-icons';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';

const LIMIT = 5;

interface Activity {
  id: number;
  activity_name: string;
  start_time_local: string | null;
  sport_type_raw: string;
  distance_meters: number | string | null;
  moving_duration_seconds: number | string | null;
}

function formatDuration(seconds: number | string | null) {
  if (seconds === null || seconds === undefined) return '--';
  const value = Number(seconds);
  if (!Number.isFinite(value)) return '--';
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = Math.floor(value % 60);
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) parts.unshift(h.toString());
  return parts.join(':');
}

export function RecentActivities({
  connectId,
  className,
}: {
  connectId?: number;
  className?: string;
}) {
  const t = useTranslations('DashPage');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!connectId) return;

    const params = new URLSearchParams({
      connect_id: String(connectId),
      page_size: String(LIMIT),
      page_count: '1',
    });

    authFetch(`/api/v1/base/getActivitiesByPage?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((result) => {
        if (cancelled) return;
        const rows: Activity[] = Array.isArray(result?.data) ? result.data : [];
        setActivities(rows.slice(0, LIMIT));
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connectId]);

  return (
    <Card className={cn('h-full gap-0 py-0 shadow-sm', className)}>
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-base">{t('recentActivities')}</CardTitle>
        <CardAction>
          <Link
            href={connectId ? `/dash/activities?connect_id=${connectId}` : '/dash/activities'}
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t('viewAll')}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 py-4">
        {loading ? (
          <div className="flex flex-1 flex-col gap-3">
            {Array.from({ length: LIMIT }).map((_, index) => (
              <div key={index} className="flex flex-1 items-center gap-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            {t('listLoadFailed')}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            {t('noActivityData')}
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-1 items-center gap-3 border-b last:border-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                <ActivitySportIcon sportType={activity.sport_type_raw} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{activity.activity_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activity.start_time_local
                    ? dayjs(activity.start_time_local).format('MM-DD HH:mm')
                    : '--'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-emerald-600">
                  {(Number(activity.distance_meters ?? 0) / 1000).toFixed(2)} km
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(activity.moving_duration_seconds)}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
