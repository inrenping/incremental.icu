import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronDown,
  IconChevronRight,
  IconArrowsRight,
  IconClock,
  IconCircleCheck,
  IconAlertTriangle,
  IconCopy,
} from "@tabler/icons-react";
import { authFetch } from "@/lib/api";
import { formatPlatformAccount } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
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

interface SyncRunsProps {
  limit?: number;
}

// 只保留配色，标签走 SyncRuns 命名空间
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
  const t = useTranslations("SyncRuns");
  const labelKey = STATUS_LABEL_KEY[status];
  return (
    <Badge
      variant="outline"
      className={`shrink-0 px-1.5 py-0 text-[10px] font-bold ${STATUS_CLS[status] ?? "bg-slate-500/10 text-slate-600 border-slate-500/20"}`}
    >
      {labelKey ? t(labelKey) : status}
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

export function SyncRuns({ limit = 10 }: SyncRunsProps) {
  const t = useTranslations("DashPage");
  const tRuns = useTranslations("SyncRuns");
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<number, SyncRunItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<number | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`/api/v1/base/syncRuns?limit=${limit}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || tRuns("loadFailedHttp", { status: response.status }));
      }
      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        setRuns(data.data);
        setItemsCache({});
      } else {
        throw new Error(tRuns("badPayload"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tRuns("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [limit, tRuns]);

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
      // A failure to load details must not break the list.
    } finally {
      setLoadingItems(null);
    }
  };

  const summary = (r: SyncRun) => {
    const parts: string[] = [];
    if (r.uploaded_count > 0) parts.push(tRuns("statUploaded", { count: r.uploaded_count }));
    if (r.duplicated_count > 0) parts.push(tRuns("statDuplicated", { count: r.duplicated_count }));
    if (r.failed_count > 0) parts.push(tRuns("statFailed", { count: r.failed_count }));
    return parts.length ? parts.join(" · ") : tRuns("statNone");
  };

  return (
    <Card className="h-full gap-0 py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{tRuns("title")}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dash/sync-history"
              className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("viewMore")}
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{tRuns("loading")}</div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{tRuns("empty")}</div>
          ) : (
            runs.map((run) => (
              <div key={run.id}>
                <button
                  onClick={() => toggleExpand(run.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {openId === run.id ? (
                      <IconChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <IconChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {formatPlatformAccount(t, run.source_platform, run.source_account)}
                      </span>
                      <IconArrowsRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">
                        {formatPlatformAccount(t, run.target_platform, run.target_account)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {tRuns("headline", { count: run.diff_count, summary: summary(run) })}
                    </span>
                    <StatusBadge status={run.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {run.started_at ? dayjs(run.started_at).format("MM-DD HH:mm") : "-"}
                    </span>
                  </div>
                </button>
                {openId === run.id && (
                  <div className="bg-muted/20 px-5 py-2">
                    {loadingItems === run.id ? (
                      <div className="py-3 text-center text-xs text-muted-foreground">{tRuns("loadingItems")}</div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {(itemsCache[run.id] ?? []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
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
                                <span className="max-w-[200px] truncate text-[11px] text-red-500">
                                  {item.message}
                                </span>
                              ) : item.status === "duplicate" ? (
                                <span className="text-[11px] text-slate-400">{tRuns("itemDuplicated")}</span>
                              ) : (
                                <span className="text-[11px] text-emerald-600">{tRuns("itemUploaded")}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {(itemsCache[run.id] ?? []).length === 0 && (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            {tRuns("noItems")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
