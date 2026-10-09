'use client';

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import {
  IconRefresh,
  IconArrowsLeftRight,
  IconInfinity,
  IconClock,
  IconShieldCheck,
  IconUserCog,
  IconListDetails,
  IconActivity,
  IconBolt,
  IconHistory,
  IconRun,
  IconMoon,
  IconHeart,
  IconTrophy,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SyncRuns } from "@/components/dash/sync-runs";
import { HeartRatePanel } from "@/components/dash/heart-rate-panel";
import { SleepCombinedPanel } from "@/components/dash/sleep-combined-panel";
import { Running30dChart } from "@/components/dash/running-30d-chart";
import { RecentActivities } from "@/components/dash/recent-activities";
import { HeartRate30dChart } from "@/components/dash/heart-rate-30d-chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import dayjs from "dayjs";

export interface AppConfig {
  id: number;
  user_id: number;
  guid: string | null;
  account: string;
  encrypted_password?: string;
  source_type: 'garmin' | 'garmin_cn' | 'coros' | string;
  region: string;
  is_active: boolean;
  sort_order: number;
  access_token: string | null;
  access_token_expires_at: string | null;
  refresh_token: string | null;
  refresh_token_expires_at: string | null;
  oauth_token: string | null;
  oauth_token_secret: string | null;
  secret_string: string | null;
  total_count: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  master: boolean;
}

interface RunningTotalData {
  monthly_total: number;
  monthly_target: number;
  monthly_completion: string;
  monthly_count: number;
  monthly_duration: number;
  monthly_progress: string;
  yearly_total: number;
  yearly_target: number;
  yearly_completion: string;
  yearly_count: number;
  yearly_duration: number;
  yearly_progress: string;
}

