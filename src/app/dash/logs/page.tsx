'use client';

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { SyncLogs } from "@/components/dash/sync-logs";

export default function LogsPage() {
  const { layout } = useLayout();

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <SyncLogs />
    </div>
  );
}