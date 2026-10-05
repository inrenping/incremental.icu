'use client';

import { useLayout } from "@/hooks/use-layout";
import { cn, formatPlatformAccount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/dash/pagination";
import { useTranslations } from "next-intl";
import {
  IconHistory,
  IconArrowsRight,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconAlertTriangle,
  IconCopy,
  IconRefresh,
  IconBolt,
  IconDeviceWatch,
  IconCircleDot,
} from "@tabler/icons-react";
import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import dayjs from "dayjs";

interface SyncRun {
  id: number;
  source_platform: string;
  source_account: string;
  target_platform: string;
  target_account: string;
  window_size: number;
  diff_count: number;
  uploaded_count: number;
  duplicated_count: number;
  failed_count: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  task_id: number | null;
  trigger_mode?: string | null;
  device_name?: string | null;
}

interface SyncRunItem {
  id: number;
  activity_id: string;
  activity_name: string;
  sport_type_raw: string;
  start_time_local: string | null;
  distance_meters: number | null;
  filename: string;
  status: string;
  message: string | null;
  target_activity_id: string | null;
  synced_at: string | null;
}

// 只保留配色，标签走 SyncHistory 命名空间
const STATUS_CLS: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  no_diff: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  success: "statusSuccess",
  partial: "statusPartial",
  failed: "statusFailed",
  no_diff: "statusNoDiff",
  error: "statusError",
};

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("SyncHistory");
  const labelKey = STATUS_LABEL_KEY[status];
  return (
    <Badge
      variant="outline"
      className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status] ?? "bg-slate-500/10 text-slate-600 border-slate-500/20"}`}
    >
      {labelKey ? t(labelKey) : status}
    </Badge>
  );
}

function getStatusDotClass(status: string): string {
  const map: Record<string, string> = {
    success: "bg-emerald-500 border-emerald-200",
    partial: "bg-amber-500 border-amber-200",
    failed: "bg-red-500 border-red-200",
    no_diff: "bg-slate-500 border-slate-200",
    error: "bg-red-500 border-red-200",
  };
  return map[status] ?? "bg-slate-500 border-slate-200";
}

function TriggerBadge({ triggerMode, taskId }: { triggerMode?: string | null; taskId: number | null }) {
  const t = useTranslations("SyncHistory");
  const isTask = taskId != null || triggerMode === "scheduled" || triggerMode === "auto";
  if (isTask) {
    return (
      <Badge variant="outline" className="shrink-0 gap-1 px-2 py-0.5 text-[11px] font-semibold bg-purple-500/10 text-purple-600 border-purple-500/20">
        <IconBolt className="h-3 w-3" />
        {t("autoSync")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 gap-1 px-2 py-0.5 text-[11px] font-semibold bg-green-500/10 text-green-600 border-green-500/20">
      <IconBolt className="h-3 w-3" />
      {t("manualSync")}
    </Badge>
  );
}

function ItemStatusIcon({ status }: { status: string }) {
  if (status === "synced")
    return <IconCircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (status === "duplicate")
    return <IconCopy className="h-4 w-4 shrink-0 text-slate-400" />;
  return <IconAlertTriangle className="h-4 w-4 shrink-0 text-red-500" />;
}

function formatDistance(meters: number | null): string {
  if (meters == null) return "-";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} 公里`
    : `${Math.round(meters)} 米`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} 毫秒`;
  return `${(ms / 1000).toFixed(1)} 秒`;
}

function guessDeviceName(run: SyncRun): string {
  if (run.device_name) return run.device_name;
  const plat = (run.source_platform || "").toLowerCase();
  if (plat.includes("garmin")) return "Forerunner 255";
  if (plat.includes("coros")) return "Pace 3";
  return "运动手表";
}

export default function SyncHistoryPage() {
  const t = useTranslations("DashPage");
  const tHistory = useTranslations("SyncHistory");
  const { layout } = useLayout();

  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [openId, setOpenId] = useState<number | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<number, SyncRunItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<number | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(
        `/api/v1/base/syncRuns?limit=${limit}&page=${page}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || tHistory("loadFailedHttp", { status: response.status }));
      }
      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        setRuns(data.data);
        setTotal(data.total ?? data.data.length);
      } else {
        throw new Error(tHistory("badPayload"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tHistory("loadFailed"));
      console.error("Error fetching sync runs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, tHistory]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const toggleExpand = async (runId: number) => {
    if (openId === runId) {
      setOpenId(null);
      return;
    }
    setOpenId(runId);
    if (itemsCache[runId]) return;
    setLoadingItems(runId);
    try {
      const response = await authFetch(`/api/v1/base/syncRuns/${runId}/items`);
      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        setItemsCache((prev) => ({ ...prev, [runId]: data.data }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingItems(null);
    }
  };

  const summary = (r: SyncRun) => {
    const parts: string[] = [];
    if (r.uploaded_count > 0) parts.push(tHistory("statUploaded", { count: r.uploaded_count }));
    if (r.duplicated_count > 0) parts.push(tHistory("statDuplicated", { count: r.duplicated_count }));
    if (r.failed_count > 0) parts.push(tHistory("statFailed", { count: r.failed_count }));
    return parts.length ? parts.join(" · ") : tHistory("statNone");
  };

  return (
    <div className={cn(
      "flex flex-col gap-6 p-6 mx-auto bg-slate-50/60 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-5xl" : "w-full max-w-none"
    )}>
      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconHistory className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">{t("syncHistory")}</h2>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button onClick={() => fetchRuns()} size="sm" variant="outline" className="gap-2 rounded-full">
            <IconRefresh className="h-3.5 w-3.5" />
            {t("refresh")}
          </Button>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <div className="relative">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
          ) : error ? (
            <div className="py-20 text-center text-destructive">{error}</div>
          ) : runs.length > 0 ? (
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-1 bottom-1 w-px bg-gradient-to-b from-blue-200 via-blue-200/60 to-transparent dark:from-blue-800/50 dark:via-blue-800/20" />

              {runs.map((run, idx) => {
                const isLast = idx === runs.length - 1;
                return (
                  <div key={run.id} className={cn("relative mb-6", isLast && "mb-0")}>
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute -left-[17px] top-3 h-[14px] w-[14px] rounded-full border-2 bg-background shadow-sm ring-4 ring-background z-10",
                        getStatusDotClass(run.status)
                      )}
                    />

                    {/* Date header */}
                    <div className="mb-2 -ml-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {run.started_at
                          ? dayjs(run.started_at).format("M月DD日 HH:mm")
                          : "-"}
                      </span>
                      <TriggerBadge triggerMode={run.trigger_mode} taskId={run.task_id} />
                      <StatusBadge status={run.status} />
                    </div>

                    {/* Card */}
                    <div className="group rounded-2xl border bg-white/80 dark:bg-slate-900/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      {/* Card summary */}
                      <button
                        onClick={() => toggleExpand(run.id)}
                        className="w-full text-left px-5 py-4 flex flex-col gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Top row: source → target + stats summary */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {formatPlatformAccount(t, run.source_platform, run.source_account)}
                            </span>
                            <IconArrowsRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium text-foreground">
                              {formatPlatformAccount(t, run.target_platform, run.target_account)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {tHistory("diffCount", { count: run.diff_count })} · {summary(run)}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: description list from items */}
                        {(itemsCache[run.id] ?? []).length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400 pl-1">
                            {(itemsCache[run.id] ?? []).slice(0, openId === run.id ? undefined : 2).map((item) => (
                              <li key={item.id} className="truncate">
                                {tHistory("uploadedTo", {
                                  name: item.activity_name || item.activity_id,
                                  time: item.start_time_local
                                    ? dayjs(item.start_time_local).format("YYYY-MM-DD HH:mm")
                                    : "-",
                                })}
                              </li>
                            ))}
                            {(itemsCache[run.id] ?? []).length > 2 && openId !== run.id && (
                              <li className="text-slate-500 dark:text-slate-500">
                                {tHistory("moreItems", { count: (itemsCache[run.id] ?? []).length })}
                              </li>
                            )}
                          </ul>
                        ) : run.status === "no_diff" || run.diff_count === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-500 pl-1">
                            {tHistory("noItems")}
                          </p>
                        ) : null}

                        {/* Bottom row: device, duration, toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <IconDeviceWatch className="h-3.5 w-3.5" />
                              <span className="font-semibold tracking-wide text-slate-600 dark:text-slate-400">
                                {guessDeviceName(run).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IconArrowsRight className="h-3 w-3" />
                              <span>
                                {formatPlatformAccount(t, run.source_platform, run.source_account)} → {formatPlatformAccount(t, run.target_platform, run.target_account)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {t("duration")}: <span className="font-mono">{formatDuration(run.duration_ms)}</span>
                            </span>
                            <div className="flex items-center gap-1 text-slate-500 group-hover:text-foreground transition-colors">
                              {openId === run.id ? (
                                <>
                                  {t("hideDetails")}
                                  <IconChevronUp className="h-3.5 w-3.5" />
                                </>
                              ) : (
                                <>
                                  {t("showDetails")}
                                  <IconChevronDown className="h-3.5 w-3.5" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {openId === run.id && (
                        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 px-5 py-3">
                          {loadingItems === run.id ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">{t("loadingItems")}</div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(itemsCache[run.id] ?? []).map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <ItemStatusIcon status={item.status} />
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate text-sm text-foreground">
                                        {item.activity_name || item.activity_id}
                                      </span>
                                      <span className="truncate text-xs text-muted-foreground">
                                        {item.sport_type_raw || "-"}
                                        {item.start_time_local
                                          ? ` · ${dayjs(item.start_time_local).format("YYYY-MM-DD HH:mm")}`
                                          : ""}
                                        {` · ${formatDistance(item.distance_meters)}`}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                      {item.activity_id}
                                      {item.target_activity_id ? ` → ${item.target_activity_id}` : ""}
                                    </span>
                                    {item.status === "failed" ? (
                                      <span className="max-w-[220px] truncate text-[11px] text-red-500">
                                        {item.message}
                                      </span>
                                    ) : item.status === "duplicate" ? (
                                      <span className="text-[11px] text-slate-400">{tHistory("itemDuplicated")}</span>
                                    ) : (
                                      <span className="text-[11px] text-emerald-600">{tHistory("itemUploaded")}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(itemsCache[run.id] ?? []).length === 0 && (
                                <div className="py-3 text-center text-xs text-muted-foreground">{tHistory("noItems")}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
              <IconCircleDot className="h-8 w-8 opacity-40" />
              <span>{t("noSyncHistory")}</span>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="mt-8">
            <Pagination
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(v) => { setLimit(Number(v)); setPage(1); }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
