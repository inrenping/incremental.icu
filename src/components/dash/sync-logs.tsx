import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconClock, IconCircleCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import dayjs from "dayjs";

interface Log {
  id: number;
  log_type: string;
  module_name: string;
  op_desc: string;
  created_at: string;
}

interface SyncLogsProps {
  limit?: number;
}

export function SyncLogs({ limit }: SyncLogsProps) {
  const t = useTranslations('DashPage');

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch('/api/v1/log');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch logs (HTTP ${response.status})`);
        }
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          setLogs(data.data);
        } else {
          throw new Error("Invalid data format received from the server.");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("fetchLogsError");
        setError(message);
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [t]);

  const displayLogs = limit ? logs.slice(0, limit) : logs;

  return (
    <Card className="h-full gap-0 py-0 shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("recentLogs")}</CardTitle>
          </div>
          <Link
            href="/dash/logs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("viewMore")}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground" />
          ) : error ? (
            <div className="p-8 text-center text-destructive" />
          ) : displayLogs.length > 0 ? (
            displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <IconCircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <Badge
                    variant="outline"
                    className="shrink-0 px-1.5 py-0 text-[10px] font-bold uppercase"
                  >
                    {log.module_name}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="shrink-0 px-1.5 py-0 text-[10px] font-bold uppercase"
                  >
                    {log.log_type}
                  </Badge>
                  <span className="truncate text-sm text-foreground">
                    {log.op_desc}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">{t("noLogData")}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
