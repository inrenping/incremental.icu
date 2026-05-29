'use client';
import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconSearch,
  IconChevronDown,
  IconRefresh,
  IconDownload,
  IconSend
} from '@tabler/icons-react';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from '@/lib/api';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pagination } from "@/components/dash/pagination";
import { useTranslations } from "next-intl";

interface AppConfig {
  id: number;
  user_id: number;
  guid?: string | null;
  account: string;
  encrypted_password?: string;
  source_type: string;
  region: string;
  is_active: boolean;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  refresh_token?: string | null;
  refresh_token_expires_at?: string | null;
  oauth_token?: string | null;
  oauth_token_secret?: string | null;
  secret_string?: string | null;
  total_count?: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

interface Activity {
  id: number;
  activity_id: string;
  activity_name: string;
  start_time_local: string;
  sport_type_raw: string;
  moving_duration_seconds: number;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain: number;
  source_type: string;
  created_at: string;
}

// Assuming CorosActivity and GarminActivity have similar structures but might differ in fields.
// For now, let's use a generic object for detailed activity.
interface DetailedActivity {
  [key: string]: any;
}
const ActivityListPage = () => {
  const t = useTranslations('ListPage');
  const { layout } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 获取分页和平台参数
  const appSelected = searchParams.get('id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('pageSize') || '20');
  const startDate = searchParams.get('startDate') || "";
  const endDate = searchParams.get('endDate') || "";

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<DetailedActivity | null>(null);
  const [loadingActivityDetail, setLoadingActivityDetail] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [apps, setApps] = useState<AppConfig[]>([]);

  const fetchAppsStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data: AppConfig[] = await response.json();
      setApps(data);

      // Auto-select the first active platform if none is selected
      if (!appSelected && data.length > 0) {
        const firstActive = data.find(a => a.is_active) || data[0];
        handlePlatformChange(firstActive.id.toString());
      }
    } catch (err: any) {
      console.error("Fetch status error:", err);
      toast.error("获取连接配置失败");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [appSelected]);

  useEffect(() => {
    fetchAppsStatus();
  }, [fetchAppsStatus]);

  // 对接后端分页接口
  const fetchActivities = useCallback(async () => {
    if (!appSelected) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: appSelected,
        pageSize: limit.toString(),
        pageCount: page.toString(),
      });
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      // 根据后端定义的参数名对接：platform, pageSize, pageCount
      const response = await authFetch(
        `/api/v1/base/getActivitiesByPage?${queryParams.toString()}`
      );
      const result = await response.json();
      if (result.status === "success") {
        setActivities(result.data);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }, [appSelected, page, limit, startDate, endDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  // 刷新认证处理函数
  const handleRefreshAuth = async (id: string) => {
    try {
      const response = await authFetch(`/api/v1/base/relogin?connect_id=${id}`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.status === "success") {
        return true;
      } else {
        toast.error(result.message || "身份验证已过期，请重新连接");
        return false;
      }
    } catch (err) {
      console.error("Refresh auth error:", err);
      return false;
    }
  };

  const handlePlatformChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newLimit);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDateChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePull = async () => {
    if (syncing || !appSelected) return;
    setSyncing(true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: appSelected,
        incremental: 'false'
      });

      const response = await authFetch(
        `/api/v1/base/pullNewActivities?${queryParams.toString()}`,
        { method: 'POST' }
      );

      const result = await response.json();
      if (result.status === "success") {
        await fetchActivities();
      }
    } catch (error) {
      console.error("Failed to sync activities:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleFullPull = async () => {
    if (syncing || !appSelected) return;
    setSyncing(true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: appSelected,
        incremental: 'true'
      });

      const response = await authFetch(
        `/api/v1/base/pullFullActivities?${queryParams.toString()}`,
        { method: 'POST' }
      );

      const result = await response.json();
      if (result.status === "success") {
        await fetchActivities();
      }
    } catch (error) {
      console.error("Failed to sync activities:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = async (id: string, platform: string, platformId: string) => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (appSelected) {
        await handleRefreshAuth(appSelected);
      }
      const response = await authFetch(`/api/v1/settings/downloadActivity?id=${id}&platform=${platform}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const extension = (platform.startsWith('garmin') || platform === 'CN') ? 'zip' : 'fit';
      a.download = `${platformId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download activity:", error);
    } finally {
      setDownloading(false);
    }
  };

  const fetchActivityDetails = useCallback(async (activityId: string | number) => {
    setLoadingActivityDetail(true);
    setSelectedActivityDetail(null);
    try {
      const queryParams = new URLSearchParams({
        id: activityId.toString()
      });
      const response = await authFetch(
        `/api/v1/base/getActivity?${queryParams.toString()}`
      );
      const result = await response.json();
      if (result.status === "success") {
        setSelectedActivityDetail(result.data);
      } else {
        console.error("Failed to fetch activity details:", result.detail || "Unknown error");
      }
    } catch (error) {
      console.error("Failed to fetch activity details:", error);
    } finally {
      setLoadingActivityDetail(false);
    }
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds === null || seconds === undefined) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
    if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
    return parts.join(':');
  };

  const handlePushToPlatform = async (obj: any, selectedPlatform: string, targetPlatform: string) => {
    if (pushing) return;
    const id = obj?.selectedActivityDetail?.id;
    if (!id) {
      alert("未找到活动 ID，请稍后再试");
      return;
    }

    setPushing(true);
    let pushUrl = "";
    // 根据源平台和目标平台选择对应的接口
    if (selectedPlatform.startsWith("garmin") && targetPlatform.startsWith("garmin")) {
      // 佳明国际版与中国版互转
      pushUrl = `/api/v1/garmin/uploadGarminActivity2Garmin/${id}`;
    } else if (selectedPlatform === "coros" && targetPlatform.startsWith("garmin")) {
      // 高驰推送到佳明
      if (targetPlatform === "garmin_cn") {
        pushUrl = `/api/v1/garmin/uploadCorosActivity2Garmin/${id}?region=cn`;
      } else {
        pushUrl = `/api/v1/garmin/uploadCorosActivity2Garmin/${id}?region=global`;
      }
    } else if (selectedPlatform.startsWith("garmin") && targetPlatform === "coros") {
      // 佳明推送到高驰
      pushUrl = `/api/v1/coros/uploadGarminActivity2Coros/${id}`;

    }

    if (!pushUrl) {
      console.error("未找到匹配的推送路径");
      setPushing(false);
      return;
    }

    try {
      const response = await authFetch(pushUrl, { method: 'POST' });
      const result = await response.json();
      if (result.status === "success") {
        alert(`成功推送至 ${targetPlatform}`);
      } else {
        alert(`推送失败: ${result.message || result.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error("Push failed:", error);
      alert("请求过程中发生错误");
    } finally {
      setPushing(false);
    }
  };

  const getPushTargets = (currentPlatform: string) => {
    const pushTargets = apps
      .filter(app => app.is_active)
      .map(app => {
        let internalPlatform = "";
        let name = "";
        if (app.source_type === 'garmin') {
          internalPlatform = "GLOBAL"; name = "佳明国际版";
        } else if (app.source_type === 'garmin_cn') {
          internalPlatform = "CN"; name = "佳明中国版";
        } else if (app.source_type === 'coros') {
          internalPlatform = "Coros"; name = "高驰";
        }
        return { id: app.source_type, platform: internalPlatform, name };
      })
      .filter(p => p.id !== currentPlatform);

    // Deduplicate by id (source_type) to avoid showing multiple buttons for the same platform type
    const seen = new Set();
    // 返回除当前平台外的其他平台
    return pushTargets.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  return (
    <div className={cn(
      "p-6 mx-auto bg-slate-50/50 dark:bg-background min-h-screen text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* 平台选择器 & 过滤栏 */}
      <div className="bg-card dark:bg-muted/20 p-2 rounded-lg border border-border shadow-sm mb-4 flex items-center gap-3">
        <Select
          value={appSelected || ""}
          onValueChange={handlePlatformChange}
        >
          <SelectTrigger className="w-[300px] bg-background">
            <SelectValue placeholder="选择平台账号" />
          </SelectTrigger>
          <SelectContent>
            {apps.filter(app => app.is_active).map((app) => (
              <SelectItem key={app.id} value={app.id.toString()}>
                <span className="font-semibold uppercase">{app.source_type}_{app.region}</span>
                <span className="ml-2 text-muted-foreground text-xs">({app.account})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border shrink-0 mx-1" />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="w-px h-6 bg-border shrink-0 mx-1" />

        <button className="flex items-center gap-1 px-3 py-1.5 border border-border rounded bg-background hover:bg-muted text-foreground transition-colors">
          全部运动 <IconChevronDown size={14} />
        </button>
        <div className="relative flex-1 max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="搜索关键词..."
            className="w-full pl-9 pr-3 py-1.5 border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePull}
          disabled={syncing}
          className="ml-auto gap-2"
        >
          <IconRefresh className={cn(syncing && "animate-spin")} />
          {syncing ? '同步中...' : '增量同步'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              className="gap-2"
            >
              <IconRefresh className={cn(syncing && "animate-spin")} />
              {syncing ? '同步中...' : '全量同步'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认进行全量同步？</AlertDialogTitle>
              <AlertDialogDescription>
                全量同步将尝试获取该平台下的所有历史活动数据。由于数据量可能较大，同步过程可能会比较缓慢，且在网络不稳定的情况下存在失败风险。建议在网络环境良好时进行此操作。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleFullPull}>确认同步</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="sm"
          onClick={fetchActivities}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <IconRefresh className="animate-spin" /> : <IconSearch />}
          {loading ? '查询中...' : '查询'}
        </Button>
      </div>

      {/* 活动列表表格 */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b border-border">
              <th className="px-4 py-3 font-medium w-24">{t("type")}</th>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("startTime")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("movingTime")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("totalTime")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("distance")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("elevation")}</th>
              <th className="px-4 py-3 font-medium">{t("platform")}</th>
              <th className="px-4 py-3 font-medium text-center">{t("id")}</th>
              <th className="px-4 py-3 font-medium">{t("syncTime")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  {t("loadingActivity")}
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noActivityFound")}
                </td>
              </tr>
            ) : (
              activities.map((act, i) => (
                <Sheet key={act.activity_id || i} onOpenChange={(open) => {
                  if (open) {
                    fetchActivityDetails(act.id);
                  } else {
                    setSelectedActivityDetail(null); // Clear details when dialog closes
                  }
                }}>
                  <SheetTrigger asChild>
                    <tr className="hover:bg-muted/30 even:bg-muted/20 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="capitalize">{act.sport_type_raw}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="font-medium text-foreground group-hover:text-primary group-hover:underline transition-all" title="查看详情">
                            {act.activity_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-muted-foreground whitespace-nowrap">
                        <div className="font-mono">{dayjs(act.start_time_local).format('YYYY-MM-DD HH:mm')}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                        {formatDuration(act.moving_duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                        {formatDuration(act.duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                        {(act.distance_meters / 1000).toFixed(2)} km
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                        {act.elevation_gain} m
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {act.source_type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {act.activity_id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {dayjs(act.created_at).format('YYYY-MM-DD HH:mm')}
                      </td>
                    </tr>
                  </SheetTrigger>
                  <SheetContent side="right" className="sm:min-w-2xl h-full flex flex-col">
                    <SheetHeader>
                      <SheetTitle className="text-xl flex items-center gap-2">
                        {act.source_type} - {act.activity_name}
                      </SheetTitle>
                      <SheetDescription className="sr-only">
                        显示该活动的详细原始数据和平台指标。
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto py-4 min-h-0">
                      {loadingActivityDetail ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                          <IconRefresh className="animate-spin" />
                          正在从云端获取详细数据...
                        </div>
                      ) : selectedActivityDetail ? (
                        <div className="flex flex-col gap-4">
                          <div className="bg-muted/10 rounded-xl overflow-hidden">
                            <div className="px-4 py-2">
                              {Object.entries(selectedActivityDetail)
                                .filter(([key]) => !['platform', 'id', 'user_id'].includes(key.toLowerCase()))
                                .map(([key, value]) => {
                                  let formattedValue = String(value);
                                  if (value === null || value === undefined) {
                                    formattedValue = '--';
                                  } else if (typeof value === 'object') {
                                    formattedValue = JSON.stringify(value);
                                  }

                                  return (
                                    <div key={key} className="flex justify-between items-center py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 px-2 -mx-2 transition-colors">
                                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                                      <span className="text-sm font-mono font-medium text-foreground text-right ml-6 break-all">
                                        {formattedValue}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          未能成功加载活动详情，请稍后重试。
                        </div>
                      )}
                    </div>

                    {selectedActivityDetail && !loadingActivityDetail && (
                      <div className="mt-auto px-6 pt-4 pb-2 border-t border-border bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            {getPushTargets(act.source_type).map((target) => (
                              <button
                                key={target.id}
                                onClick={() => handlePushToPlatform({ selectedActivityDetail }, act.source_type, target.id)}
                                disabled={pushing}
                                className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm h-10"
                              >
                                {pushing ? <IconRefresh size={16} className="animate-spin" /> : <IconSend size={16} className="text-blue-500" />}
                                {pushing ? '推送中...' : `手动推送到 ${target.name}`}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleDownload(act.id.toString(), act.source_type, act.activity_id)}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm h-10"
                          >
                            {downloading ? <IconRefresh size={16} className="animate-spin" /> : <IconDownload size={16} />}
                            {downloading ? '下载中...' : '下载 FIT 文件'}
                          </button>
                        </div>
                      </div>
                    )}
                  </SheetContent>
                </Sheet>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <Pagination
          total={total}
          page={page}
          limit={limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default ActivityListPage;
