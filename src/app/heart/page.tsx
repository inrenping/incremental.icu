'use client';

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { HeartRatePanel } from "@/components/dash/heart-rate-panel";

export default function HeartPage() {
  const { layout } = useLayout();
  return (
    <div className={cn(
      "p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 w-full text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : ""
    )}>
      <HeartRatePanel />
    </div>
  );
}
