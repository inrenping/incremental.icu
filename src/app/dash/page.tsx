'use client';

import { useState, useEffect, useRef, useMemo } from "react";
import { storage } from '@/lib/storage';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { TerminalModal, type LogLine } from "@/components/dash/terminal-modal";
import {
  IconRefresh,
  IconArrowsLeftRight,
  IconInfinity,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconShieldCheck,
  IconUser,
  IconUserCog,
  IconListDetails,
  IconActivity,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SyncLogs } from "@/components/dash/sync-logs";
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
}

interface User {
  id: number;
  username: string;
  email: string;
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

function getPlatformDisplayName(sourceType: string) {
  if (sourceType === 'garmin') return 'Garmin';
  if (sourceType === 'garmin_cn') return 'Garmin CN';
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
}: {
  apps: AppConfig[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
}) {
  const selected = apps.find((app) => app.id.toString() === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-auto min-h-[72px] w-full rounded-xl border-border/60 bg-background px-4 py-4 shadow-none hover:border-border focus:ring-0">
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
          <SelectItem key={app.id} value={app.id.toString()}>
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
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>
    </Link>
  );
}

function SecurityNotice() {
  const t = useTranslations('DashPage');
  const [expanded, setExpanded] = useState(false);

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
        {expanded && (
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{t("dataSecurityDetail1")}</p>
            <p>{t("dataSecurityDetail2")}</p>
            <p>{t("dataSecurityDetail3")}</p>
            <p>{t("dataSecurityDetail4")}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 text-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("viewDetailedTerms")}
          {expanded ? (
            <IconChevronUp className="h-5 w-5" />
          ) : (
            <IconChevronDown className="h-5 w-5" />
          )}
        </button>
      </CardContent>
    </Card>
  );
}

export default function DashPage() {
  const t = useTranslations('DashPage');
  const { layout } = useLayout();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourceId, setSourceId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogLine[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const userData = storage.get('user');
    if (userData) {
      try {
        const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user info:", error);
      }
    }
    fetchAppsStatus();
  }, []);

  const activeApps = useMemo(() => apps.filter((a) => a.is_active), [apps]);

  const stats = useMemo(() => {
    const platformNames = [...new Set(activeApps.map((a) => getPlatformDisplayName(a.source_type)))].join(' · ');
    const totalSyncs = activeApps.reduce((sum, a) => sum + (a.total_count || 0), 0);
    const lastSyncDate = activeApps.reduce<Date | null>((latest, app) => {
      if (!app.last_synced_at) return latest;
      const date = new Date(app.last_synced_at);
      return !latest || date > latest ? date : latest;
    }, null);

    return {
      connectedCount: activeApps.length,
      platformNames: platformNames || '—',
      totalSyncs,
      lastSyncDate: lastSyncDate ? dayjs(lastSyncDate).format('MM-DD') : '—',
      lastSyncTime: lastSyncDate ? dayjs(lastSyncDate).format('HH:mm') : '—',
    };
  }, [activeApps]);

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
      if (active.length > 0) {
        setSourceId(active[0].id.toString());
      }
      if (active.length > 1) {
        setTargetId(active[1].id.toString());
      }
    } catch (err: unknown) {
      console.error("Fetch status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const pushTerminalLog = (text: string, level: LogLine["level"] = "info") => {
    const newLine: LogLine = {
      time: new Date().toLocaleTimeString(),
      text,
      level,
    };
    setTerminalLogs((prev) => [...prev, newLine]);
  };

  const handleGlobalSync = async () => {
    if (isSyncing || !sourceId || !targetId) {
      if (!isSyncing && (!sourceId || !targetId)) {
        toast.error(t("selectSourceAndTarget"));
      }
      return;
    }

    setIsSyncing(true);
    setSyncStatus("syncing");
    setTerminalLogs([]);
    setIsTerminalOpen(true);

    pushTerminalLog("🔧 开始调用同步任务...", "info");
    pushTerminalLog(`Source ID: ${sourceId} | Target ID: ${targetId}`, "info");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = storage.get('accessToken');
      await fetchEventSource('/api/v1/base/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
          count: 10
        }),
        signal: controller.signal,

        onopen(response) {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            pushTerminalLog("🛰️ Pipeline handshake complete. Data streaming...", "success");
          } else {
            pushTerminalLog(`❌ Pipeline rejected connection. Status: ${response.status}`, "error");
            setSyncStatus("error");
          }
          return Promise.resolve();
        },

        onmessage(msg) {
          if (msg.data === '[DONE]') {
            pushTerminalLog("🎉 Synchronization routine exited with code 0.", "success");
            setSyncStatus("done");
            setIsSyncing(false);
            controller.abort();
            toast.success("任务完成！");
            return;
          }

          try {
            const payload = JSON.parse(msg.data);
            pushTerminalLog(payload.message, payload.level || "info");
          } catch {
            pushTerminalLog(msg.data, "info");
          }
        },

        onclose() {
          pushTerminalLog("🔒 Server pipeline link channel closed.", "warn");
          setSyncStatus("done");
          setIsSyncing(false);
        },

        onerror(err) {
          pushTerminalLog(`🚨 Interrupted fatal error: ${err.message || err}`, "error");
          setSyncStatus("error");
          setIsSyncing(false);
          throw err;
        }
      });
    } catch {
      console.log("SSE execution pipeline final clear.");
    }
  };

  const handleCloseTerminal = () => {
    if (syncStatus === "syncing" && abortControllerRef.current) {
      abortControllerRef.current.abort();
      pushTerminalLog("🛑 Sync pipeline aborted by manual terminal kill signal.", "error");
    }
    setIsTerminalOpen(false);
    setIsSyncing(false);
    setSyncStatus("idle");
  };

  return (
    <div className={cn(
      "mx-auto flex flex-1 flex-col gap-6 bg-background p-6 text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* Welcome */}
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("welcomeBack", { name: user?.username || '...' })}
          </h1>
          <p className="text-muted-foreground">{t("manageSync")}</p>
        </div>
        <Button variant="outline" size="lg" className="h-10 shrink-0 rounded-full px-4 text-sm" asChild>
          <Link href="/dash/profile">
            <IconUser className="h-5 w-5" />
            {t("userSettings")}
          </Link>
        </Button>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          subtext={t("allSuccessful")}
          icon={IconRefresh}
          href="/dash/activities"
        />
        <StatCard
          title={t("lastSync")}
          value={loading ? '—' : stats.lastSyncDate}
          subtext={stats.lastSyncTime}
          icon={IconClock}
          href="/dash/activities"
        />
      </div>

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
            </div>
            <Button
              size="lg"
              className="h-12 rounded-full px-8 text-lg shadow-sm"
              onClick={handleGlobalSync}
              disabled={isSyncing || !sourceId || !targetId}
            >
              <IconRefresh className={cn("h-5 w-5", isSyncing && "animate-spin")} />
              {isSyncing ? t("syncing") : t("oneclickSync")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SyncLogs limit={3} />
        </div>
        <SecurityNotice />
      </div>

      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={handleCloseTerminal}
        logs={terminalLogs}
        status={syncStatus}
      />
    </div>
  );
}