interface RunningTotalResponse {
  status: string;
  data: RunningTotalData;
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

// Personal records: type_id -> key in the PersonalRecords namespace (mirrors the backend PR_TYPE_MAP).
const PR_LABEL_KEY: Record<number, string> = {
  1: "pr1",
  2: "pr2",
  3: "pr3",
  4: "pr4",
  5: "pr5",
  6: "pr6",
  7: "pr7",
};

// The dashboard "Personal Records" card only shows these six; the rest (e.g. longest distance) are filtered out here.
const ALLOWED_PR_TYPES = new Set<number>([1, 2, 3, 4, 5, 6]);

type LabelFn = (key: string) => string;

function prLabel(record: PersonalRecord, t: LabelFn): string {
  const key = PR_LABEL_KEY[record.type_id];
  if (key) return t(key);
  return record.type_key ?? `type_${record.type_id}`;
}

function formatPrSeconds(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "-";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPrMeters(meters: number | null | undefined, unit: string): string {
  if (meters == null || Number.isNaN(meters)) return "-";
  return `${(meters / 1000).toFixed(2)} ${unit}`;
}

function getPlatformInitials(sourceType: string) {
  if (sourceType === 'garmin') return 'GA';
  if (sourceType === 'garmin_cn') return 'GC';
  if (sourceType === 'coros') return 'CO';
  return sourceType.slice(0, 2).toUpperCase();
}

function getPlatformAvatarClass(sourceType: string) {
  if (sourceType === 'coros') return 'bg-emerald-600 text-white';
  return 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900';
}

function getPlatformDisplayName(sourceType: string, region: string) {
  if (sourceType === 'garmin' && region === 'gobal') return 'Garmin Global';
  if (sourceType === 'garmin' && region === 'cn') return 'Garmin CN';
  if (sourceType === 'coros') return 'COROS';
  return sourceType.toUpperCase();
}

function PlatformAvatar({ sourceType }: { sourceType: string }) {
  return (
    <div className={cn(
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
      getPlatformAvatarClass(sourceType)
    )}>
      {getPlatformInitials(sourceType)}
    </div>
  );
}

function PlatformSelect({
  apps,
  value,
  onValueChange,
  placeholder,
  disabledIds = [],
}: {
  apps: AppConfig[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabledIds?: string[];
}) {
  const selected = apps.find((app) => app.id.toString() === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-auto min-h-18 w-full rounded-xl border-border/60 bg-background px-4 py-4 shadow-none hover:border-border focus:ring-0">
        {selected ? (
          <div className="flex w-full items-center gap-3">
            <PlatformAvatar sourceType={selected.source_type} />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">{selected.source_type}-{selected.region}</p>
              <p className="truncate text-xs text-muted-foreground">{selected.account}</p>
            </div>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {apps.map((app) => (
          <SelectItem key={app.id} value={app.id.toString()} disabled={disabledIds.includes(app.id.toString())}>
            <div className="flex items-center gap-2">
              <PlatformAvatar sourceType={app.source_type} />
              <span>{app.source_type}-{app.region} ({app.account})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RunningStatCard({
  title,
  period,
  data,
}: {
  title: string;
  period: "year" | "month";
  data: {
    count: number;
    total: number;
    target: number;
    duration: number;
  };
}) {
  const ts = useTranslations('DashStats');
  const tc = useTranslations('Common');

  const completionPercent = data.target > 0 ? (data.total / data.target) * 100 : 0;
  const completionDisplay = `${completionPercent.toFixed(2)}%`;

  const now = dayjs();
  const progressPercent = period === "year"
    ? ((now.diff(now.startOf('year'), 'day') + 1) / (now.endOf('year').diff(now.startOf('year'), 'day') + 1)) * 100
    : ((now.date()) / now.daysInMonth()) * 100;
  const progressDisplay = `${progressPercent.toFixed(2)}%`;

  return (
    <Link href="/dash/calendar" className="block rounded-xl border bg-card py-0 shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/30">
      <Card className="gap-0 py-0 border-0 shadow-none">
        <CardHeader className="px-4 py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
            <span className="text-lg font-semibold">{ts('runCount', { count: data.count })}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{ts('distance')}</span>
            <span className="text-lg font-semibold">
              <span className="text-emerald-600">{data.total}</span> / {data.target} {tc('unitKm')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{ts('duration')}</span>
            <span className="text-lg font-semibold">
              {data.duration} {tc('unitHour')}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{ts('goalProgress')}</span>
              <span className="text-emerald-600">{completionDisplay}</span>
            </div>
            <Progress value={completionPercent} className="h-2" indicatorClassName="bg-emerald-600" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{ts('timeElapsed')}</span>
              <span>{progressDisplay}</span>
            </div>
            <Progress value={progressPercent} className="h-2" indicatorClassName="bg-black dark:bg-white" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-600">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>
    </Link>
  );
}

function SecurityNotice() {
  const t = useTranslations('DashPage');
  return (
    <Card className="h-full gap-0 py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <IconShieldCheck className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-base">{t("dataSecurity")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 py-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("dataSecuritySummary")}{" "}
          <Link href="/doc/tos" className="text-foreground underline underline-offset-2">
            {t("termsOfUse")}
          </Link>
          {t("dataSecuritySummaryEnd")}
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{t("dataSecurityDetail1")}</p>
          <p>{t("dataSecurityDetail2")}</p>
          <p>{t("dataSecurityDetail3")}</p>
          <p>{t("dataSecurityDetail4")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashPage() {
  const t = useTranslations('DashPage');
  const ts = useTranslations('DashStats');
  const tc = useTranslations('Common');
  const tp = useTranslations('PersonalRecords');
  const { layout } = useLayout();
  // On narrow screens only the selected tab shows its label, so the tab state must be controlled.
  const [activeTab, setActiveTab] = useState("console");
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [sourceId, setSourceId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();
  const [runningData, setRunningData] = useState<RunningTotalData | null>(null);
  const [runningDataLoading, setRunningDataLoading] = useState(true);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [personalRecordsLoading, setPersonalRecordsLoading] = useState(true);

  const fetchRunningData = async () => {
    try {
      const response = await authFetch('/api/v1/base/getRunningTotal');
      if (response.ok) {
        const result: RunningTotalResponse = await response.json();
        if (result.status === 'success') {
          setRunningData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch running data:", error);
    } finally {
      setRunningDataLoading(false);
    }
  };

  const fetchPersonalRecords = async () => {
    try {
      const response = await authFetch('/api/v1/garmin/getFitnessMetrics');
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data?.personal_records) {
          const records = (result.data.personal_records as PersonalRecord[])
            .filter((r: PersonalRecord) => ALLOWED_PR_TYPES.has(r.type_id))
            .slice()
            .sort((a: PersonalRecord, b: PersonalRecord) => a.type_id - b.type_id);
          setPersonalRecords(records);
        }
      }
    } catch (error) {
      console.error("Failed to fetch personal records:", error);
    } finally {
      setPersonalRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppsStatus();
    fetchRunningData();
    fetchPersonalRecords();
  }, []);

  const activeApps = useMemo(() => apps.filter((a) => a.is_active), [apps]);
  const masterApp = useMemo(() => activeApps.filter((a) => a.master)?.[0], [activeApps]);

  const stats = useMemo(() => {
    const platformNames = [...new Set(activeApps.map((a) => getPlatformDisplayName(a.source_type, a.region)))].join(' / ');
    const totalSyncs = activeApps.reduce((sum, a) => sum + (a.total_count || 0), 0);
    const masterTotalSyncs = masterApp?.total_count || 0;
    const lastSyncDate = activeApps.reduce<Date | null>((latest, app) => {
      if (!app.last_synced_at) return latest;
      const date = new Date(app.last_synced_at);
      return !latest || date > latest ? date : latest;
    }, null);

    return {
      connectedCount: activeApps.length,
      platformNames: platformNames || '—',
      totalSyncs,
      masterTotalSyncs,
      lastSyncDate: lastSyncDate ? dayjs(lastSyncDate).format('MM-DD HH:mm') : '—',
    };
  }, [activeApps, masterApp]);

  const fetchAppsStatus = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data: AppConfig[] = await response.json();
      setApps(data);

      const active = data.filter((a) => a.is_active);
      const master = active.find((a) => a.master);
      if (active.length > 0) {
        setSourceId(master ? master.id.toString() : active[0].id.toString());
      }
      if (active.length > 1) {
        const target = master ? active.find((a) => !a.master) : active[1];
        setTargetId(target?.id.toString());
      }
    } catch (err: unknown) {
      console.error("Fetch status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSync = async () => {
    if (isQuickSyncing || !sourceId || !targetId) {
      if (!isQuickSyncing && (!sourceId || !targetId)) {
        toast.error(t("selectSourceAndTarget"));
      }
      return;
    }

    setIsQuickSyncing(true);
    try {
      const response = await authFetch("/api/v1/base/execute2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
          count: 10,
        }),
      });
      const result = await response.json();

      if (result.status === "success") {
        const data = result.data ?? {};
        const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
        toast.success(result.message || t("syncCompleted"));
        if (failedCount > 0) {
          const first = data.failed[0];
          toast.error(
            `${first?.error || ""}${data.failed
              .slice(1)
              .map((item: { error?: string }) => item.error || "")
              .filter(Boolean)
              .join("；")}`.trim() || t("syncFailed")
          );
        }
      } else {
        toast.error(result.message || t("syncFailed"));
      }
    } catch {
      toast.error(t("syncFailedTryAgain"));
    } finally {
      setIsQuickSyncing(false);
    }
  };

  return (
    <div className={cn(
      "mx-auto flex w-full flex-1 flex-col gap-6 bg-background p-6 text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* Module tabs: 跑量 / 同步 / 睡眠 / 心率 */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col gap-6"
      >
        <TabsList className="grid h-11 w-full grid-cols-4 sm:h-9">
          <TabsTrigger value="console" aria-label={t("tabConsole")} className="px-1 sm:px-2">
            <IconRun className="h-4 w-4" />
            <span className={cn("sm:inline", activeTab === "console" ? "inline" : "hidden")}>
              {t("tabConsole")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="sync" aria-label={t("tabSync")} className="px-1 sm:px-2">
            <IconRefresh className="h-4 w-4" />
            <span className={cn("sm:inline", activeTab === "sync" ? "inline" : "hidden")}>
              {t("tabSync")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="sleep" aria-label={t("tabSleep")} className="px-1 sm:px-2">
            <IconMoon className="h-4 w-4" />
            <span className={cn("sm:inline", activeTab === "sleep" ? "inline" : "hidden")}>
              {t("tabSleep")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="heart" aria-label={t("tabHeart")} className="px-1 sm:px-2">
            <IconHeart className="h-4 w-4" />
            <span className={cn("sm:inline", activeTab === "heart" ? "inline" : "hidden")}>
              {t("tabHeart")}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 跑量 */}
        <TabsContent value="console" className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title={t("connectedPlatforms")}
          value={loading ? '—' : String(stats.connectedCount)}
          subtext={stats.platformNames}
          icon={IconInfinity}
          href="/dash/accounts"
        />
        <StatCard
          title={t("totalSyncs")}
          value={loading ? '—' : String(stats.totalSyncs)}
          subtext={
            masterApp
              ? ts('masterSource', {
                  platform: getPlatformDisplayName(masterApp.source_type, masterApp.region),
                  count: stats.masterTotalSyncs,
                })
              : '—'
          }
          icon={IconRefresh}
          href="/dash/activities"
        />
      </div>

      {/* Running stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {runningDataLoading ? (
          <>
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-semibold">{ts('thisYear')}</CardTitle>
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-1">
                <div className="h-5 animate-pulse rounded bg-muted" />
                <div className="h-5 animate-pulse rounded bg-muted" />
                <div className="h-2 animate-pulse rounded bg-muted" />
                <div className="h-2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-semibold">{ts('thisMonth')}</CardTitle>
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-1">
                <div className="h-5 animate-pulse rounded bg-muted" />
                <div className="h-5 animate-pulse rounded bg-muted" />
                <div className="h-2 animate-pulse rounded bg-muted" />
                <div className="h-2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          </>
        ) : runningData ? (
          <>
            <RunningStatCard
              title={ts('thisYear')}
              period="year"
              data={{
                count: runningData.yearly_count,
                total: runningData.yearly_total,
                target: runningData.yearly_target,
                duration: runningData.yearly_duration,
              }}
            />
            <RunningStatCard
              title={ts('thisMonth')}
              period="month"
              data={{
                count: runningData.monthly_count,
                total: runningData.monthly_total,
                target: runningData.monthly_target,
                duration: runningData.monthly_duration,
              }}
            />
          </>
        ) : null}
      </div>

      {/* Last 30 days running volume + recent activities from the primary source (7 : 3) */}
      {loading ? null : masterApp ? (
        <div className="space-y-4">
          {/* Row 1: 30-day running volume | recent activities */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <Running30dChart connectId={masterApp.id} />
            </div>
            <div className="lg:col-span-3">
              <RecentActivities connectId={masterApp.id} />
            </div>
          </div>

          {/* Row 2: 30-day heart rate | personal records (7 : 3, equal-height cards) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <HeartRate30dChart />
            </div>
            <div className="lg:col-span-3">
              {personalRecordsLoading ? (
                <Card className="h-full gap-0 py-0 shadow-sm">
                  <CardHeader className="px-5 py-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconTrophy className="h-4 w-4 text-amber-500" />
                      {tp('title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 pb-5 pt-1">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full gap-0 py-0 shadow-sm">
                  <CardHeader className="px-5 py-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconTrophy className="h-4 w-4 text-amber-500" />
                      {tp('title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 py-0">
                    {personalRecords.length > 0 ? (
                      <ul className="divide-y">
                        {personalRecords.map((record) => {
                          const time =
                            record.unit === "meter"
                              ? formatPrMeters(record.value_meters, tc('unitKm'))
                              : formatPrSeconds(record.value_seconds);
                          return (
                            <li
                              key={`${record.type_id}-${record.activity_type ?? ""}`}
                              className="flex items-start justify-between gap-4 px-5 py-3"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-sm font-medium">{prLabel(record, tp)}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {record.achieved_at
                                    ? dayjs(record.achieved_at).format("YYYY-MM-DD HH:mm")
                                    : "-"}
                                </div>
                              </div>
                              <div className="shrink-0 text-base font-semibold tabular-nums">
                                {time}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                        {tp('empty')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card className="gap-0 py-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <IconActivity className="h-10 w-10 text-emerald-600" />
            <p className="text-base font-medium">{t("noMasterSource")}</p>
            <p className="text-sm text-muted-foreground">{t("noMasterSourceDesc")}</p>
            <Button variant="outline" size="lg" className="mt-1 h-10 rounded-full px-4 text-sm" asChild>
              <Link href="/dash/accounts">
                <IconUserCog className="h-5 w-5" />
                {t("platformAccountMgmt")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      </TabsContent>

      {/* 同步 */}
      <TabsContent value="sync" className="flex flex-col gap-6">
        {/* Data Sync Card */}
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">{t("dataSync")}</CardTitle>
                <CardDescription>{t("dataSyncDesc")}</CardDescription>
              </div>
              <Button variant="outline" size="lg" className="h-10 shrink-0 rounded-full px-4 text-sm" asChild>
                <a
                  href="https://status.incremental.icu"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconActivity className="h-5 w-5" />
                  {t("serviceStatus")}
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <PlatformSelect
                  apps={activeApps}
                  value={sourceId}
                  onValueChange={setSourceId}
                  placeholder={t("selectPlatform")}
                />
              </div>

              <div className="flex shrink-0 items-center justify-center">
                <div className="rounded-full bg-muted p-2">
                  <IconArrowsLeftRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex-1">
                <PlatformSelect
                  apps={activeApps}
                  value={targetId}
                  onValueChange={setTargetId}
                  placeholder={t("selectPlatform")}
                  disabledIds={sourceId ? [sourceId] : []}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" className="h-10 rounded-full px-4 text-sm" asChild>
                  <Link href="/dash/accounts">
                    <IconUserCog className="h-5 w-5" />
                    {t("platformAccountMgmt")}
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-10 rounded-full px-4 text-sm" asChild>
                  <Link href="/dash/activities">
                    <IconListDetails className="h-5 w-5" />
                    {t("detailedDataQuery")}
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-10 rounded-full px-4 text-sm" asChild>
                  <Link href="/dash/task">
                    <IconClock className="h-5 w-5" />
                    {t("taskTitle")}
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-10 rounded-full px-4 text-sm" asChild>
                  <Link href="/dash/sync-history">
                    <IconHistory className="h-5 w-5" />
                    {t("syncHistory")}
                  </Link>
                </Button>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full px-8 text-lg shadow-sm"
                  onClick={handleQuickSync}
                  disabled={isQuickSyncing || !sourceId || !targetId}
                >
                  <IconBolt className={cn("h-5 w-5", isQuickSyncing && "animate-pulse")} />
                  {isQuickSyncing ? t("quickSyncing") : t("quickSync")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SyncRuns limit={10} />
          </div>
          <div className="lg:col-span-2">
            <SecurityNotice />
          </div>
        </div>
      </TabsContent>

      {/* 睡眠 */}
      <TabsContent value="sleep" className="flex flex-col gap-6">
        <SleepCombinedPanel />
      </TabsContent>

      {/* 心率 */}
      <TabsContent value="heart" className="flex flex-col gap-6">
        <HeartRatePanel />
      </TabsContent>
    </Tabs>
    </div>
  );
}
