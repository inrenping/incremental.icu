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
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import dayjs from "dayjs";

interface Log {
  id: number;
  user_id: string | null;
  user_name: string | null;
  log_type: string;
  module_name: string | null;
  op_desc: string | null;
  req_url: string | null;
  req_method: string | null;
  req_params: any | null;
  ip_address: string | null;
  user_agent: string | null;
  duration_ms: number;
  created_at: string;
  resp_data: string | null;
}

export default function LogsPage() {
  const { layout } = useLayout();
  const t = useTranslations('DashPage');

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`/api/v1/log/syslog?page_size=${limit}&page_count=${page}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch logs (HTTP ${response.status})`);
      }
      const data = await response.json();
      if (data.status === 'success') {
        if (Array.isArray(data.data)) {
          setLogs(data.data);
          setTotal(data.total);
        } else if (data.data && typeof data.data === 'object') {
          setLogs(data.data.list || []);
          setTotal(data.total || 0);
        }
      } else {
        throw new Error("Invalid data format received from the server.");
      }
    } catch (err: any) {
      setError(err.message || t("fetchLogsError"));
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit]);

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Link href="/dash/logs" className="hover:text-primary transition-colors">
              <IconArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <h2 className="font-semibold"> 接口调用日志</h2>
          </div>
        </div>
        <div className="flex items-center justify-end px-2">
          <Button onClick={() => fetchLogs()} size="sm" variant="outline" className="gap-2">
            <IconSearch className="h-4 w-4" />
            查询
          </Button>
        </div>
        <div className="rounded-md border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模块</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>操作描述</TableHead>
                <TableHead>方法</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>请求参数</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>响应数据</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-destructive">{error}</TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" className=" uppercase font-bold px-1.5 py-0 shrink-0">
                        {log.module_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className=" uppercase font-bold px-1.5 py-0 shrink-0">
                        {log.log_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground  truncate" title={log.op_desc || ''}>
                      {log.op_desc}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{log.req_method}</Badge>
                    </TableCell>
                    <TableCell className="max-w-2xl truncate font-mono" title={log.req_url || ''}>
                      {log.req_url}
                    </TableCell>
                    <TableCell className="max-w-xl truncate font-mono" title={typeof log.req_params === 'object' ? JSON.stringify(log.req_params) : String(log.req_params)}>
                      {typeof log.req_params === 'object' ? JSON.stringify(log.req_params) : String(log.req_params)}
                    </TableCell>
                    <TableCell className="  text-muted-foreground font-mono">
                      {dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono text-right text-muted-foreground">
                      {log.duration_ms}
                    </TableCell>
                    <TableCell className="max-w-2xl truncate font-mono" title={log.resp_data || ''}>
                      {log.resp_data}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">没数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!loading && total > 0 && (
            <Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={(v) => { setLimit(Number(v)); setPage(1); }} />
          )}
        </div>
      </section >
    </div >
  );
}