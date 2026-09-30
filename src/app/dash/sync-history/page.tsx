'use client';

import { useLayout } from "@/hooks/use-layout";
import { cn, formatPlatformAccount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/dash/pagination";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  IconHistory,
  IconArrowsRight,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconAlertTriangle,
  IconCopy,
  IconRefresh,
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: "成功", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    partial: { label: "部分成功", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    failed: { label: "失败", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    no_diff: { label: "无差异", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
    error: { label: "异常", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
  return (
    <Badge variant="outline" className={`shrink-0 px-1.5 py-0 text-[10px] font-bold ${s.cls}`}>
      {s.label}
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

export default function SyncHistoryPage() {
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
        throw new Error(errorData.message || `获取同步记录失败 (HTTP ${response.status})`);
      }
      const data = await response.json();
      if (data.status === "success" && Array.isArray(data.data)) {
        setRuns(data.data);
        setTotal(data.total ?? data.data.length);
      } else {
        throw new Error("服务器返回的数据格式异常");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "获取同步记录失败");
      console.error("Error fetching sync runs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

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
      // 详情加载失败不阻断列表展示
    } finally {
      setLoadingItems(null);
    }
  };

  const summary = (r: SyncRun) => {
    const parts: string[] = [];
    if (r.uploaded_count > 0) parts.push(`成功 ${r.uploaded_count}`);
    if (r.duplicated_count > 0) parts.push(`已存在 ${r.duplicated_count}`);
    if (r.failed_count > 0) parts.push(`失败 ${r.failed_count}`);
    return parts.length ? parts.join(" · ") : "无同步项";
  };

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <IconHistory className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">同步历史</h2>
          </div>
          <Link href="/dash" className="text-blue-500 hover:text-blue-600 hover:underline transition-colors">
            返回仪表盘
          </Link>
        </div>
        <div className="flex items-center justify-end px-2">
          <Button onClick={() => fetchRuns()} size="sm" variant="outline" className="gap-2">
            <IconRefresh className="h-4 w-4" />
            刷新
          </Button>
        </div>
        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>同步路径</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>同步统计</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>开始时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-destructive">{error}</TableCell>
                </TableRow>
              ) : runs.length > 0 ? (
                runs.map((run) => (
                  <FragmentRow
                    key={run.id}
                    run={run}
                    open={openId === run.id}
                    summary={summary(run)}
                    items={itemsCache[run.id] ?? []}
                    loadingItems={loadingItems === run.id}
                    onToggle={() => toggleExpand(run.id)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">暂无同步记录</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!loading && total > 0 && (
            <Pagination
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(v) => { setLimit(Number(v)); setPage(1); }}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function FragmentRow({
  run,
  open,
  summary,
  items,
  loadingItems,
  onToggle,
}: {
  run: SyncRun;
  open: boolean;
  summary: string;
  items: SyncRunItem[];
  loadingItems: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("DashPage");
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={onToggle}
      >
        <TableCell>
          {open ? (
            <IconChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <IconChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {formatPlatformAccount(t, run.source_platform, run.source_account)}
            </span>
            <IconArrowsRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">
              {formatPlatformAccount(t, run.target_platform, run.target_account)}
            </span>
          </div>
        </TableCell>
        <TableCell><StatusBadge status={run.status} /></TableCell>
        <TableCell className="text-muted-foreground">
          同步 {run.diff_count} 条 · {summary}
        </TableCell>
        <TableCell className="text-muted-foreground font-mono">
          {formatDuration(run.duration_ms)}
        </TableCell>
        <TableCell className="text-muted-foreground font-mono">
          {run.started_at ? dayjs(run.started_at).format("YYYY-MM-DD HH:mm") : "-"}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="p-0">
            <div className="px-10 py-3">
              {loadingItems ? (
                <div className="py-3 text-center text-xs text-muted-foreground">加载明细…</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {items.map((item) => (
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
                          <span className="text-[11px] text-slate-400">已存在</span>
                        ) : (
                          <span className="text-[11px] text-emerald-600">已同步</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-3 text-center text-xs text-muted-foreground">本次无明细</div>
                  )}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
