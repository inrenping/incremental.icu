'use client';

import { useLayout } from '@/hooks/use-layout';
import { cn } from '@/lib/utils';
import { SleepCalendarPanel } from '@/components/dash/sleep-calendar-panel';

// /sleep/calendar：睡眠日历（月历 + 点击弹窗看当日详情）独立页面
export default function SleepCalendarPage() {
  const { layout } = useLayout();
  return (
    <div
      className={cn(
        'p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 w-full text-sm transition-all duration-300',
        layout === 'fixed' ? 'max-w-7xl' : ''
      )}
    >
      <SleepCalendarPanel />
    </div>
  );
}
