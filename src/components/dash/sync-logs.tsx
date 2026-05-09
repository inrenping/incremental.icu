
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconHistory } from "@tabler/icons-react";
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

export function SyncLogs() {
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
          const formattedLogs: Log[] = data.data.map((log: any) => ({
            id: log.id,
            type: log.status === 'success' ? 'success' : 'error', // Map backend 'status' to 'success' or 'error'
            title: log.action, // Assuming 'action' field for the log message/title
            time: dayjs(log.created_at).format('YYYY-MM-DD HH:mm'), // Format timestamp
          }));
          setLogs(formattedLogs);
        } else {
          throw new Error("Invalid data format received from the server.");
        }
      } catch (err: any) {
        setError(err.message || t("fetchLogsError")); // Use translation for generic error
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [t]); // Add t to dependency array as it's used inside useEffect

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <IconHistory className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{t("recentLogs")}</h2>
      </div>
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground"></div>
            ) : error ? (
              <div className="p-8 text-center text-destructive"></div>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">
                      {log.op_desc}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">没数据</div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}