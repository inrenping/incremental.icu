'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useLayout } from "@/hooks/use-layout";
import Link from "next/link";
import docMenu from "@/lib/doc-menu.json";
import {
  IconPlus,
  IconClock,
  IconSourceCode,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { TaskDialog } from "@/components/dash/task-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppConfig {
  id: number;
  user_id: number;
  guid: string | null;
  account: string;
  source_type: string;
  region: string;
  is_active: boolean;
  master: boolean;
}

interface TaskItemData {
  id: number;
  connect_source_id: number;
  connect_target_id: number;
}

interface TaskItem {
  id: number;
  user_id: number;
  hours: number[] | null;
  hour?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  items: TaskItemData[];
}

export default function TasksPage() {
  const t = useTranslations('DashPage');
  const { layout } = useLayout();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaskItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/task');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      if (result.status === "success") {
        setTasks(result.data || []);
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
      toast.error(t('fetchTasksError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchApps = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      }
    } catch (err) {
      console.error("Fetch apps error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchApps();
  }, [fetchTasks, fetchApps]);

  const getAppDisplay = (id: number) => {
    const app = apps.find(a => a.id === id);
    if (!app) return `ID: ${id}`;
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''}`;
  };

  const getTaskHours = (task: TaskItem): number[] =>
    task.hours ?? (task.hour != null ? [task.hour] : []);

  const getTaskExecutions = (task: TaskItem): number =>
    task.items.length * getTaskHours(task).length;

  const handleToggleActive = async (task: TaskItem) => {
    const nextActive = !task.is_active;
    // 乐观更新，失败后回滚
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_active: nextActive } : t))
    );
    try {
      const response = await authFetch('/api/v1/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          hours: getTaskHours(task),
          items: task.items.map((it) => ({
            connect_source_id: it.connect_source_id,
            connect_target_id: it.connect_target_id,
          })),
          is_active: nextActive,
        }),
      });
      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || '操作失败');
      }
      toast.success(nextActive ? t('taskEnabled') : t('taskDisabled'));
    } catch (err: unknown) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_active: !nextActive } : t))
      );
      toast.error(err instanceof Error ? err.message : t('fetchTasksError'));
    }
  };

  const handleDeleteTask = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      const response = await authFetch(`/api/v1/task/${target.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || '删除失败');
      }
      setTasks((prev) => prev.filter((t) => t.id !== target.id));
      toast.success(t('deleteSuccess'));
      setPendingDelete(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-row gap-6 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      {/* Left side navigation menu */}
      <aside className="hidden lg:block w-40 shrink-0">
        <div className="sticky top-10">
          <nav className="flex flex-col gap-4 text-muted-foreground/80">
            {docMenu.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {section.divider && sectionIndex > 0 && (
                  <div className="border-t border-border/60" />
                )}
                <div className="flex flex-col gap-3">
                  {section.items.map((item, itemIndex) => (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className="hover:text-primary transition-colors"
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-8 py-4 md:gap-6 md:py-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold">{t('taskTitle')}</h1>
              <Button
                onClick={() => {
                  setCurrentTask(null);
                  setDialogOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4 mr-2" />
                {t('createTask')}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('taskDescription')}
            </p>
          </div>

          <section>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('loading')}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('noTasks', { action: t('createTask') })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <div className="flex items-center gap-6 p-6">
                      <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                        <IconClock className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{t('taskCardTitle', { id: task.id })}</CardTitle>
                          {/* 启用开关：任务名右侧 */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={task.is_active}
                            aria-label={task.is_active ? t('taskEnabled') : t('taskDisabled')}
                            onClick={() => handleToggleActive(task)}
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                              task.is_active ? 'bg-primary' : 'bg-input'
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                                task.is_active ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </button>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "gap-1",
                              task.is_active
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                                : "bg-gray-50 text-gray-500 dark:bg-gray-950/30 dark:text-gray-400 border-gray-200"
                            )}
                          >
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              task.is_active ? "bg-emerald-500" : "bg-gray-400"
                            )} />
                            {task.is_active ? t('taskEnabled') : t('taskDisabled')}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* 同步配置列表（源 -> 目标） */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                            {task.items.map((item, idx) => (
                              <div key={`${item.id ?? idx}`} className="flex items-center gap-1.5 text-sm">
                                <IconSourceCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium">{getAppDisplay(item.connect_source_id)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium">{getAppDisplay(item.connect_target_id)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">{t('executionTime')}</span>
                              <span className="flex flex-wrap gap-1">
                                {getTaskHours(task).map((hour) => (
                                  <Badge key={hour} variant="outline" className="font-mono tabular-nums">
                                    {hour.toString().padStart(2, '0')}:00
                                  </Badge>
                                ))}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t('dailyExecutions', { count: getTaskExecutions(task) })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">{t('createdAt')}</span>
                              <span className="font-medium font-mono">{dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dash/task/${task.id}`)}
                        >
                          <IconHistory className="h-4 w-4 mr-1" />
                          {t('records')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCurrentTask(task);
                            setDialogOpen(true);
                          }}
                        >
                          {t('edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(task)}
                        >
                          <IconTrash className="h-4 w-4 mr-1" />
                          {t('delete')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <TaskDialog
            open={dialogOpen}
            onOpenChange={(val) => {
              setDialogOpen(val);
              if (!val) setCurrentTask(null);
            }}
            task={currentTask}
            apps={apps}
            onSuccess={fetchTasks}
          />

          <AlertDialog
            open={pendingDelete !== null}
            onOpenChange={(val) => {
              if (!val && !deleting) setPendingDelete(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('deleteConfirmTitle', { id: pendingDelete?.id ?? 0 })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteConfirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteTask();
                  }}
                  disabled={deleting}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {deleting ? t('deleting') : t('confirmDelete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
