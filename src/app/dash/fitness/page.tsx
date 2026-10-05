'use client';

/**
 * 体能指标页面：展示佳明的训练状态·负荷、体能年龄、个人纪录、比赛成绩预测，
 * 并提供一个手动同步按钮（调用后端 /api/v1/garmin/syncFitnessMetrics）。
 *
 * 四张表都是「一人一份最新快照」，所以这里只展示最新值，没有历史曲线。
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import {
  IconBolt,
  IconRefresh,
  IconCircleCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';

import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLayout } from '@/hooks/use-layout';
import { useActivityTypeLabel } from '@/lib/activity-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TrainingStatus {
  calendar_date: string | null;
  training_status: string | null;
  training_status_feedback_phrase: string | null;
  training_paused: boolean | null;
  weekly_training_load: number | null;
  daily_training_load_acute: number | null;
  daily_training_load_chronic: number | null;
  acute_chronic_workload_ratio: number | null;
  acwr_status: string | null;
  load_tunnel_min: number | null;
  load_tunnel_max: number | null;
  vo2_max_value: number | null;
  vo2_max_running: number | null;
  vo2_max_cycling: number | null;
  synced_at: string | null;
}

interface FitnessAge {
  calendar_date: string | null;
  fitness_age: number | null;
  vo2_max_value: number | null;
  max_met: number | null;
  synced_at: string | null;
}

interface PersonalRecord {
  type_id: number;
  type_key: string | null;
  activity_type: string | null;
  unit: string | null;
  value: number | null;
  value_seconds: number | null;
  value_meters: number | null;
  activity_name: string | null;
  achieved_at: string | null;
  activity_id: number | null;
}

interface RacePrediction {
  race_type: string;
  distance_meters: number | null;
  predicted_seconds: number | null;
  predicted_time_text: string | null;
  synced_at: string | null;
}

interface MetricsPayload {
  training_status: TrainingStatus | null;
  fitness_age: FitnessAge | null;
  personal_records: PersonalRecord[];
  race_predictions: RacePrediction[];
}

// 只保留配色，标签走 FitnessPage 命名空间
const STATUS_CLS: Record<string, string> = {
  PRODUCTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  MAINTAINING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PEAKING: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  OVERREACHING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  DETRAINING: 'bg-red-500/10 text-red-600 border-red-500/20',
  UNPRODUCTIVE: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  NO_STATUS: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  PRODUCTIVE: 'statusProductive',
  MAINTAINING: 'statusMaintaining',
  PEAKING: 'statusPeaking',
  OVERREACHING: 'statusOverreaching',
  DETRAINING: 'statusDetraining',
  UNPRODUCTIVE: 'statusUnproductive',
  NO_STATUS: 'statusNone',
};

const RACE_LABEL_KEY: Record<string, string> = {
  FIVE_K: 'race5k',
  TEN_K: 'race10k',
  HALF_MARATHON: 'raceHalf',
  MARATHON: 'raceFull',
};

/** 同步结果里的模块名 → 翻译键 */
const SYNC_ITEM_KEY: Record<string, string> = {
  training_status: 'syncItemTrainingStatus',
  fitness_age: 'syncItemFitnessAge',
  personal_records: 'syncItemPersonalRecords',
  race_predictions: 'syncItemRacePredictions',
};

