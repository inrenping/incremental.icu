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
  Menubar,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
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
import CryptoJS from 'crypto-js';
interface Activity {
  id: string,
  title: string;
  startTime: string;
  type: string;
  workoutTime: string;
  totalTime: string;
  distance: string;
  elevation: string;
  platform: string;
  platformId: string;
  syncTime: string;
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
  const platformSelected = searchParams.get('platform') || "garmin";
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

  const platforms = [
    { platform: "garmin", name: '佳明国际版' },
    { platform: "garmin_cn", name: '佳明中国版', },
    { platform: "coros", name: '高驰' },
  ].map(p => ({ ...p, active: p.platform === platformSelected }));

  // 对接后端分页接口
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        platform: platformSelected,
        pageSize: limit.toString(),
        pageCount: page.toString(),
      });
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      // 根据后端定义的参数名对接：platform, pageSize, pageCount
      const response = await authFetch(
        `/api/v1/settings/getActivitiesWithPlatformByPage?${queryParams.toString()}`
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
  }, [platformSelected, page, limit, startDate, endDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  // 刷新认证处理函数
  const handleRefreshAuth = async (platform: string) => {
    setLoading(true);
    try {
      if (platform.startsWith("garmin") || platform === "CN") {
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
            domain: platform === 'garmin_cn' ? 'cn' : platform,
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

        toast.success("GARMIN 认证刷新成功");
      } else if (platform === "coros") {
        const response = await authFetch('/api/v1/coros/relogin', {
          method: 'POST'
        });
        const result = await response.json();
        if (result.status === "success") {
          toast.success("COROS 认证刷新成功");
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

  const handlePlatformChange = (platform: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('platform', platform);
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
    if (syncing) return;
    setSyncing(true);
    try {
      const queryParams = new URLSearchParams({
        platform: platformSelected
      });

      const response = await authFetch(
        `/api/v1/settings/pullActivities?${queryParams.toString()}`,
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
    if (syncing) return;
    setSyncing(true);
    try {
      const queryParams = new URLSearchParams({
        platform: platformSelected
      });

      const response = await authFetch(
        `/api/v1/settings/pullFullActivities?${queryParams.toString()}`,
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
      console.log(platform);
      await handleRefreshAuth(platform);
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

  const fetchActivityDetails = useCallback(async (activityId: string, platform: string) => {
    setLoadingActivityDetail(true);
    setSelectedActivityDetail(null);
    try {
      const queryParams = new URLSearchParams({
        id: activityId,
        platform: platform,
      });
      const response = await authFetch(
        `/api/v1/settings/getActivity?${queryParams.toString()}`
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
    const allPlatforms = [
      { id: "garmin", platform: "GLOBAL", name: '佳明国际版' },
      { id: "garmin_cn", platform: "CN", name: '佳明中国版' },
      { id: "coros", platform: "Coros", name: '高驰' },
    ];
    // 返回除当前平台外的其他平台
    return allPlatforms.filter(p => p.platform !== currentPlatform);
  };

  return (
    <div className={cn(
      "p-6 mx-auto bg-slate-50/50 dark:bg-background min-h-screen text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>
      {/* 平台选择器 & 过滤栏 */}
      <div className="bg-card dark:bg-muted/20 p-2 rounded-lg border border-border shadow-sm mb-4 flex items-center gap-3">
        <Menubar className="border-none shadow-none bg-transparent h-auto p-0">
          {platforms.map((p) => (
            <MenubarMenu key={p.platform}>
              <MenubarTrigger
                onClick={() => handlePlatformChange(p.platform)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 transition-all rounded-md",
                  p.active && "bg-muted text-foreground font-semibold"
                )}
              >
                {p.name}
              </MenubarTrigger>
            </MenubarMenu>
          ))}
        </Menubar>

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
          {syncing ? '同步中...' : '同步平台数据'}
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
                <tr key={act.platformId || i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-foreground">
                      <span>{act.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Sheet onOpenChange={(open) => {
                        if (open) {
                          fetchActivityDetails(act.id, act.platform);
                        } else {
                          setSelectedActivityDetail(null); // Clear details when dialog closes
                        }
                      }}>
                        <SheetTrigger asChild>
                          <div className="font-medium text-foreground cursor-pointer hover:text-primary hover:underline transition-all" title="查看详情">
                            {act.title}
                          </div>
                        </SheetTrigger>
                        <SheetContent side="right" className="sm:min-w-2xl h-full flex flex-col">
                          <SheetHeader>
                            <SheetTitle className="text-xl flex items-center gap-2">
                              {platforms.find(p => p.platform === act.platform)?.name || act.platform}
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
                                  {getPushTargets(act.platform).map((target) => (
                                    <button
                                      key={target.id}
                                      onClick={() => handlePushToPlatform({ selectedActivityDetail }, platformSelected, target.id)}
                                      disabled={pushing}
                                      className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm h-10"
                                    >
                                      {pushing ? <IconRefresh size={16} className="animate-spin" /> : <IconSend size={16} className="text-blue-500" />}
                                      {pushing ? '推送中...' : `手动推送到 ${target.name}`}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleDownload(act.id, act.platform, act.platformId)}
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
                    </div>
                  </td>
                  <td className="px-4 py-5 text-muted-foreground whitespace-nowrap">
                    <div className="font-mono">{dayjs(act.startTime).format('YYYY-MM-DD HH:mm')}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                    {act.workoutTime}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                    {act.totalTime}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                    {act.distance}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                    {act.elevation}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {act.platform}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {act.platformId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {dayjs(act.syncTime).format('YYYY-MM-DD HH:mm')}
                  </td>
                </tr>
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
