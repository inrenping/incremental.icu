'use client';

import { ACTIVITY_TYPES, ActivityTypeIcon, type ActivityTypeEntry } from '@/lib/activity-icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectGroup,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IconSearch, IconRefresh } from '@tabler/icons-react';
import type { AppConfig } from '@/lib/activities';

interface ActivityFiltersProps {
  variant?: 'horizontal' | 'stacked' | 'responsive';
  apps: AppConfig[];
  appSelected: string | null;
  startDate: string;
  endDate: string;
  sportType: string;
  searchName: string;
  loading: boolean;
  syncing: boolean;
  onPlatformChange: (id: string) => void;
  onDateChange: (key: 'startDate' | 'endDate', value: string) => void;
  onSportTypeChange: (value: string) => void;
  onSearchNameChange: (value: string) => void;
  onSearch: () => void;
  onPull: () => void;
  onFullPull: () => void;
  viewToggle?: React.ReactNode;
}

export function ActivityFilters({
  variant = 'horizontal',
  apps,
  appSelected,
  startDate,
  endDate,
  sportType,
  searchName,
  loading,
  syncing,
  onPlatformChange,
  onDateChange,
  onSportTypeChange,
  onSearchNameChange,
  onSearch,
  onPull,
  onFullPull,
  viewToggle,
}: ActivityFiltersProps) {
  const isStacked = variant === 'stacked';
  const isResponsive = variant === 'responsive';

  const accountSelect = (
    <Select value={appSelected || ''} onValueChange={onPlatformChange}>
      <SelectTrigger
        className={cn(
          'bg-background',
          isStacked ? 'w-full' : isResponsive ? 'w-full md:w-[300px]' : 'w-[300px]'
        )}
      >
        <SelectValue placeholder="选择平台账号" />
      </SelectTrigger>
      <SelectContent>
        {apps.filter((app) => app.is_active).map((app) => (
          <SelectItem key={app.id} value={app.id.toString()}>
            <span className="font-semibold uppercase">
              {app.source_type}-{app.region}
            </span>
            <span className="ml-2 text-muted-foreground text-xs">({app.account})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const dateInputs = (
    <div className={cn('flex items-center gap-2', isStacked && 'w-full')}>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onDateChange('startDate', e.target.value)}
        className="flex-1 min-w-0 px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="text-muted-foreground shrink-0">-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onDateChange('endDate', e.target.value)}
        className="flex-1 min-w-0 px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );

  const sportSelect = (
    <Select value={sportType || 'all'} onValueChange={onSportTypeChange}>
      <SelectTrigger
        className={cn(
          'bg-background',
          isStacked ? 'w-full' : isResponsive ? 'w-full md:w-[160px]' : 'w-[160px]'
        )}
      >
        <SelectValue placeholder="全部运动" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部运动</SelectItem>
        {ACTIVITY_TYPES.map((group: ActivityTypeEntry) => {
          const childKeys =
            group.children && group.children.length > 0
              ? Array.from(new Set(group.children.map((c) => c.key))).join(',')
              : String(group.key);

          return (
            <SelectGroup key={group.name}>
              <SelectItem value={childKeys} className="font-bold uppercase">
                <span className="flex items-center gap-2">
                  <ActivityTypeIcon name={group.name} className="h-4 w-4 shrink-0" />
                  {group.name_zh}
                </span>
              </SelectItem>
              {group.children?.map((item, index) => (
                <SelectItem
                  key={`${group.name}-${item.key}-${index}`}
                  value={String(item.key)}
                  className="pl-6"
                >
                  <span className="flex items-center gap-2">
                    <ActivityTypeIcon name={item.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {item.name_zh}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );

  const searchInput = (
    <div className={cn('relative', isStacked ? 'w-full' : isResponsive ? 'w-full md:flex-1 md:max-w-xs' : 'flex-1 max-w-xs')}>
      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <input
        type="text"
        value={searchName}
        onChange={(e) => onSearchNameChange(e.target.value)}
        placeholder="搜索关键词..."
        className="w-full pl-9 pr-3 py-1.5 border border-border bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );

  const syncButtons = (
    <>
      <Button variant="outline" size="sm" onClick={onPull} disabled={syncing} className="gap-2">
        <IconRefresh className={cn(syncing && 'animate-spin')} />
        {syncing ? '同步中...' : '增量同步'}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={syncing} className="gap-2">
            <IconRefresh className={cn(syncing && 'animate-spin')} />
            {syncing ? '同步中...' : '全量同步'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认进行全量同步？</AlertDialogTitle>
            <AlertDialogDescription>
              全量同步将尝试获取该平台下的所有历史活动数据。由于数据量可能较大，同步过程可能会比较缓慢，且在网络不稳定的情况下存在失败风险。建议在网络环境良好时进行此操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onFullPull}>确认同步</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button size="sm" onClick={onSearch} disabled={loading} className="gap-2">
        {loading ? <IconRefresh className="animate-spin" /> : <IconSearch />}
        {loading ? '查询中...' : '查询'}
      </Button>
      {viewToggle}
    </>
  );

  if (isStacked || isResponsive) {
    return (
      <>
        <div
          className={cn(
            'bg-card dark:bg-muted/20 p-3 rounded-lg border border-border shadow-sm space-y-3',
            isResponsive && 'md:hidden'
          )}
        >
          {accountSelect}
          {dateInputs}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sportSelect}
            {searchInput}
          </div>
          <div className="flex flex-wrap gap-2">{syncButtons}</div>
        </div>
        {isResponsive && (
          <div className="hidden md:flex bg-card dark:bg-muted/20 p-2 rounded-lg border border-border shadow-sm items-center gap-3 flex-wrap">
            {accountSelect}
            <div className="w-px h-6 bg-border shrink-0 mx-1" />
            {dateInputs}
            <div className="w-px h-6 bg-border shrink-0 mx-1" />
            {sportSelect}
            {searchInput}
            <div className="ml-auto flex items-center gap-2">{syncButtons}</div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-card dark:bg-muted/20 p-2 rounded-lg border border-border shadow-sm mb-4 flex items-center gap-3 flex-wrap">
      {accountSelect}
      <div className="w-px h-6 bg-border shrink-0 mx-1" />
      {dateInputs}
      <div className="w-px h-6 bg-border shrink-0 mx-1" />
      {sportSelect}
      {searchInput}
      <div className="ml-auto flex items-center gap-2">{syncButtons}</div>
    </div>
  );
}
