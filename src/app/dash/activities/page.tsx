'use client';
import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { ActivitySportIcon, ActivityTypeIcon, ACTIVITY_TYPES, type ActivityTypeEntry } from '@/lib/activity-icons';
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconSearch,
  IconRefresh,
  IconDownload,
  IconSend,
  IconLayoutList,
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
  SelectGroup,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ActivityViewToggle } from '@/components/dash/activity-view-toggle';

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
  average_hr?: number;
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
  const tFeed = useTranslations('FeedPage');
  const { layout } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const appSelected = searchParams.get('connect_id');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || "");
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || "");
  const [sportType, setSportType] = useState(searchParams.get('sport_types') || "100,101,102,103");
  const [searchName, setSearchName] = useState(searchParams.get('name') || "");


  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<DetailedActivity | null>(null);
  const [loadingActivityDetail, setLoadingActivityDetail] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [pushResult, setPushResult] = useState<{ success: boolean; result: any } | null>(null);

  // 当 URL 参数变化时（如点击浏览器后退），同步本地状态
  useEffect(() => {
    setStartDate(searchParams.get('startDate') || "");
    setEndDate(searchParams.get('endDate') || "");
    setSportType(searchParams.get('sport_types') || "");
    setSearchName(searchParams.get('name') || "");
  }, [searchParams]);

  // 首次加载时如果没有 sport_types 参数，设置默认值
  useEffect(() => {
    if (!searchParams.get('sport_types') && appSelected) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sport_types', '100,101,102,103');
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, appSelected, pathname, router]);

  // 处理平台切换逻辑：统一使用 connect_id 并重置页码和列表
  const handlePlatformChange = useCallback((id: string) => {
    setActivities([]);
    setTotal(0);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('connect_id', id);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

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
    } catch (err) {
      console.error("Fetch status error:", err);
      toast.error("获取连接配置失败");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [appSelected, handlePlatformChange]);

  useEffect(() => {
    fetchAppsStatus();
  }, [fetchAppsStatus]);

  // 对接后端分页接口
  const fetchActivities = useCallback(async () => {
    if (!appSelected) return;

    setLoading(true);
    // 获取 URL 中的最新参数进行查询，确保只有“已提交”的条件生效
    const currentParams = new URLSearchParams(window.location.search);
    const urlStartDate = currentParams.get('startDate');
    const urlEndDate = currentParams.get('endDate');
    const urlSportType = currentParams.get('sport_types');
    const urlName = currentParams.get('name');

    try {
      const queryParams = new URLSearchParams({
        connect_id: appSelected,
        page_size: limit.toString(),
        page_count: page.toString(),
      });
      if (urlStartDate)
        queryParams.set('start_date', urlStartDate);
      if (urlEndDate)
        queryParams.set('end_date', urlEndDate);
      if (urlSportType)
        queryParams.set('sport_types', urlSportType);
      if (urlName)
        queryParams.set('name', urlName);


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
  }, [appSelected, page, limit, searchParams]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  const handleDateChange = (key: string, value: string) => {
    if (key === 'startDate') setStartDate(value);
    if (key === 'endDate') setEndDate(value);
  };

  const handleSportTypeChange = (value: string) => {
    setSportType(value === 'all' ? "" : value);
  };

  // 处理点击查询按钮：将当前所有本地状态同步到 URL，触发 useEffect 中的 fetchActivities
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set('startDate', startDate); else params.delete('startDate');
    if (endDate) params.set('endDate', endDate); else params.delete('endDate');
    if (sportType && sportType !== 'all') params.set('sport_types', sportType); else params.delete('sport_types');
    if (searchName) params.set('name', searchName); else params.delete('name');

    setPage(1);
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
      const response = await authFetch(`/api/v1/base/downloadActivity/${id}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const extension = 'fit';
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

  const fetchActivityDetails = useCallback(async (activityId: number) => {
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

  /**
   * 把指定活动数据推送到目标账号
   * @param selectedActivityId 运动数据 ID
   * @param targetConnectId 目标账号 ID
   * @returns 
   */
  const handlePushToPlatform = async (selectedActivityId: number, targetConnectId: number) => {
    if (pushing) return;
    setPushResult(null);
    if (!selectedActivityId) {
      setPushResult({ success: false, result: { message: "未找到活动 ID，请稍后再试" } });
      return;
    }
    setPushing(true);
    const pushUrl = `/api/v1/base/uploadActivity2Target/${selectedActivityId}/${targetConnectId}`;
    try {
      const response = await authFetch(pushUrl, { method: 'POST' });
      const result = await response.json();
      console.log(JSON.stringify(result));
      const success = result.status === "SUCCESS" || result.status === "success";
      setPushResult({ success, result });
    } catch (error) {
      console.error("Push failed:", error);
      setPushResult({ success: false, result: { message: "请求过程中发生错误", error } });
    } finally {
      setPushing(false);
    }
  };

  const getPushTargets = (currentConnectId: number) => {
    const pushTargets = apps
      .filter(app => app.is_active)
      .map(app => {
        let platformName = app.source_type + "_" + app.region;
        let internalPlatform = platformName + "(" + app.account + ")";
        return { id: app.id, platform: internalPlatform, platformName, account: app.account };
      })
      .filter(p => p.id !== currentConnectId);

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
      <div className="bg-card dark:bg-muted/20 p-2 rounded-lg border border-border shadow-sm mb-4 flex items-center gap-3 max-[768px]:flex-wrap max-[768px]:p-3">
        <Select
          value={appSelected || ""}
          onValueChange={handlePlatformChange}
        >
          <SelectTrigger className="w-75 bg-background max-[768px]:w-full max-[768px]:min-h-[44px]">
            <SelectValue placeholder="选择平台账号" />
          </SelectTrigger>
          <SelectContent>
            {apps.filter(app => app.is_active).map((app) => (
              <SelectItem key={app.id} value={app.id.toString()}>
                <span className="font-semibold uppercase">{app.source_type}-{app.region}</span>
                <span className="ml-2 text-muted-foreground text-xs">({app.account})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border shrink-0 mx-1 max-[768px]:hidden" />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring max-[768px]:flex-1 max-[768px]:min-h-[44px] max-[768px]:text-base"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring max-[768px]:flex-1 max-[768px]:min-h-[44px] max-[768px]:text-base"
          />
        </div>

        <div className="w-px h-6 bg-border shrink-0 mx-1 max-[768px]:hidden" />

        <Select
          value={sportType || "all"}
          onValueChange={handleSportTypeChange}
        >
          <SelectTrigger className="w-[160px] bg-background max-[768px]:w-full max-[768px]:min-h-[44px]">
            <SelectValue placeholder="全部运动" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部运动</SelectItem>
            {ACTIVITY_TYPES.map((group: ActivityTypeEntry) => {
              const childKeys = group.children && group.children.length > 0
                ? Array.from(new Set(group.children.map((c) => c.key))).join(',')
                : String(group.key);

              return (
                <SelectGroup key={group.name}>
                  <SelectItem
                    value={childKeys}
                    className="font-bold uppercase"
                  >
                    <span className="flex items-center gap-2">
                      <ActivityTypeIcon name={group.name} className="h-4 w-4 shrink-0" />
                      {group.name_zh}
                    </span>
                  </SelectItem>

                  {group.children?.map((item, index) => {
                    const uniqueReactKey = `${group.name}-${item.key}-${index}`;

                    return (
                      <SelectItem
                        key={uniqueReactKey}
                        value={String(item.key)}
                        className="pl-6"
                      >
                        <span className="flex items-center gap-2">
                          <ActivityTypeIcon name={item.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {item.name_zh}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs max-[768px]:max-w-full">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground max-[768px]:left-4 max-[768px]:size-5" size={16} />
          <input
            type="text" value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="搜索关键词..."
            className="w-full pl-9 pr-3 py-1.5 border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-ring max-[768px]:pl-12 max-[768px]:pr-4 max-[768px]:py-3 max-[768px]:text-base"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePull}
          disabled={syncing}
          className="ml-auto gap-2 max-[768px]:min-h-[44px] max-[768px]:min-w-[88px]"
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
              className="gap-2 max-[768px]:min-h-[44px] max-[768px]:min-w-[88px]"
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
          onClick={handleSearch}
          disabled={loading}
          className="gap-2 max-[768px]:min-h-[44px] max-[768px]:min-w-[88px]"
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
              <th className="px-4 py-3 font-medium w-20 max-[768px]:w-16">{t("type")}</th>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("startTime")}</th>
              <th className="px-4 py-3 font-medium text-right max-[768px]:hidden">{t("distance")}</th>
              <th className="px-4 py-3 font-medium text-right max-[768px]:hidden">{t("movingTime")}</th>
              <th className="px-4 py-3 font-medium text-right max-[768px]:hidden">{t("totalTime")}</th>
              <th className="px-4 py-3 font-medium text-right max-[768px]:hidden">{t("averageHr")}</th>
              <th className="px-4 py-3 font-medium text-right max-[768px]:hidden">{t("elevation")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {t("loadingActivity")}
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noActivityFound")}
                </td>
              </tr>
            ) : (
              activities.map((act, i) => (
                <Dialog key={act.activity_id || i} onOpenChange={(open) => {
                  if (open) {
                    fetchActivityDetails(act.id);
                    setPushResult(null); // Clear previous push result when opening dialog
                  } else {
                    setSelectedActivityDetail(null); // Clear details when dialog closes
                    setPushResult(null); // Also clear push result when closing dialog
                  }
                }}>
                  <DialogTrigger asChild>
                    <tr className="hover:bg-muted/30 even:bg-muted/20 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-foreground justify-center">
                          <div
                            className=
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black'
                          >
                            <ActivitySportIcon
                              sportType={act.sport_type_raw}
                              className="h-3.5 w-3.5 text-white"
                            />
                          </div>
                          {/* <span className="capitalize">{act.sport_type_raw}</span> */}
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
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap max-[768px]:hidden">
                        {(act.distance_meters / 1000).toFixed(2)} km
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap max-[768px]:hidden">
                        {formatDuration(act.moving_duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap max-[768px]:hidden">
                        {formatDuration(act.duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap max-[768px]:hidden">
                        {act.average_hr ? `${act.average_hr} bpm` : '--'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap max-[768px]:hidden">
                        {act.elevation_gain} m
                      </td>
                    </tr>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-3xl flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="text-xl flex items-center gap-2">
                        {act.source_type} - {act.activity_name} - {dayjs(act.start_time_local).format('YYYY-MM-DD HH:mm')}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        显示该活动的详细原始数据和平台指标。
                      </DialogDescription>
                    </DialogHeader>

                    {selectedActivityDetail && !loadingActivityDetail && (
                      <div className="mt-auto px-6 pt-4 pb-2 border-t border-border bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            {getPushTargets(Number(appSelected)).map((target) => (
                              <button
                                key={target.id}
                                onClick={() => handlePushToPlatform(selectedActivityDetail?.id, target.id)}
                                disabled={pushing}
                                className="flex flex-col items-center justify-center gap-0.5 px-4 py-2.5 bg-background border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm min-w-[180px] h-auto"
                              >
                                <div className="flex items-center gap-2">
                                  {pushing ? <IconRefresh size={16} className="animate-spin" /> : <IconSend size={16} className="text-blue-500" />}
                                  <span className="font-medium text-sm">
                                    {pushing ? '推送中...' : `手动推送到 ${target.platformName}`}
                                  </span>
                                </div>
                                {!pushing && (
                                  <span className="text-xs text-muted-foreground">{target.account}</span>
                                )}
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
                        {pushResult && (
                          <div className={`mt-4 p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-all ${pushResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            {pushResult.success ? '上传成功' : '上传失败'}
                            <br />
                            {JSON.stringify(pushResult.result, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
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
