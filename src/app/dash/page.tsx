'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import {
  IconRefresh,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconClock,
  IconHistory,
  IconDeviceWatch
} from "@tabler/icons-react";

export default function DashPage() {
  const { layout } = useLayout();
  // 模拟数据，实际开发时可从 API 获取
  const apps = [
    { id: 'garmin', label: '佳明国际版', isConnected: true, activities: 156, status: '已连接' },
    { id: 'garmin_cn', label: '佳明中国版', isConnected: false, activities: 0, status: '未连接' },
    { id: 'coros', label: '高驰', isConnected: true, activities: 89, status: '已连接' },
  ];

  const logs = [
    { id: 1, type: 'success', title: '同步 12 条新活动到佳明国际版', time: '今天 14:22' },
    { id: 2, type: 'success', title: '同步 5 条新活动到佳明国际版', time: '今天 13:00' },
    { id: 3, type: 'error', title: '高驰授权过期，请重新连接', time: '昨天 09:15' },
  ];

  return (
    <div className={cn(
      "p-6 mx-auto bg-gray-50 min-h-screen text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-6xl" : "max-w-none w-full"
    )}>
      {/* 核心操作区 */}
      <section className="text-center space-y-6 py-8 bg-muted/30 rounded-3xl border border-dashed border-border">
        <div className="space-y-2">
          <p className="text-muted-foreground">连接 2 个以上平台后，点击按钮即可一键同步</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button size="lg" className="h-14 px-8 text-lg gap-2 rounded-full shadow-lg hover:shadow-xl transition-all">
            <IconRefresh className="h-6 w-6" />
            一键同步
          </Button>
        </div>
      </section>

      {/* 平台卡片 */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconDeviceWatch className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{app.label}</CardTitle>
                  </div>
                  {app.isConnected ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 border-emerald-200">
                      <IconCircleCheckFilled className="h-3 w-3" />
                      已连接
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 gap-1">
                      <IconAlertCircleFilled className="h-3 w-3" />
                      未连接
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.isConnected ? (
                  <>
                    <div className="text-2xl font-bold">{app.activities} <span className="text-sm font-normal text-muted-foreground">条活动</span></div>
                    <Button variant="outline" size="sm" className="w-full text-muted-foreground">重新连接</Button>
                  </>
                ) : (
                  <>
                    <div className="h-8" /> {/* 占位保持高度一致 */}
                    <Button size="sm" className="w-full">连接账户</Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 同步记录 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <IconHistory className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">近期同步记录</h2>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : 'bg-destructive ring-4 ring-destructive/10'}`} />
                    <span className={`text-sm ${log.type === 'error' ? 'text-destructive font-medium' : 'text-foreground'}`}>
                      {log.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
