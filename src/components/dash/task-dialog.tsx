'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { IconArrowRight, IconClock } from '@tabler/icons-react';

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
  /** 当前用户已有的全部任务，用于校验「不同任务的同步配置不能重复」 */
  tasks?: TaskData[];
}

// 每个任务只允许一条同步配置，因此单个任务的每日执行次数 = 触发小时数
const MAX_EXECUTIONS_PER_DAY = 3;
const MAX_HOURS = MAX_EXECUTIONS_PER_DAY;

// 新建任务时预选的时间点
const DEFAULT_HOURS = [8, 20];

export function TaskDialog({ open, onOpenChange, task, apps, onSuccess, tasks = [] }: TaskDialogProps) {
  // 单个任务只允许一条「源 -> 目标」同步配置
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [hours, setHours] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const totalExecutions = hours.length;
  const overLimit = hours.length > MAX_HOURS;
  const sameAccount = source !== '' && target !== '' && source === target;
  const pairReady = source !== '' && target !== '' && !sameAccount;
  const canAddHour = hours.length < MAX_HOURS;

  // 同一用户下，不同任务的「源 -> 目标」同步配置不能重复（编辑自身时排除自己）
  const conflictTaskId = useMemo(() => {
    if (!source || !target || source === target) return null;
    const sourceId = parseInt(source, 10);
    const targetId = parseInt(target, 10);
    const hit = tasks.find(
      (item) =>
        item.id !== task?.id &&
        item.items.some(
          (pair) =>
            pair.connect_source_id === sourceId && pair.connect_target_id === targetId
        )
    );
    return hit ? hit.id : null;
  }, [tasks, source, target, task?.id]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      const first = task.items?.[0];
      setSource(first ? first.connect_source_id.toString() : '');
      setTarget(first ? first.connect_target_id.toString() : '');
      setHours(task.hours ?? (task.hour != null ? [task.hour] : []));
      setIsActive(task.is_active);
    } else {
      setSource('');
      setTarget('');
      setHours([...DEFAULT_HOURS]);
      setIsActive(true);
    }
  }, [open, task]);

  const resetState = () => {
    setSource('');
    setTarget('');
    setHours([]);
    setIsActive(true);
  };

  const getAppLabel = (app: AppConfig) => {
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''} - ${app.account || `ID: ${app.id}`}`;
  };

  const toggleHour = (hour: number) => {
    if (hours.includes(hour)) {
      setHours(hours.filter((h) => h !== hour).sort((a, b) => a - b));
      return;
    }
    if (!canAddHour) {
      toast.error(`每个任务每天最多执行 ${MAX_EXECUTIONS_PER_DAY} 次，请先取消一个时间点`);
      return;
    }
    setHours([...hours, hour].sort((a, b) => a - b));
  };

  const handleSave = async () => {
    if (!source || !target) {
      toast.error('请选择源账号和目标账号');
      return;
    }
    if (source === target) {
      toast.error('源账号与目标账号不能相同');
      return;
    }
    if (hours.length === 0) {
      toast.error('请至少选择一个执行时间');
      return;
    }
    if (hours.length > MAX_HOURS) {
      toast.error(`每个任务每天最多执行 ${MAX_EXECUTIONS_PER_DAY} 次，请取消多余的时间点`);
      return;
    }
    if (conflictTaskId !== null) {
      toast.error(`该同步配置已在任务 #${conflictTaskId} 中配置过，不能重复`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: task?.id || undefined,
        hours,
        items: [
          {
            connect_source_id: parseInt(source, 10),
            connect_target_id: parseInt(target, 10),
          },
        ],
        is_active: isActive,
      };

      const response = await authFetch('/api/v1/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.status === 'success') {
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
            {task ? '修改该任务的同步配置与触发时间' : '创建一个定时数据同步任务'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* 执行额度提示 */}
          {overLimit ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              当前选了 {hours.length} 个时间点，已超过单个任务 {MAX_EXECUTIONS_PER_DAY} 次/天的上限，
              请取消多余的时间点后再保存。
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              本任务额度：1 条同步配置 × {hours.length || 0} 个时间 = {totalExecutions} 次/天
              （每个任务上限 {MAX_EXECUTIONS_PER_DAY} 次）
            </div>
          )}

          {/* 同步配置（源 -> 目标），每个任务只允许一条 */}
          <div className="grid gap-2">
            <Label>同步配置</Label>
            <div className="flex items-center gap-2">
              <Select
                value={source}
                onValueChange={setSource}
                disabled={loading}
              >
                <SelectTrigger
                  className={cn(
                    'min-w-0 flex-1 overflow-hidden [&>span]:truncate [&>span]:text-left',
                    sameAccount && 'border-destructive text-destructive'
                  )}
                >
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
              <Select value={target} onValueChange={setTarget} disabled={loading}>
                <SelectTrigger
                  className={cn(
                    'min-w-0 flex-1 overflow-hidden [&>span]:truncate [&>span]:text-left',
                    sameAccount && 'border-destructive text-destructive'
                  )}
                >
                  <SelectValue placeholder="选择目标账号" />
                </SelectTrigger>
                <SelectContent>
                  {activeApps
                    .filter((app) => app.id.toString() !== source)
                    .map((app) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {getAppLabel(app)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              每个任务仅支持一条「源 → 目标」同步配置，且不能与其它任务的配置重复；更多同步方向请新建任务。
            </p>
            {sameAccount && (
              <p className="text-xs text-destructive">源账号与目标账号不能相同</p>
            )}
            {conflictTaskId !== null && (
              <p className="text-xs text-destructive">
                该同步配置已在任务 #{conflictTaskId} 中配置过，请换个方向，或去编辑任务 #{conflictTaskId}。
              </p>
            )}
          </div>

          {/* 触发时间（0-23 小时网格多选，最多 3 个） */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                执行时间（{hours.length}/{MAX_HOURS}）
              </Label>
              <span className="text-xs text-muted-foreground">
                每天最多 {MAX_HOURS} 个时间点，即最多执行 {MAX_EXECUTIONS_PER_DAY} 次
              </span>
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
            <Label
              className="text-sm font-medium leading-none cursor-pointer"
              onClick={() => !loading && setIsActive(!isActive)}
            >
              {isActive ? '已启用' : '已停用'}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={
              loading ||
              !pairReady ||
              hours.length === 0 ||
              hours.length > MAX_HOURS ||
              conflictTaskId !== null
            }
            className="w-full sm:w-auto"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
