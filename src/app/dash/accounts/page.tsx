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
  IconCircleCheckFilled,
  IconAlertCircleFilled,
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

export default function AccountsPage() {
  const { layout } = useLayout();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAppsStatus();
  }, []);

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
      toast.error("获取应用状态失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAuth = async (platform: string) => {
    setLoading(true);
    try {
      if (platform.startsWith("garmin")) {
        const loginRes = await authFetch('/api/v1/garmin/login', { method: 'POST' });
        const loginData = await loginRes.json();

        if (loginData.status !== "success") {
          throw new Error(loginData.message || "获取账号信息失败");
        }

        const targetRegion = platform === 'garmin_cn' ? 'CN' : 'GLOBAL';
        const config = loginData.data.find((c: any) => c.platform === targetRegion);

        if (!config) {
          throw new Error("未找到对应的佳明账号配置");
        }

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

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <h2 className="font-semibold text-lg">关联账号管理</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
