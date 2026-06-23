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
import { Input } from '@/components/ui/input';
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

interface AppConfig {
  id: number;
  source_type: string;
  region: string;
  account: string;
  is_active: boolean;
  master: boolean;
}

interface TaskItem {
  id: number;
  user_id: number;
  connect_source_id: number;
  connect_target_id: number;
  hour: number;
  is_active: boolean;
  created_at: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskItem | null;
  apps: AppConfig[];
  onSuccess: () => void;
}

export function TaskDialog({ open, onOpenChange, task, apps, onSuccess }: TaskDialogProps) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [hour, setHour] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      setSourceId(task.connect_source_id.toString());
      setTargetId(task.connect_target_id.toString());
      setHour(task.hour.toString());
      setIsActive(task.is_active);
    } else if (open && !task) {
      setSourceId('');
      setTargetId('');
      setHour('1');
      setIsActive(true);
    }
  }, [open, task]);

  const resetState = () => {
    setSourceId('');
    setTargetId('');
    setHour('1');
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!sourceId || !targetId || !hour) {
      toast.error('请填写完整信息');
      return;
    }

    if (sourceId === targetId) {
      toast.error('数据源和目标不能相同');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: task?.id || undefined,
        connect_source_id: parseInt(sourceId),
        connect_target_id: parseInt(targetId),
        hour: parseInt(hour),
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
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const getAppLabel = (app: AppConfig) => {
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''} - ${app.account || `ID: ${app.id}`}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '新建任务'}</DialogTitle>
          <DialogDescription>
            {task ? '修改定时任务的配置参数' : '创建一个新的数据同步定时任务'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>账号</Label>
            <Select
              value={sourceId}
              onValueChange={setSourceId}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择数据源" />
              </SelectTrigger>
              <SelectContent>
                {apps.filter(a => a.is_active).map((app) => (
                  <SelectItem key={app.id} value={app.id.toString()}>
                    {getAppLabel(app)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>账号（Target）</Label>
            <Select
              value={targetId}
              onValueChange={setTargetId}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择目标" />
              </SelectTrigger>
              <SelectContent>
                {apps.filter(a => a.is_active && a.id.toString() !== sourceId).map((app) => (
                  <SelectItem key={app.id} value={app.id.toString()}>
                    {getAppLabel(app)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hour">执行时间</Label>
            <Input
              id="hour"
              type="number"
              min={1}
              max={168}
              placeholder="请输入执行时间"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              disabled={loading}
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                isActive ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  isActive ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <Label className="text-sm font-medium leading-none cursor-pointer" onClick={() => !loading && setIsActive(!isActive)}>
              {isActive ? '已启用' : '已停用'}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading || !sourceId || !targetId || !hour} className="w-full sm:w-auto">
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent >
    </Dialog >
  );
}
