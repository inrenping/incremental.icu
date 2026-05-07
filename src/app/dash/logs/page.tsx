'use client';

import { Card, CardContent } from "@/components/ui/card";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { IconHistory } from "@tabler/icons-react";

export default function LogsPage() {
  const { layout } = useLayout();

  // 这里使用了 dash/page.tsx 中的静态模拟数据
  const logs = [
    { id: 1, type: 'success', title: '同步 12 条新活动到佳明国际版', time: '今天 14:22' },
  ];

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <h2 className="font-semibold text-lg">近期同步记录</h2>
        </div>
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="divide-y divide-border">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-destructive ring-4 ring-destructive/10'}`} />
                      <span className={`text-sm ${log.type === 'error' ? 'text-destructive font-medium' : 'text-foreground'}`}>
                        {log.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">暂无同步记录</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}