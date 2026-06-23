'use client';

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
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
import Link from "next/link";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authFetch } from "@/lib/api";
import dayjs from "dayjs";

interface TaskResult {
  id: number;
  task_id: number;
  status: string;
  message: string | null;
  created_at: string;
}

interface TaskItem {
  id: number;
  user_id: number;
  connect_source_id: number;
  connect_target_id: number;
  hour: number;
  is_active: boolean;
  created_at: string;
}

interface AppConfig {
  id: number;
  account: string;
  source_type: string;
  region: string;
  is_active: boolean;
}

export default function TaskResultsPage() {
  const { layout } = useLayout();
  const params = useParams();
  const taskId = params.taskId as string;

  const [results, setResults] = useState<TaskResult[]>([]);
  const [task, setTask] = useState<TaskItem | null>(null);
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchResults = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`/api/v1/task/${taskId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `请求失败 (HTTP ${response.status})`);
      }
      const result = await response.json();
      if (result.status === 'success') {
        const data = result.data || [];
        setResults(data);
        setTotal(data.length);
      } else {
        throw new Error(result.message || '获取数据失败');
      }
    } catch (err: any) {
      setError(err.message || '获取执行记录失败');
      console.error("Error fetching task results:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskInfo = async () => {
    if (!taskId) return;
    try {
      const response = await authFetch('/api/v1/task');
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          const found = (result.data || []).find((t: TaskItem) => t.id === parseInt(taskId));
          if (found) setTask(found);
        }
      }
    } catch (err) {
      console.error("Fetch task info error:", err);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      }
    } catch (err) {
      console.error("Fetch apps error:", err);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchResults();
      fetchTaskInfo();
      fetchApps();
    }
  }, [taskId]);

  const getAppDisplay = (id: number) => {
    const app = apps.find(a => a.id === id);
    if (!app) return `ID: ${id}`;
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1.5 border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            成功
          </Badge>
        );
      case 'error':
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 gap-1.5 border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            失败
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1.5">
            {status || '未知'}
          </Badge>
        );
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Link href="/dash/task" className="hover:text-primary transition-colors">
              <IconArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <h2 className="font-semibold">任务执行记录 #{taskId}</h2>
          </div>
          <Button onClick={() => fetchResults()} size="sm" variant="outline" className="gap-2">
            <IconRefresh className="h-4 w-4" />
            刷新
          </Button>
        </div>

        {/* 任务信息摘要 */}
        {task && (
          <div className="px-2 py-3 bg-background rounded-md border text-sm flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
            <span>
              账号 1：<span className="font-medium text-foreground">{getAppDisplay(task.connect_source_id)}</span>
            </span>
            <span>
              账号 2：<span className="font-medium text-foreground">{getAppDisplay(task.connect_target_id)}</span>
            </span>
            <span>
              执行时间：<span className="font-medium text-foreground">每天 {task.hour} 点</span>
            </span>
            <span>
              状态：
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1 gap-1",
                  task.is_active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                    : "bg-gray-50 text-gray-500 dark:bg-gray-950/30 dark:text-gray-400 border-gray-200"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  task.is_active ? "bg-emerald-500" : "bg-gray-400"
                )} />
                {task.is_active ? "启用" : "停用"}
              </Badge>
            </span>
          </div>
        )}

        <div className="rounded-md border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-24">状态</TableHead>
                <TableHead>消息</TableHead>
                <TableHead className="w-44 text-right">执行时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-destructive">{error}</TableCell>
                </TableRow>
              ) : results.length > 0 ? (
                results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-muted-foreground">{r.id}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-foreground max-w-xl truncate" title={r.message || ''}>
                      {r.message || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                      {dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">暂无执行记录</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!loading && total > 0 && (
            <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(Number(v)); setPage(1); }} />
          )}
        </div>
      </section>
    </div>
  );
}
