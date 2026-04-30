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
    {
      id: "garmin",
      label: "Garmin Connect",
      description: "连接您的 Garmin Connect 账号",
      isConnected: true,
      email: "inrenping@gmail.com",
      addedAt: "2026-04-26 11:35:07",
      status: "验证通过",
      region: "国际区",
      lastUpdate: "2026-04-29 11:51:20",
      count: 156
    },
    {
      id: "garmin_cn",
      label: "Garmin Connect (CN)",
      description: "连接您的 Garmin Connect (中国) 账号",
      isConnected: true,
      email: null,
      addedAt: "2026-04-26 13:02:50",
      status: "验证通过",
      region: "中国区",
      lastUpdate: "2026-04-27 08:14:25",
      count: 89
    },
    {
      id: "coros",
      label: "Coros",
      description: "连接您的 Coros 账号",
      isConnected: false,
      count: 0
    }
  ];

  const logs = [
    { id: 1, type: 'success', title: '同步 12 条新活动到佳明国际版', time: '今天 14:22' },
    { id: 2, type: 'success', title: '同步 5 条新活动到佳明国际版', time: '今天 13:00' },
    { id: 3, type: 'error', title: '高驰授权过期，请重新连接', time: '昨天 09:15' },
  ];

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-gray-50 min-h-screen text-sm transition-all duration-300",
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
            <Card key={app.id} className="relative">
              {app.count !== undefined && app.count > 0 && (
                <div className="absolute -top-3 -right-3 z-20">
                  <Badge className="rounded-full px-2.5 py-0 h-7 min-w-7 flex items-center justify-center text-sm font-bold border-2 border-background shadow-lg bg-primary text-primary-foreground">
                    {app.count}
                  </Badge>
                </div>
              )}
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
                      {app.status || '已连接'}
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
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {app.description}
                </p>
                {app.isConnected ? (
                  <>
                    <div className="space-y-1.5 border-t pt-3">
                      {app.email && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">账号</span>
                          <span className="font-medium truncate">{app.email}</span>
                        </div>
                      )}
                      {app.region && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">地区</span>
                          <span className="font-medium">{app.region}</span>
                        </div>
                      )}
                      {app.addedAt && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">添加关联时间</span>
                          <span className="font-medium font-mono">{app.addedAt}</span>
                        </div>
                      )}
                      {app.lastUpdate && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">最后同步时间</span>
                          <span className="font-medium font-mono">{app.lastUpdate}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-muted-foreground">重新连接</Button>
                  </>
                ) : (
                  <>
                    <div className="h-8" />
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
