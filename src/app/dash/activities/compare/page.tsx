'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { ActivitySportIcon } from '@/lib/activity-icons';
import { toast } from 'sonner';
import { IconSearch, IconRefresh, IconDownload, IconSend } from '@tabler/icons-react';
import { useLayout } from '@/hooks/use-layout';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Pagination } from '@/components/dash/pagination';
import { useTranslations } from 'next-intl';
import { AppConfig, Activity, formatDistance } from '@/lib/activities';

interface DetailedActivity {
  [key: string]: unknown;
}

type Side = 'left' | 'right';

interface SideState {
  connectId: string;
  page: number;
  limit: number;
  activities: Activity[];
  total: number;
  loading: boolean;
  syncing: boolean;
}

const initialSideState: SideState = {
  connectId: '',
  page: 1,
  limit: 20,
  activities: [],
  total: 0,
  loading: false,
  syncing: false,
};

export default function ActivityComparePage() {
  const t = useTranslations('ListPage');
  const tc = useTranslations('Common');
  const tCompare = useTranslations('ComparePage');
  const { layout } = useLayout();

  const [apps, setApps] = useState<AppConfig[]>([]);
  const [left, setLeft] = useState<SideState>(initialSideState);
  const [right, setRight] = useState<SideState>(initialSideState);

  const [selectedDetail, setSelectedDetail] = useState<DetailedActivity | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; result: unknown } | null>(null);

  const activeApps = apps.filter((app) => app.is_active);

  const updateSide = useCallback(<K extends keyof SideState>(
    side: Side,
    key: K,
    value: SideState[K]
  ) => {
    const setter = side === 'left' ? setLeft : setRight;
    setter((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setSideState = useCallback((side: Side, updater: (prev: SideState) => SideState) => {
    const setter = side === 'left' ? setLeft : setRight;
    setter(updater);
  }, []);

  const fetchApps = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data: AppConfig[] = await response.json();
      setApps(data);

      const active = data.filter((app) => app.is_active);
      if (active.length > 0) {
        updateSide('left', 'connectId', active[0].id.toString());
      }
      if (active.length > 1) {
        const second = active.find((app) => app.id.toString() !== active[0].id.toString());
        updateSide('right', 'connectId', second ? second.id.toString() : active[1].id.toString());
      }
    } catch (err) {
      console.error('Fetch status error:', err);
      toast.error('获取连接配置失败');
    }
  }, [updateSide]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const fetchSideActivities = useCallback(async (
    side: Side,
    connectId: string,
    page: number,
    limit: number,
  ) => {
    if (!connectId) return;

    updateSide(side, 'loading', true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: connectId,
        page_size: limit.toString(),
        page_count: page.toString(),
      });

      const response = await authFetch(
        `/api/v1/base/getActivitiesByPage?${queryParams.toString()}`
      );
      const result = await response.json();
      if (result.status === 'success') {
        setSideState(side, (prev) => ({
          ...prev,
          activities: result.data || [],
          total: result.total || 0,
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${side} activities:`, error);
    } finally {
      updateSide(side, 'loading', false);
    }
  }, [updateSide, setSideState]);

  const fetchActivityDetails = useCallback(async (activityId: number) => {
    setLoadingDetail(true);
    setSelectedDetail(null);
    try {
      const queryParams = new URLSearchParams({ id: activityId.toString() });
      const response = await authFetch(
        `/api/v1/base/getActivity?${queryParams.toString()}`
      );
      const result = await response.json();
      if (result.status === 'success') {
        setSelectedDetail(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const getPushTargets = (currentConnectId: number) => {
    return activeApps
      .filter((app) => app.id !== currentConnectId)
      .map((app) => ({
        id: app.id,
        platformName: `${app.source_type}_${app.region}`,
        account: app.account,
      }));
  };

  const handlePushToPlatform = async (activityId: number, targetConnectId: number) => {
    if (pushing) return;
    setPushResult(null);
    if (!activityId) {
      setPushResult({ success: false, result: { message: '未找到活动 ID' } });
      return;
    }
    setPushing(true);
    try {
      const response = await authFetch(
        `/api/v1/base/uploadActivity2Target/${activityId}/${targetConnectId}`,
        { method: 'POST' }
      );
      const result = await response.json();
      const success = result.status === 'SUCCESS' || result.status === 'success';
      setPushResult({ success, result });
    } catch (error) {
      setPushResult({ success: false, result: { message: '请求过程中发生错误', error } });
    } finally {
      setPushing(false);
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
      a.download = `${platformId}.fit`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download activity:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleSearch = (side: Side) => {
    const state = side === 'left' ? left : right;
    if (!state.connectId) {
      toast.error(tCompare('pleaseSelectAccount'));
      return;
    }

    setSideState(side, (prev) => ({ ...prev, page: 1 }));
    fetchSideActivities(side, state.connectId, 1, state.limit);
  };

  const handleIncrementalSync = async (side: Side) => {
    const state = side === 'left' ? left : right;
    if (state.syncing || !state.connectId) return;

    updateSide(side, 'syncing', true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: state.connectId,
        incremental: 'false',
      });

      const response = await authFetch(
        `/api/v1/base/pullNewActivities?${queryParams.toString()}`,
        { method: 'POST' }
      );
      const result = await response.json();
      if (result.status === 'success') {
        await fetchSideActivities(side, state.connectId, state.page, state.limit);
      }
    } catch (error) {
      console.error(`Failed to sync ${side} activities:`, error);
    } finally {
      updateSide(side, 'syncing', false);
    }
  };

  const handleFullSync = async (side: Side) => {
    const state = side === 'left' ? left : right;
    if (state.syncing || !state.connectId) return;

    updateSide(side, 'syncing', true);
    try {
      const queryParams = new URLSearchParams({
        connect_id: state.connectId,
        incremental: 'true',
      });

      const response = await authFetch(
        `/api/v1/base/pullFullActivities?${queryParams.toString()}`,
        { method: 'POST' }
      );
      const result = await response.json();
      if (result.status === 'success') {
        await fetchSideActivities(side, state.connectId, state.page, state.limit);
      }
    } catch (error) {
      console.error(`Failed to full sync ${side} activities:`, error);
    } finally {
      updateSide(side, 'syncing', false);
    }
  };

  const handlePageChange = (side: Side, newPage: number) => {
    const state = side === 'left' ? left : right;
    setSideState(side, (prev) => ({ ...prev, page: newPage }));
    fetchSideActivities(side, state.connectId, newPage, state.limit);
  };

  const handleLimitChange = (side: Side, newLimit: string) => {
    const state = side === 'left' ? left : right;
    const numLimit = Number(newLimit);
    setSideState(side, (prev) => ({ ...prev, limit: numLimit, page: 1 }));
    fetchSideActivities(side, state.connectId, 1, numLimit);
  };

  const handleAccountChange = (side: Side, value: string) => {
    setSideState(side, (prev) => ({
      ...prev,
      connectId: value,
      activities: [],
      total: 0,
      page: 1,
    }));
  };

  const renderTable = (side: Side) => {
    const state = side === 'left' ? left : right;
    const isLeft = side === 'left';

    return (
      <div className="flex flex-col gap-3 min-w-0">
        <div className="bg-card dark:bg-muted/20 p-3 rounded-lg border border-border shadow-sm flex flex-wrap items-center gap-3">
          <Select
            value={state.connectId}
            onValueChange={(value) => handleAccountChange(side, value)}
          >
            <SelectTrigger className="w-[260px] bg-background max-[768px]:w-full max-[768px]:min-h-[44px]">
              <SelectValue placeholder={tCompare('selectAccount')} />
            </SelectTrigger>
            <SelectContent>
              {activeApps.map((app) => (
                <SelectItem key={app.id} value={app.id.toString()}>
                  <span className="font-semibold uppercase">
                    {app.source_type}-{app.region}
                  </span>
                  <span className="ml-2 text-muted-foreground text-xs">({app.account})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleIncrementalSync(side)}
            disabled={state.syncing || !state.connectId}
            className="gap-2 max-[768px]:min-h-[44px] max-[768px]:flex-1"
          >
            <IconRefresh className={cn(state.syncing && 'animate-spin')} />
            {state.syncing ? tCompare('syncing') : tCompare('incrementalSync')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={state.syncing || !state.connectId}
                className="gap-2 max-[768px]:min-h-[44px] max-[768px]:flex-1"
              >
                <IconRefresh className={cn(state.syncing && 'animate-spin')} />
                {state.syncing ? tCompare('syncing') : tCompare('fullSync')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tc('fullSyncConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                                  {tc('fullSyncConfirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleFullSync(side)}>{tc('fullSyncConfirmAction')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            size="sm"
            onClick={() => handleSearch(side)}
            disabled={state.loading || !state.connectId}
            className="gap-2 max-[768px]:min-h-[44px] max-[768px]:flex-1"
          >
            {state.loading ? <IconRefresh className="animate-spin" /> : <IconSearch />}
            {state.loading ? tCompare('searching') : tCompare('search')}
          </Button>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b border-border">
                  <th className="px-3 py-3 font-medium w-16 text-center">{t('type')}</th>
                  <th className="px-3 py-3 font-medium">{t('name')}</th>
                  <th className="px-3 py-3 font-medium">{t('startTime')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('distance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      {t('loadingActivity')}
                    </td>
                  </tr>
                ) : state.activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      {t('noActivityFound')}
                    </td>
                  </tr>
                ) : (
                  state.activities.map((act, i) => (
                    <Dialog
                      key={act.activity_id || i}
                      onOpenChange={(open) => {
                        if (open) {
                          fetchActivityDetails(act.id);
                          setPushResult(null);
                        } else {
                          setSelectedDetail(null);
                          setPushResult(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <tr className="hover:bg-muted/30 even:bg-muted/20 transition-colors cursor-pointer group">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black">
                                <ActivitySportIcon
                                  sportType={act.sport_type_raw}
                                  className="h-3.5 w-3.5 text-white"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground group-hover:text-primary group-hover:underline transition-all truncate max-w-[200px]">
                              {act.activity_name}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                            <div className="font-mono text-xs">
                              {dayjs(act.start_time_local).format('YYYY-MM-DD HH:mm')}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground font-mono text-right whitespace-nowrap">
                            {formatDistance(act.distance_meters)}
                          </td>
                        </tr>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl max-h-3xl flex flex-col">
                        <DialogHeader>
                          <DialogTitle className="text-xl flex items-center gap-2">
                            {act.source_type} - {act.activity_name} - {dayjs(act.start_time_local).format('YYYY-MM-DD HH:mm')}
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            {tCompare('rawDataHint')}
                          </DialogDescription>
                        </DialogHeader>

                        {loadingDetail ? (
                          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
                            <IconRefresh className="animate-spin mr-2" size={20} />
                            {tCompare('loadingDetails')}
                          </div>
                        ) : selectedDetail ? (
                          <div className="flex-1 overflow-auto px-6 py-4">
                            <pre className="text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                              {JSON.stringify(selectedDetail, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {selectedDetail && (
                          <div className="mt-auto px-6 pt-4 pb-2 border-t border-border bg-background">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                {getPushTargets(Number(state.connectId)).map((target) => (
                                  <button
                                    key={target.id}
                                    onClick={() => handlePushToPlatform(act.id, target.id)}
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
          </div>

          <Pagination
            total={state.total}
            page={state.page}
            limit={state.limit}
            onPageChange={(page) => handlePageChange(side, page)}
            onLimitChange={(limit) => handleLimitChange(side, limit)}
          />
        </div>

        {!isLeft && (
          <div className="text-xs text-muted-foreground text-right">
            {tCompare('totalRecords', { count: state.total })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'p-6 mx-auto bg-slate-50/50 dark:bg-background min-h-screen text-sm transition-all duration-300',
        layout === 'fixed' ? 'max-w-7xl' : 'max-w-none w-full'
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable('left')}
        {renderTable('right')}
      </div>
    </div>
  );
}
