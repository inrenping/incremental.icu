'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  IconArrowRight,
  IconPlus,
  IconX,
  IconClock,
} from '@tabler/icons-react';

interface AppConfig {
  id: number;
  source_type: string;
  region: string;
  account: string;
  is_active: boolean;
  master: boolean;
}

interface TaskItemData {
  id?: number;
  connect_source_id: number;
  connect_target_id: number;
}

interface TaskData {
  id: number;
  user_id: number;
  hours: number[] | null;
  hour?: number;
  is_active: boolean;
  created_at: string;
  items: TaskItemData[];
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData | null;
  apps: AppConfig[];
  onSuccess: () => void;
}

// 单任务执行次数上限：同步对数 × 触发小时数（与后端约定一致）
const MAX_EXECUTIONS_PER_DAY = 8;

// 每天最多展示的推荐小时（与截图交互一致：默认预选 08 / 20）
const DEFAULT_HOURS = [8, 20];

export function TaskDialog({ open, onOpenChange, task, apps, onSuccess }: TaskDialogProps) {
  const [pairs, setPairs] = useState<TaskItemData[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [pendingSource, setPendingSource] = useState('');
  const [pendingTarget, setPendingTarget] = useState('');
  const [loading, setLoading] = useState(false);

  const totalExecutions = pairs.length * hours.length;
  const canAddPairNow = (pairs.length + 1) * Math.max(hours.length, 1) <= MAX_EXECUTIONS_PER_DAY;
  const canAddHour = (hours.length + 1) * Math.max(pairs.length, 1) <= MAX_EXECUTIONS_PER_DAY;

  useEffect(() => {
    if (!open) return;
    if (task) {
      setPairs(task.items.map((it) => ({ ...it })));
      setHours(task.hours ?? (task.hour != null ? [task.hour] : []));
      setIsActive(task.is_active);
    } else {
      setPairs([]);
      setHours([...DEFAULT_HOURS]);
      setIsActive(true);
    }
    setPendingSource('');
    setPendingTarget('');
  }, [open, task]);

  const resetState = () => {
    setPairs([]);
    setHours([]);
    setIsActive(true);
    setPendingSource('');
    setPendingTarget('');
  };

  const getAppLabel = (app: AppConfig) => {
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''} - ${app.account || `ID: ${app.id}`}`;
  };

  const getAppShort = (id: number) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return `ID: ${id}`;
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''}`;
  };

  const handleAddPair = () => {
    if (!pendingSource || !pendingTarget) {
      toast.error('请先选择源账号和目标账号');
      return;
    }
    if (pendingSource === pendingTarget) {
      toast.error('源账号与目标账号不能相同');
      return;
    }
    if (pairs.some((p) => p.connect_source_id.toString() === pendingSource && p.connect_target_id.toString() === pendingTarget)) {
      toast.error('该同步配置已存在');
      return;
    }
    if (!canAddPairNow) {
      toast.error(`同步配置数 × 执行时间数不能超过 ${MAX_EXECUTIONS_PER_DAY} 次/天`);
      return;
    }
    setPairs([
      ...pairs,
      { connect_source_id: parseInt(pendingSource), connect_target_id: parseInt(pendingTarget) },
    ]);
    setPendingSource('');
    setPendingTarget('');
  };

  const handleRemovePair = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  // 已选好但还没点「+」添加的同步对
  const pendingPair =
    pendingSource && pendingTarget && pendingSource !== pendingTarget
      ? {
          source: parseInt(pendingSource),
          target: parseInt(pendingTarget),
        }
      : null;
  const pendingDuplicate =
    pendingPair !== null &&
    pairs.some(
      (p) =>
        p.connect_source_id === pendingPair.source &&
        p.connect_target_id === pendingPair.target
    );
  const pendingFitsQuota =
    pendingPair !== null &&
    (pairs.length + 1) * Math.max(hours.length, 1) <= MAX_EXECUTIONS_PER_DAY;

  const toggleHour = (hour: number) => {
    if (hours.includes(hour)) {
      setHours(hours.filter((h) => h !== hour).sort((a, b) => a - b));
    } else {
      if (!canAddHour) {
        toast.error(`同步配置数 × 执行时间数不能超过 ${MAX_EXECUTIONS_PER_DAY} 次/天`);
        return;
      }
      setHours([...hours, hour].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    // 选好了但没点「+」的同步对（下拉层会吃掉紧随其后的那一次点击），这里兜底自动加入
    let finalPairs = pairs;
    if (pendingPair && !pendingDuplicate) {
      if (!pendingFitsQuota) {
        toast.error(
          `待添加的同步配置会超出每日上限（${MAX_EXECUTIONS_PER_DAY} 次/天），请先减少执行时间`
        );
        return;
      }
      finalPairs = [
        ...pairs,
        {
          connect_source_id: pendingPair.source,
          connect_target_id: pendingPair.target,
        },
      ];
      setPairs(finalPairs);
      setPendingSource('');
      setPendingTarget('');
      toast.info(
        `已自动添加未确认的同步配置：${getAppShort(pendingPair.source)} → ${getAppShort(pendingPair.target)}`
      );
    }

    if (finalPairs.length === 0) {
      toast.error('请至少添加一条同步配置（源 -> 目标）');
      return;
    }
    if (hours.length === 0) {
      toast.error('请至少选择一个执行时间');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: task?.id || undefined,
        hours,
        items: finalPairs.map((p) => ({
          connect_source_id: p.connect_source_id,
          connect_target_id: p.connect_target_id,
        })),
        is_active: isActive,
      };
      // 排查用：确认提交时到底带了几条同步配置
      console.debug('[task-dialog] save payload', JSON.stringify(payload));

      const response = await authFetch('/api/v1/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.status === 'success') {
        // 回读校验：服务端保存的条数与提交不一致时明确提示，避免"看着成功了实际少存"
        const savedCount = Array.isArray(result.data?.items) ? result.data.items.length : -1;
        if (savedCount >= 0 && savedCount !== payload.items.length) {
          toast.warning(
            `服务端只保存了 ${savedCount} 条同步配置（本次提交 ${payload.items.length} 条），请刷新页面确认`
          );
        }
        toast.success(task ? '任务已更新' : '任务已创建');
        // 先刷新列表再关闭，避免关闭后列表仍是旧数据
        await onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const activeApps = apps.filter((a) => a.is_active);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '新建任务'}</DialogTitle>
          <DialogDescription>
            {task ? '修改定时任务的同步配置与触发时间' : '创建一个多账号、多时间点的数据同步定时任务'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* 执行次数提示 */}
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              totalExecutions > MAX_EXECUTIONS_PER_DAY
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'bg-muted/50 text-muted-foreground'
            )}
          >
            每日执行额度：{pairs.length || 0} 条同步 × {hours.length || 0} 个时间 = {totalExecutions} 次
            （上限 {MAX_EXECUTIONS_PER_DAY} 次）
          </div>

          {/* 同步配置（源 -> 目标） */}
          <div className="grid gap-2">
            <Label>同步配置（{pairs.length}）</Label>
            {pairs.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {pairs.map((pair, index) => (
                  <div
                    key={`${pair.connect_source_id}-${pair.connect_target_id}-${index}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm"
                  >
                    <span className="font-medium break-all">{getAppShort(pair.connect_source_id)}</span>
                    <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium break-all">{getAppShort(pair.connect_target_id)}</span>
                    <button
                      type="button"
                      className="ml-auto rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemovePair(index)}
                      disabled={loading}
                      aria-label="删除同步配置"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Select value={pendingSource} onValueChange={setPendingSource} disabled={loading || !canAddPairNow}>
                <SelectTrigger className="min-w-0 flex-1 overflow-hidden [&>span]:truncate [&>span]:text-left">
                  <SelectValue placeholder="选择源账号" />
                </SelectTrigger>
                <SelectContent>
                  {activeApps.map((app) => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {getAppLabel(app)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <IconArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={pendingTarget} onValueChange={setPendingTarget} disabled={loading || !canAddPairNow}>
                <SelectTrigger className="min-w-0 flex-1 overflow-hidden [&>span]:truncate [&>span]:text-left">
                  <SelectValue placeholder="选择目标账号" />
                </SelectTrigger>
                <SelectContent>
                  {activeApps
                    .filter((app) => app.id.toString() !== pendingSource)
                    .map((app) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {getAppLabel(app)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleAddPair}
                disabled={loading || !pendingSource || !pendingTarget || !canAddPairNow}
                aria-label="添加同步配置"
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
            {!canAddPairNow && (
              <p className="text-xs text-muted-foreground">
                已达每日执行上限（{MAX_EXECUTIONS_PER_DAY} 次/天），减少执行时间后才能继续添加同步配置
              </p>
            )}
            {pendingPair && !pendingDuplicate && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                已选择 {getAppShort(pendingPair.source)} → {getAppShort(pendingPair.target)}
                ，记得点「+」加入（保存时会自动加入）
              </p>
            )}
            {pendingDuplicate && (
              <p className="text-xs text-muted-foreground">该同步配置已在列表中</p>
            )}
          </div>

          {/* 触发时间（0-23 小时网格多选） */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                执行时间（{hours.length}）
              </Label>
              <span className="text-xs text-muted-foreground">点击小时可调整，每天最多 2 个时间点推荐</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {Array.from({ length: 24 }, (_, hour) => {
                const selected = hours.includes(hour);
                const disabled = !selected && !canAddHour;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => toggleHour(hour)}
                    aria-pressed={selected}
                    className={cn(
                      'h-9 rounded-md border text-sm font-medium tabular-nums transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : disabled
                          ? 'cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/40'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 启用开关 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              disabled={loading}
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
                isActive ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  isActive ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <Label className="text-sm font-medium leading-none cursor-pointer" onClick={() => !loading && setIsActive(!isActive)}>
              {isActive ? '已启用' : '已停用'}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={loading || pairs.length === 0 || hours.length === 0 || totalExecutions > MAX_EXECUTIONS_PER_DAY}
            className="w-full sm:w-auto"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
