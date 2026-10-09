'use client';

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { AppConnectionDialog } from "@/components/dash/connection-dialog";
import { AppCard } from "@/components/dash/app-card";
import { AppConfig } from "@/app/dash/page";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function AccountsPage() {
  const t = useTranslations('DashPage')
  const tPage = useTranslations('AccountsPage')
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<AppConfig | null>(null);

  const fetchAppsStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data = await response.json();
      setApps(data);
    } catch (err: unknown) {
      console.error("Fetch status error:", err);
      toast.error(tPage('statusFailed'));
    }
  }, [tPage]);

  useEffect(() => {
    fetchAppsStatus();
  }, [fetchAppsStatus]);

  // 拖拽传感器：留一点激活距离，避免鼠标按下即触发，误触按钮时不至于把卡片拖走
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 拖拽结束：本地先换序（即时反馈），再持久化到后端。
  // 失败时回滚到拖拽前的顺序，避免界面和数据库不一致。
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = apps.findIndex((app) => app.id === active.id);
    const newIndex = apps.findIndex((app) => app.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = apps;
    const next = arrayMove(apps, oldIndex, newIndex);
    setApps(next);

    try {
      const response = await authFetch('/api/v1/base/reorderConnectConfigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connect_ids: next.map((app) => app.id) }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success(tPage('reorderSuccess'));
    } catch (err: unknown) {
      console.error("Reorder accounts error:", err);
      setApps(previous);
      toast.error(tPage('reorderFailed'));
    }
  };

  // Refresh the stored OAuth credentials for one app.
  const handleRefreshAuth = async (id: number) => {
    try {
      const response = await authFetch(`/api/v1/base/relogin?connect_id=${id}`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.status === "success") {
        toast.success(tPage('refreshSuccess'));
        fetchAppsStatus();
      } else {
        toast.error(result.message || tPage('refreshFailed'));
      }

    } catch (err: unknown) {
      console.error("Refresh auth error:", err);
      const message = err instanceof Error ? err.message : t("refreshFailedTryAgain");
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-8 py-4 md:gap-6 md:py-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold">{tPage('title')}</h1>
          <Button
            onClick={() => {
              setCurrentApp({ source_type: 'garmin_cn' } as unknown as AppConfig);
              setOpen(true);
            }}
          >
            <IconPlus className="h-4 w-4 mr-2" />
            {t("connectAccount")}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">{tPage('grantedDesc')}</p>
        {apps.length > 1 && (
          <p className="text-muted-foreground mt-1 text-xs">{tPage('reorderHint')}</p>
        )}
      </div>
      <section>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={apps.map((app) => app.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4">
              {apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onConnect={(selectedApp) => {
                    setCurrentApp(selectedApp);
                    setOpen(true);
                  }}
                  onRefresh={(id) => handleRefreshAuth(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <AppConnectionDialog
        key={currentApp?.id}
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) setCurrentApp(null);
        }}
        app={currentApp}
        action={currentApp?.id ? 'update' : 'add'}
        onSuccess={fetchAppsStatus}
      />
    </div>
  );
}
