'use client';

import React, { useState, useEffect } from "react";
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
  IconTargetArrow,
  IconHistory,
} from "@tabler/icons-react";
import { TaskDialog } from "@/components/dash/task-dialog";

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

interface TaskItem {
  id: number;
  user_id: number;
  connect_source_id: number;
  connect_target_id: number;
  hour: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function TasksPage() {
  const { layout } = useLayout();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchApps();
  }, []);

  const fetchTasks = async () => {
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
      toast.error("获取任务列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (response.ok) {
        const data = await response.json();
        setApps(data);
      }
    } catch (err) {
      console.error("Fetch apps error:", err);
    }
  };

  const getAppDisplay = (id: number) => {
    const app = apps.find(a => a.id === id);
    if (!app) return `ID: ${id}`;
    const name = app.source_type.toUpperCase();
    const region = app.region === 'cn' ? 'CN' : app.region === 'gobal' ? 'Global' : app.region;
    return `${name}${region ? ` (${region})` : ''}`;
  };

  return (
    <div className={cn(
      "flex flex-row gap-6 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      {/* 左侧自定义导航菜单 */}
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
              <h1 className="text-xl font-semibold">定时任务管理</h1>
              <Button
                onClick={() => {
                  setCurrentTask(null);
                  setDialogOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4 mr-2" />
                新建任务
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              配置数据同步任务，自动定时同步你的运动数据。
            </p>
          </div>

          <section>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                加载中...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无定时任务，点击"新建任务"开始配置
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
                          <CardTitle className="text-lg">任务 #{task.id}</CardTitle>
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
                            {task.is_active ? "启用" : "停用"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <IconSourceCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">账号 1</span>
                            <span className="font-medium">{getAppDisplay(task.connect_source_id)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <IconSourceCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">账号 2</span>
                            <span className="font-medium">{getAppDisplay(task.connect_target_id)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">执行时间</span>
                            <span className="font-medium">每天 {task.hour} 点</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">创建时间</span>
                            <span className="font-medium font-mono">{dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}</span>
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
                          记录
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCurrentTask(task);
                            setDialogOpen(true);
                          }}
                        >
                          编辑
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
        </div>
      </div>
    </div>
  );
}
