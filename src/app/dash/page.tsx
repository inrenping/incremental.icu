'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import CryptoJS from 'crypto-js';
import {
  IconRefresh,
  IconHistory,
  IconArrowsLeftRight,
  IconPlus,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppConnectionDialog } from "@/components/dash/connection-dialog";
import { AppCard } from "@/components/dash/app-card";
import { SyncLogs } from "@/components/dash/sync-logs";
import { Card } from "@/components/ui/card";

import { useTranslations } from "next-intl";

export interface AppConfig {
  id: string;
  platform: string;
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

const SUPPORTED_PLATFORMS = [
  { id: 'garmin_cn', label: 'Garmin CN', platform: 'garmin_cn', description: '佳明中国区账号' },
  { id: 'garmin', label: 'Garmin Global', platform: 'garmin', description: '佳明国际区账号' },
  { id: 'coros', label: 'Coros', platform: 'coros', description: '高驰账号' },
];

export default function DashPage() {
  const t = useTranslations('DashPage')
  const { layout } = useLayout();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourceId, setSourceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");

  useEffect(() => {
    fetchAppsStatus();
  }, []);

  // 参考用户提供的请求模式：初始化获取应用连接状态
  const fetchAppsStatus = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data: AppConfig[] = await response.json();
      // // 确保每个配置都有 platform 属性（如果后端没给，根据 id 前缀补全）
      // const formatted = data.map(item => ({
      //   ...item,
      //   platform: item.platform || (item.id.includes('garmin') ? (item.id.includes('cn') ? 'garmin_cn' : 'garmin') : 'coros')
      // }));
      // setApps(formatted);
    } catch (err: any) {
      console.error("Fetch status error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新认证
  const autoRefreshAuth = async () => {
    const platforms = ['garmin_cn', 'garmin', 'coros'];
    for (const platform of platforms) {
      const connectedApps = apps.filter(a => a.platform === platform && a.isConnected);
      for (const app of connectedApps) {
        // await handleRefreshAuth(app.id, app.platform).catch(() => { });
      }
    }
  };

  // 刷新认证处理函数
  const handleRefreshAuth = async (id: string, platform: string) => {
    setLoading(true);
    try {
      if (platform.startsWith("garmin")) {
        // 1. 获取对应 ID 的凭据
        const loginRes = await authFetch(`/api/v1/garmin/login?id=${id}`, { method: 'POST' });
        const loginData = await loginRes.json();

        if (loginData.status !== "success") {
          throw new Error(loginData.message || "获取账号信息失败");
        }
        // 匹配对应的平台配置
        // 如果后端支持多账号，此处应通过 id 精确匹配
        const config = loginData.data.find((c: any) => c.id === id);
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
            id,
            username: config.username,
            password: config.password
          }),
        });

        if (!saveRes.ok) {
          throw new Error("保存认证信息失败");
        }

        toast.success("GARMIN 认证刷新成功");
        fetchAppsStatus();
      } else if (platform.startsWith("coros")) {
        const response = await authFetch(`/api/v1/coros/relogin?id=${id}`, {
          method: 'POST'
        });
        const result = await response.json();
        if (result.status === "success") {
          toast.success("COROS 认证刷新成功");
          fetchAppsStatus();
        } else {
          toast.error(result.message || "刷新失败");
        }
      } else {
        toast.error(t("refreshNotSupported"));
      }
    } catch (err: any) {
      console.error("Refresh auth error:", err);
      toast.error(err.message || t("refreshFailedTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  // 一键同步处理函数
  const handleGlobalSync = async () => {
    if (isSyncing || !sourceId || !targetId) {
      if (!isSyncing && (!sourceId || !targetId)) {
        toast.error(t("selectSourceAndTarget"));
      }
      return;
    }
    setIsSyncing(true);
    try {
      // 同步前先尝试刷新认证，确保凭据有效
      await autoRefreshAuth();
      const response = await authFetch('/api/v1/settings/oneclickSyncActivities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceId, target: targetId })
      });

      const result = await response.json();

      if (result.status === "success") {
        toast.success(t("syncCompleted"));
        fetchAppsStatus();
      } else {
        toast.error(result.message || t("syncFailed"));
      }
    } catch (err) {
      console.error("Global sync error:", err);
      toast.error(t("syncFailedTryAgain"));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* 核心操作区 */}
      <section className="text-center space-y-6 py-8 bg-muted/30 rounded-3xl border border-dashed border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1">
            <p className="text-muted-foreground">{t("oneclickSyncDesc")}</p>

          </div>
        </div>

        <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-[2.5rem] w-full md:w-fit">
            {/* 数据源选择 */}
            <div className="flex items-center gap-2 bg-background rounded-4xl px-6 py-2 border border-border/50 shadow-sm  w-full text-left transition-all hover:border-primary/30">
              <div className="flex flex-col flex-1">
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="border-none shadow-none focus:ring-0 p-0 h-auto bg-transparent text-lg font-semibold">
                    <SelectValue placeholder={t("selectPlatform")} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 仅显示已连接的账号作为源/目标 */}
                    {apps.filter(a => a.isConnected).map(app => (
                      <SelectItem key={app.id} value={app.id} disabled={app.id === targetId}>
                        {app.label} {app.email ? `(${app.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 连接图标 */}
            <div className="bg-primary/5 p-2 rounded-full hidden md:block shrink-0">
              <IconArrowsLeftRight className="h-5 w-5 text-primary/60" />
            </div>

            {/* 目标平台选择 */}
            <div className="flex items-center gap-2 bg-background rounded-4xl px-6 py-2 border border-border/50 shadow-sm w-full text-left transition-all hover:border-primary/30">
              <div className="flex flex-col flex-1">
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="border-none shadow-none focus:ring-0 p-0 h-auto bg-transparent text-lg font-semibold">
                    <SelectValue placeholder={t("selectPlatform")} />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.filter(a => a.isConnected).map(app => (
                      <SelectItem key={app.id} value={app.id} disabled={app.id === sourceId}>
                        {app.label} {app.email ? `(${app.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              size="lg"
              className="h-14 px-8 text-lg gap-2 rounded-4xl shadow-lg hover:shadow-xl transition-all w-full md:w-auto shrink-0"
              onClick={handleGlobalSync}
              disabled={isSyncing || !sourceId || !targetId}
            >
              <IconRefresh className={cn("h-6 w-6", isSyncing && "animate-spin")} />
              {isSyncing ? t("syncing") : t("oneclickSync")}
            </Button>
          </div>

          <Link href="/dash/activities" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
            {t("fetchMore")}
          </Link>
        </div>
      </section>

      <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
        <div className="space-y-4 text-foreground">
          <p>
            为实现运动数据的同步，本工具需在服务端登录并保存您的账号及密码信息。我们将严格遵循业界通用标准对您的凭证进行加密存储，保障您的信息安全。
          </p>
          <p>请您知悉并同意以下事项：</p>
          <p>继续使用本工具，即表示您已阅读并同意我们的<a href="/dash/tos" target="_self" rel="noopener noreferrer"
            className="underline">「使用条款」</a>。</p>
          <p>相关服务依赖第三方，我们尽力保障可用性，但不承诺持续可用或可访问。</p>
          <p>受限于品牌登录机制，使用本工具期间，请勿在其他终端同时登录您的账号，以免导致授权凭证失效。</p>
          <p>我们将严格加密存储您的信息，但无法完全排除网络环境中的潜在不确定性。继续使用即代表您已充分知悉并理解上述情况，授权我们为您进行数据的同步与管理。</p>
        </div>
      </div>

      {/* 活跃连接与添加管理 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">连接管理</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onConnect={(selectedApp) => {
                setCurrentApp(selectedApp);
                setOpen(true);
              }}
              onRefresh={(id) => handleRefreshAuth(id, app.platform)}
            />
          ))}
          <Card
            className="flex flex-col items-center justify-cente cursor-pointer hover:bg-muted/30 transition-all border-dashed border-2 group"
            onClick={() => {
              setCurrentApp({ platform: 'garmin_cn' });
              setOpen(true);
            }}
          >
            <div className="p-4 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <IconPlus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="mt-2 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
              {t("connectAccount")}
            </span>
          </Card>
        </div>
      </section>

      <SyncLogs />

      <AppConnectionDialog
        key={currentApp?.id || currentApp?.platform}
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
