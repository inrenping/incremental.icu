'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import CryptoJS from 'crypto-js';
import {
  IconRefresh,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconHistory,
  IconDeviceWatch
} from "@tabler/icons-react";
import { AppConnectionDialog } from "@/components/dash/connection-dialog";

interface AppConfig {
  id: string;
  label: string;
  description: string;
  isConnected: boolean;
  email?: string | null;
  addedAt?: string;
  status?: string;
  region?: string;
  lastUpdate?: string;
  total_count?: number;
}

export default function DashPage() {
  const { layout } = useLayout();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchAppsStatus();
  }, []);

  // 参考用户提供的请求模式：初始化获取应用连接状态
  const fetchAppsStatus = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/settings/getAppsConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data = await response.json();
      setApps(data);
    } catch (err: any) {
      console.error("Fetch status error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 刷新认证处理函数
  const handleRefreshAuth = async (platform: string) => {
    setLoading(true);
    try {
      if (platform.startsWith("garmin")) {
        // 1. 获取已保存的凭据
        const loginRes = await authFetch('/api/v1/garmin/login', { method: 'POST' });
        const loginData = await loginRes.json();

        if (loginData.status !== "success") {
          throw new Error(loginData.message || "获取账号信息失败");
        }

        // 匹配对应的平台配置
        const targetRegion = platform === 'garmin_cn' ? 'CN' : 'GLOBAL';
        const config = loginData.data.find((c: any) => c.platform === targetRegion);

        if (!config) {
          throw new Error("未找到对应的佳明账号配置");
        }

        // 2. 调用前端登录校验流程
        const key = process.env.NEXT_PUBLIC_KEY?.toString() || '';
        const decryptedPassword = CryptoJS.AES.decrypt(config.password, key).toString(CryptoJS.enc.Utf8);

        const verifyRes = await fetch('/api/garmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: platform === 'garmin_cn' ? 'cn' : null,
            username: config.username,
            password: decryptedPassword
          }),
        });

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json().catch(() => ({}));
          throw new Error(errorData.error || "认证校验失败");
        }

        // 3. 保存验证后的配置（包含 Session 等信息）
        const verifyData = await verifyRes.json();
        const saveRes = await authFetch('/api/v1/garmin/saveConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...verifyData,
            username: config.username,
            password: config.password
          }),
        });

        if (!saveRes.ok) {
          throw new Error("保存认证信息失败");
        }

        toast.success("认证刷新成功");
        fetchAppsStatus();
      } else if (platform === "coros") {
        const response = await authFetch('/api/v1/coros/relogin', {
          method: 'POST'
        });
        const result = await response.json();
        if (result.status === "success") {
          toast.success("认证刷新成功");
          fetchAppsStatus();
        } else {
          toast.error(result.message || "刷新失败");
        }
      } else {
        toast.error("该平台暂不支持刷新认证");
      }
    } catch (err: any) {
      console.error("Refresh auth error:", err);
      toast.error(err.message || "请求刷新失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 一键同步处理函数
  const handleGlobalSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await authFetch('/api/v1/settings/syncNewActivities?total_count=10', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.status === "success") {
        toast.success("同步已完成");
        fetchAppsStatus();
      } else {
        toast.error(result.message || "同步失败");
      }
    } catch (err) {
      console.error("Global sync error:", err);
      toast.error("请求同步失败，请稍后重试");
    } finally {
      setIsSyncing(false);
    }
  };

  const logs = [
    { id: 1, type: 'success', title: '同步 12 条新活动到佳明国际版', time: '今天 14:22' },
  ];

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* 核心操作区 */}
      <section className="text-center space-y-6 py-8 bg-muted/30 rounded-3xl border border-dashed border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1">
            <p className="text-muted-foreground">连接两个以上平台，点击一键同步后，将自动同步上传最新的 10 条运动数据，会自动过滤掉时间和距离相同的重复记录。</p>

          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="h-14 px-8 text-lg gap-2 rounded-full shadow-lg hover:shadow-xl transition-all"
            onClick={handleGlobalSync}
            disabled={isSyncing}
          >
            <IconRefresh className={cn("h-6 w-6", isSyncing && "animate-spin")} />
            {isSyncing ? "同步中..." : "一键同步"}
          </Button>
        </div>
      </section>

      <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
        <div className="space-y-4 text-foreground">
          <p>
            为实现运动数据的同步，本工具需在服务端登录并保存您的账号及密码信息。我们将严格遵循业界通用标准对您的凭证进行加密存储，保障您的信息安全。
          </p>
          <p>请您知悉并同意以下事项：</p>
          <p>继续使用本工具，即表示您已阅读并同意我们的「使用条款」。</p>
          <p>受限于品牌登录机制，使用本工具期间，请勿在其他终端同时登录您的账号，以免导致授权凭证失效。</p>
          <p>我们将严格加密存储您的信息，但无法完全排除网络环境中的潜在不确定性。继续使用即代表您已充分知悉并理解上述情况，授权我们为您进行数据的同步与管理。</p>
        </div>
      </div>

      {/* 平台卡片 */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="relative">
              {app.total_count !== undefined && app.total_count > 0 && (
                <Link href={`/dash/activies?platform=${app.id}`} className="absolute -top-3 -right-3 z-20 hover:scale-110 transition-transform">
                  <Badge className="rounded-full px-2.5 py-0 h-7 min-w-7 flex items-center justify-center text-sm font-bold border-2 border-background shadow-lg bg-primary text-primary-foreground cursor-pointer">
                    {app.total_count}
                  </Badge>
                </Link>
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
                    <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-500 dark:border-amber-900/50 gap-1">
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
                          <span className="font-medium font-mono">{dayjs(app.addedAt).format('YYYY-MM-DD HH:mm')}</span>
                        </div>
                      )}
                      {app.lastUpdate && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">最后同步时间</span>
                          <span className="font-medium font-mono">{dayjs(app.lastUpdate).format('YYYY-MM-DD HH:mm')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("text-muted-foreground", "flex-1")}
                        onClick={() => {
                          setCurrentApp(app);
                          setOpen(true);
                        }}
                      >
                        重新连接
                      </Button>
                      {(
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-muted-foreground gap-1"
                          onClick={() => handleRefreshAuth(app.id)}
                        >刷新认证</Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-8" />
                    <Button size="sm" className="w-full"
                      onClick={() => {
                        setCurrentApp(app);
                        setOpen(true);
                      }}
                    >连接账户</Button>
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
          <CardContent className="p-0 overflow-hidden">
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

      <AppConnectionDialog
        key={currentApp?.id}
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) setCurrentApp(null);
        }}
        app={currentApp}
        onSuccess={fetchAppsStatus}
      />
    </div>
  );
}
