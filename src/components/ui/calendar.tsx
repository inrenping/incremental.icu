"use client";

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

// Monday ~ Sunday -> translation keys in the CalendarPage namespace
const WEEKDAY_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;

interface CalendarProps {
  /** Currently selected date (day precision) */
  selected?: dayjs.Dayjs | null;
  /** Called when a day is picked */
  onSelect?: (date: dayjs.Dayjs) => void;
  className?: string;
}

/** Lightweight month calendar with prev/next month navigation (weeks start on Monday) */
export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const t = useTranslations('CalendarPage');
  const locale = useLocale();
  const [view, setView] = useState(dayjs(selected || dayjs()).startOf('month'));
  const today = dayjs();

  const daysInMonth = view.daysInMonth();
  const firstWeekday = view.startOf('month').day(); // 0=Sun
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1; // align to Monday

  const cells: (dayjs.Dayjs | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => view.date(i + 1)),
  ];

  const selectedStr = selected?.format('YYYY-MM-DD');
  const todayStr = today.format('YYYY-MM-DD');

  return (
    <div className={cn('w-fit p-3', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setView(view.subtract(1, 'month'))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {locale === 'zh' ? view.format('YYYY年M月') : view.format('MMMM YYYY')}
        </div>
        <button
          type="button"
          onClick={() => setView(view.add(1, 'month'))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="py-1 text-center text-xs text-muted-foreground">
            {t(key)}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const dateStr = cell.format('YYYY-MM-DD');
          const isSelected = dateStr === selectedStr;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect?.(cell)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-foreground',
                isSelected &&
                  'bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                isToday && !isSelected && 'border border-primary text-primary'
              )}
            >
              {cell.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
