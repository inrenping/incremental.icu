'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import activityTypes from '@/lib/activity_type.json';
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconSearch,
  IconRefresh,
  IconDownload,
  IconSend,
  IconLoader2,
  IconMoodEmpty,
} from '@tabler/icons-react';
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
import { ActivityCard, type Activity } from "@/components/dash/activity-card";

interface AppConfig {
  id: number;
  user_id: number;
  account: string;
  source_type: string;
  region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

interface DetailedActivity {
  [key: string]: any;
}

const PAGE_SIZE = 20;

const ActivityCardsPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const appSelected = searchParams.get('connect_id');

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || "");
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || "");
  const [sportType, setSportType] = useState(searchParams.get('sport_type') || "");
  const [searchName, setSearchName] = useState(searchParams.get('name') || "");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [apps, setApps] = useState<AppConfig[]>([]);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<DetailedActivity | null>(null);
  const [loadingActivityDetail, setLoadingActivityDetail] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 用 ref 避免 IntersectionObserver 闭包拿到旧状态
  const stateRef = useRef({ loading: false, loadingMore: false, page: 1, total: 0, count: 0 });

  // URL 参数变化时同步本地状态
  useEffect(() => {
    setStartDate(searchParams.get('startDate') || "");
    setEndDate(searchParams.get('endDate') || "");
    setSportType(searchParams.get('sport_type') || "");
    setSearchName(searchParams.get('name') || "");
  }, [searchParams]);

  const handlePlatformChange = useCallback((id: string) => {
    setActivities([]);
    setTotal(0);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('connect_id', id);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const fetchAppsStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data: AppConfig[] = await response.json();
      setApps(data);
      if (!appSelected && data.length > 0) {
        const firstActive = data.find(a => a.is_active) || data[0];
        handlePlatformChange(firstActive.id.toString());
      }
    } catch (err) {
      console.error("Fetch status error:", err);
      toast.error("获取连接配置失败");
    }
  }, [appSelected, handlePlatformChange]);

  useEffect(() => {
    fetchAppsStatus();
  }, [fetchAppsStatus]);

  // 拉取某一页数据；reset=true 时替换列表，否则追加
  const fetchPage = useCallback(async (pageCount: number, reset: boolean) => {
    if (!appSelected) return;
    if (reset) setLoading(true); else setLoadingMore(true);

    const currentParams = new URLSearchParams(window.location.search);
    try {
      const queryParams = new URLSearchParams({
        connect_id: appSelected,
        page_size: PAGE_SIZE.toString(),
        page_count: pageCount.toString(),
      });
      const urlStartDate = currentParams.get('startDate');
      const urlEndDate = currentParams.get('endDate');
      const urlSportType = currentParams.get('sport_type');
      const urlName = currentParams.get('name');
      if (urlStartDate) queryParams.set('start_date', urlStartDate);
      if (urlEndDate) queryParams.set('end_date', urlEndDate);
      if (urlSportType) queryParams.set('sport_type', urlSportType);
      if (urlName) queryParams.set('name', urlName);

      const response = await authFetch(
        `/api/v1/base/getActivitiesByPage?${queryParams.toString()}`
      );
      const result = await response.json();
      if (result.status === "success") {
        const data: Activity[] = result.data || [];
        setTotal(result.total || 0);
        setActivities(prev => (reset ? data : [...prev, ...data]));
        setPage(pageCount);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }, [appSelected]);

  // 当查询条件（URL）或平台变化时，重置并加载第一页
  useEffect(() => {
    if (appSelected) {
      fetchPage(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSelected, searchParams]);

  // 同步 ref
  useEffect(() => {
    stateRef.current = {
      loading,
      loadingMore,
      page,
      total,
      count: activities.length,
    };
  }, [loading, loadingMore, page, total, activities.length]);

  // 无限滚动：观察底部哨兵
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const s = stateRef.current;
      if (
        entry.isIntersecting &&
        !s.loading &&
        !s.loadingMore &&
        s.count < s.total
      ) {
        fetchPage(s.page + 1, false);
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set('startDate', startDate); else params.delete('startDate');
    if (endDate) params.set('endDate', endDate); else params.delete('endDate');
    if (sportType && sportType !== 'all') params.set('sport_type', sportType); else params.delete('sport_type');
    if (searchName) params.set('name', searchName); else params.delete('name');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePull = async () => {
    if (syncing || !appSelected) return;
    setSyncing(true);
    try {
      const queryParams = new URLSearchParams({ connect_id: appSelected, incremental: 'false' });
      const response = await authFetch(`/api/v1/base/pullNewActivities?${queryParams.toString()}`, { method: 'POST' });
      const result = await response.json();
      if (result.status === "success") {
        await fetchPage(1, true);
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
      const queryParams = new URLSearchParams({ connect_id: appSelected, incremental: 'true' });
      const response = await authFetch(`/api/v1/base/pullFullActivities?${queryParams.toString()}`, { method: 'POST' });
      const result = await response.json();
      if (result.status === "success") {
        await fetchPage(1, true);
      }
    } catch (error) {
      console.error("Failed to sync activities:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = async (id: string, platformId: string) => {
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
      a.download = `${platformId}.fit`;
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
      const queryParams = new URLSearchParams({ id: activityId.toString() });
      const response = await authFetch(`/api/v1/base/getActivity?${queryParams.toString()}`);
      const result = await response.json();
      if (result.status === "success") {
        setSelectedActivityDetail(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch activity details:", error);
    } finally {
      setLoadingActivityDetail(false);
    }
  }, []);

  const handlePushToPlatform = async (selectedActivityId: number, targetConnectId: number) => {
    if (pushing || !selectedActivityId) return;
    setPushing(true);
    const pushUrl = `/api/v1/base/uploadActivity2Target/${selectedActivityId}/${targetConnectId}`;
    try {
      const response = await authFetch(pushUrl, { method: 'POST' });
      const result = await response.json();
      toast.message(JSON.stringify(result));
    } catch (error) {
      console.error("Push failed:", error);
      toast.error("请求过程中发生错误");
    } finally {
      setPushing(false);
    }
  };

  const getPushTargets = (currentConnectId: number) => {
    const seen = new Set<number>();
    return apps
      .filter(app => app.is_active)
      .map(app => ({
        id: app.id,
        name: `${app.source_type}_${app.region}(${app.account})`,
      }))
      .filter(p => p.id !== currentConnectId)
      .filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
  };

  const handleCardClick = (act: Activity) => {
    setSelectedActivity(act);
    fetchActivityDetails(act.id);
  };

  const hasMore = activities.length < total;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4 min-h-screen bg-slate-50/50 dark:bg-background">
      {/* 筛选栏：移动端可换行 */}
      <div className="sticky top-[72px] z-10 mb-4 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2">
          {/* 平台选择 */}
          <Select value={appSelected || ""} onValueChange={handlePlatformChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="选择平台账号" />
            </SelectTrigger>
            <SelectContent>
              {apps.filter(app => app.is_active).map((app) => (
                <SelectItem key={app.id} value={app.id.toString()}>
                  <span className="font-semibold uppercase">{app.source_type}-{app.region}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({app.account})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 日期 + 运动类型 */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Select value={sportType || "all"} onValueChange={(v) => setSportType(v === 'all' ? "" : v)}>
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="全部运动" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部运动</SelectItem>
                {activityTypes.map((group: any) => {
                  const childKeys = group.children && group.children.length > 0
                    ? Array.from(new Set(group.children.map((c: any) => c.key))).join(',')
                    : String(group.key);
                  return (
                    <SelectGroup key={group.name}>
                      <SelectItem value={childKeys} className="font-bold uppercase">{group.name_zh}</SelectItem>
                      {group.children?.map((item: any, index: number) => (
                        <SelectItem key={`${group.name}-${item.key}-${index}`} value={String(item.key)} className="pl-6">
                          {item.name_zh}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 搜索 + 查询 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="搜索关键词..."
                className="w-full rounded border border-border bg-background py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button size="sm" onClick={handleSearch} disabled={loading} className="gap-1.5 shrink-0">
              {loading ? <IconRefresh className="animate-spin" size={16} /> : <IconSearch size={16} />}
              查询
            </Button>
          </div>

          {/* 同步操作 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePull} disabled={syncing} className="flex-1 gap-1.5">
              <IconRefresh className={cn(syncing && "animate-spin")} size={16} />
              {syncing ? '同步中...' : '增量同步'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={syncing} className="flex-1 gap-1.5">
                  <IconRefresh className={cn(syncing && "animate-spin")} size={16} />
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
          </div>
        </div>
      </div>

      {/* 统计 */}
      {total > 0 && (
        <div className="mb-2 px-1 text-xs text-muted-foreground">
          共 {total} 条记录
        </div>
      )}

      {/* 卡片列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <IconLoader2 className="animate-spin" size={28} />
          <span className="text-sm">正在加载运动数据...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <IconMoodEmpty size={32} />
          <span className="text-sm">未找到相关运动记录</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((act, i) => (
            <ActivityCard
              key={act.activity_id || i}
              activity={act}
              onClick={() => handleCardClick(act)}
            />
          ))}

          {/* 哨兵 + 加载更多状态 */}
          <div ref={sentinelRef} className="py-4 text-center text-xs text-muted-foreground">
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <IconLoader2 className="animate-spin" size={16} /> 加载中...
              </span>
            ) : hasMore ? (
              <span>下拉加载更多</span>
            ) : (
              <span>已经到底啦</span>
            )}
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog
        open={!!selectedActivity}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedActivity(null);
            setSelectedActivityDetail(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl text-pretty">
              {selectedActivity && (
                <>
                  {selectedActivity.source_type} - {selectedActivity.activity_name} - {dayjs(selectedActivity.start_time_local).format('YYYY-MM-DD HH:mm')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">显示该活动的详细原始数据和平台指标。</DialogDescription>
          </DialogHeader>

          {loadingActivityDetail && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <IconLoader2 className="animate-spin" size={20} /> 加载中...
            </div>
          )}

          {selectedActivity && selectedActivityDetail && !loadingActivityDetail && (
            <div className="mt-auto border-t border-border bg-background px-1 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {getPushTargets(Number(appSelected)).map((target) => (
                    <button
                      key={target.id}
                      onClick={() => handlePushToPlatform(selectedActivityDetail?.id, target.id)}
                      disabled={pushing}
                      className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pushing ? <IconRefresh size={16} className="animate-spin" /> : <IconSend size={16} className="text-blue-500" />}
                      {pushing ? '推送中...' : `推送 ${target.name}`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDownload(selectedActivity.id.toString(), selectedActivity.activity_id)}
                  disabled={downloading}
                  className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloading ? <IconRefresh size={16} className="animate-spin" /> : <IconDownload size={16} />}
                  {downloading ? '下载中...' : '下载 FIT 文件'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityCardsPage;