function formatSeconds(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '-';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatMeters(meters: number | null | undefined, unit: string): string {
  if (meters == null || Number.isNaN(meters)) return '-';
  return `${(meters / 1000).toFixed(2)} ${unit}`;
}

function formatNumber(value?: number | null, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '-';
  return Number(value).toFixed(digits);
}

function formatTime(iso?: string | null): string {
  return iso ? dayjs(iso).format('YYYY-MM-DD HH:mm') : '-';
}

function SectionCard({
  title,
  icon,
  syncedAt,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  syncedAt?: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations('FitnessPage');
  return (
    <div className="rounded-2xl border bg-white/80 dark:bg-slate-900/60 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {syncedAt ? (
          <span className="text-[11px] text-muted-foreground">
            {t('syncedAt', { time: formatTime(syncedAt) })}
          </span>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function FitnessMetricsPage() {
  const t = useTranslations('FitnessPage');
  const tc = useTranslations('Common');
  const typeLabel = useActivityTypeLabel();
  const { layout } = useLayout();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, { synced?: boolean; reason?: string }> | null>(
    null
  );

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/garmin/getFitnessMetrics');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data as MetricsPayload);
      } else {
        setError(json.message ?? t('loadError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await authFetch('/api/v1/garmin/syncFitnessMetrics');
      const json = await res.json();
      if (json.status === 'success') {
        setLastResult(json.data ?? null);
        const failed = Object.entries(json.data ?? {})
          .filter(([, v]) => typeof v === 'object' && v && (v as { synced?: boolean }).synced === false)
          .map(([k]) => k);
        if (failed.length === 0) {
          toast.success(t('syncSuccess'));
        } else {
          toast.warning(
            t('syncPartial', {
              count: failed.length,
              items: failed.map((k) => (SYNC_ITEM_KEY[k] ? t(SYNC_ITEM_KEY[k]) : k)).join(', '),
            })
          );
        }
        await fetchMetrics();
      } else {
        toast.error(json.message ?? t('syncFailed'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('syncFailed'));
    } finally {
      setSyncing(false);
    }
  }, [fetchMetrics, t]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const status = data?.training_status ?? null;
  const statusCls = status?.training_status
    ? STATUS_CLS[status.training_status] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    : null;
  const statusLabel = status?.training_status
    ? (STATUS_LABEL_KEY[status.training_status]
        ? t(STATUS_LABEL_KEY[status.training_status])
        : status.training_status)
    : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-5 p-6 mx-auto bg-slate-50/60 dark:bg-background flex-1 text-sm transition-all duration-300',
        layout === 'fixed' ? 'w-full max-w-5xl' : 'w-full max-w-none'
      )}
    >
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBolt className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            className="gap-2 rounded-full"
          >
            <IconRefresh className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? t('syncing') : t('manualSync')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('headerDesc')}
        </p>
      </section>

      {lastResult ? (
        <section className="rounded-2xl border bg-white/80 dark:bg-slate-900/60 px-5 py-3 text-xs space-y-1">
          {Object.entries(lastResult)
            .filter(([, v]) => typeof v === 'object' && v && 'synced' in v)
            .map(([key, value]) => {
              const item = value as { synced?: boolean; reason?: string; count?: number };
              return (
                <div key={key} className="flex items-center gap-2">
                  {item.synced ? (
                    <IconCircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <IconAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="font-medium">
                    {SYNC_ITEM_KEY[key] ? t(SYNC_ITEM_KEY[key]) : key}
                  </span>
                  <span className="text-muted-foreground">
                    {item.synced
                      ? item.count != null
                        ? `${t('itemSynced')} · ${t('itemCount', { count: item.count })}`
                        : t('itemSynced')
                      : t('itemMissing', { reason: item.reason ?? t('noApiData') })}
                  </span>
                </div>
              );
            })}
        </section>
      ) : null}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">{tc('loading')}</div>
      ) : error ? (
        <div className="py-20 text-center text-destructive">{error}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {/* 训练状态与负荷 */}
          <SectionCard
            title="训练状态 · 负荷"
            icon={<IconBolt className="h-4 w-4 text-muted-foreground" />}
            syncedAt={status?.synced_at}
          >
            {status ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {statusLabel ? (
                    <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', statusCls ?? undefined)}>
                      {statusLabel}
                    </Badge>
                  ) : null}
                  {status.training_paused ? (
                    <Badge variant="outline" className="px-2 py-0.5 text-[11px]">
                      {t('trainingPaused')}
                    </Badge>
                  ) : null}
                  {status.calendar_date ? (
                    <span className="text-[11px] text-muted-foreground">{status.calendar_date}</span>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Metric label={t('weeklyLoad')} value={formatNumber(status.weekly_training_load)} />
                  <Metric label={t('acuteLoad')} value={formatNumber(status.daily_training_load_acute)} />
                  <Metric label={t('chronicLoad')} value={formatNumber(status.daily_training_load_chronic)} />
                  <Metric
                    label={t('acwr')}
                    value={formatNumber(status.acute_chronic_workload_ratio, 2)}
                    hint={status.acwr_status ?? undefined}
                  />
                  <Metric
                    label={t('loadTunnel')}
                    value={`${formatNumber(status.load_tunnel_min)} ~ ${formatNumber(status.load_tunnel_max)}`}
                  />
                  <Metric label={t('vo2max')} value={formatNumber(status.vo2_max_value, 1)} />
                </div>

                {status.training_status_feedback_phrase ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {status.training_status_feedback_phrase}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noTrainingStatus')}</p>
            )}
          </SectionCard>

          {/* 体能年龄 */}
          <SectionCard
            title={t('sectionFitnessAge')}
            icon={<IconBolt className="h-4 w-4 text-muted-foreground" />}
            syncedAt={data?.fitness_age?.synced_at}
          >
            {data?.fitness_age ? (
              <div className="grid grid-cols-3 gap-4">
                <Metric label={t('fitnessAge')} value={formatNumber(data.fitness_age.fitness_age)} hint={t('yearsOld')} />
                <Metric label={t('vo2max')} value={formatNumber(data.fitness_age.vo2_max_value, 1)} />
                <Metric label={t('maxMet')} value={formatNumber(data.fitness_age.max_met, 1)} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noFitnessAge')}</p>
            )}
          </SectionCard>

          {/* 个人纪录 */}
          <SectionCard
            title={t('sectionPersonalRecords')}
            icon={<IconBolt className="h-4 w-4 text-muted-foreground" />}
          >
            {(data?.personal_records ?? []).length > 0 ? (
              <ul className="divide-y">
                {data!.personal_records.map((record) => (
                  <li key={`${record.type_id}-${record.activity_type ?? ''}`} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {record.type_key ?? `type_${record.type_id}`}
                        {record.activity_type ? (
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            {typeLabel(record.activity_type)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {record.activity_name ? `${record.activity_name} · ` : ''}
                        {formatTime(record.achieved_at)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums">
                      {record.unit === 'meter'
                        ? formatMeters(record.value_meters, tc('unitKm'))
                        : formatSeconds(record.value_seconds)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noPersonalRecords')}</p>
            )}
          </SectionCard>

          {/* 比赛成绩预测 */}
          <SectionCard
            title={t('sectionRacePrediction')}
            icon={<IconBolt className="h-4 w-4 text-muted-foreground" />}
          >
            {(data?.race_predictions ?? []).length > 0 ? (
              <ul className="divide-y">
                {data!.race_predictions.map((prediction) => (
                  <li key={prediction.race_type} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">
                      {RACE_LABEL_KEY[prediction.race_type]
                        ? t(RACE_LABEL_KEY[prediction.race_type])
                        : prediction.race_type}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {prediction.predicted_time_text ?? formatSeconds(prediction.predicted_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('noRacePrediction')}</p>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
