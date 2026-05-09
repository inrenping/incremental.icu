'use client';

import { useState, useEffect } from "react";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import CryptoJS from 'crypto-js';
import { AppConnectionDialog } from "@/components/dash/connection-dialog";
import { AppCard } from "@/components/dash/app-card";

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

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onConnect={(selectedApp) => {
                setCurrentApp(selectedApp);
                setOpen(true);
              }}
              onRefresh={handleRefreshAuth}
            />
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
