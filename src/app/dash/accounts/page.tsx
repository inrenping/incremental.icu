'use client';

import { useState, useEffect } from "react";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import { AppConnectionDialog } from "@/components/dash/connection-dialog";
import { AppCard } from "@/components/dash/app-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface AppConfig {
  id: number;
  user_id: number;
  guid: string | null;
  account: string;
  encrypted_password?: string;
  source_type: 'garmin' | 'garmin_cn' | 'coros' | string;
  region: string;
  is_active: boolean;
  master: boolean;
  access_token: string | null;
  access_token_expires_at: string | null;
  refresh_token: string | null;
  refresh_token_expires_at: string | null;
  oauth_token: string | null;
  oauth_token_secret: string | null;
  secret_string: string | null;
  total_count: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export default function AccountsPage() {
  const t = useTranslations('DashPage')
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
      const response = await authFetch('/api/v1/base/getConnectConfigs');
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

  // 刷新认证处理函数
  const handleRefreshAuth = async (id: number) => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/v1/base/relogin?connect_id=${id}`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.status === "success") {
        toast.success("认证刷新成功");
        fetchAppsStatus();
      } else {
        toast.error(result.message || "刷新失败");
      }

    } catch (err: any) {
      console.error("Refresh auth error:", err);
      toast.error(err.message || t("refreshFailedTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 py-4 md:gap-6 md:py-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold">我的应用程序</h1>
          <Button
            onClick={() => {
              setCurrentApp({ source_type: 'garmin_cn' });
              setOpen(true);
            }}
          >
            <IconPlus className="h-4 w-4 mr-2" />
            {t("connectAccount")}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">你已授权本站点访问你的应用数据。</p>
      </div>
      <section>
        <div className="grid grid-cols-1 gap-4">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onConnect={(selectedApp) => {
                setCurrentApp(selectedApp);
                setOpen(true);
              }}
              onRefresh={(id) => handleRefreshAuth(id)}
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
