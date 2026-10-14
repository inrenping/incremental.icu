'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

type NoticeVariant = 'info' | 'warning';

const VARIANT_STYLES: Record<
  NoticeVariant,
  { wrap: string; icon: React.ReactNode }
> = {
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200',
    icon: <IconInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />,
  },
  warning: {
    wrap: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
    icon: <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />,
  },
};

export function NoticeBar({
  variant = 'info',
  children,
  className,
}: {
  variant?: NoticeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed',
        styles.wrap,
        className
      )}
    >
      {styles.icon}
      <div>{children}</div>
    </div>
  );
}
