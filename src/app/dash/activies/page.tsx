'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from '@/lib/api';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";

interface Activity {
  title: string;
  date: string;
  time: string;
  type: string;
  workoutTime: string;
  totalTime: string;
  distance: string;
  elevation: string;
  platform: string;
  platformId: string;
  syncTime: string;
}

const ActivityListPage = () => {
  const { layout } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 获取分页和平台参数
  const platformSelected = searchParams.get('platform') || "garmin";
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('pageSize') || '20');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState('');

  const platforms = [
    { platform: "garmin", name: '佳明国际版' },
    { platform: "garmin_cn", name: '佳明中国版', },
    { platform: "coros", name: '高驰' },
  ].map(p => ({ ...p, active: p.platform === platformSelected }));

  // 动态修改页面标题
  useEffect(() => {
    const currentPlatform = platforms.find(p => p.platform === platformSelected);
    if (currentPlatform) {
      document.title = `活动列表 | ${currentPlatform.name}`;
    } else {
      document.title = '活动列表';
    }
    return () => { document.title = 'Incremental'; };
  }, [platformSelected, platforms]);

  // 对接后端分页接口
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      // 根据后端定义的参数名对接：platform, pageSize, pageCount
      const response = await authFetch(
        `/api/v1/settings/getActivitiesByPage?platform=${platformSelected}&pageSize=${limit}&pageCount=${page}`
      );
      const result = await response.json();
      if (result.status === "success") {
        setActivities(result.data);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }, [platformSelected, page, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handlePlatformChange = (platform: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('platform', platform);
    params.set('page', '1'); // 切换平台时重置页码
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', newLimit);
    params.set('page', '1'); // 切换每页条数时重置页码
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleJump = () => {
    const p = parseInt(jumpPageInput);
    if (!isNaN(p) && p > 0 && p <= totalPages) {
      handlePageChange(p);
      setJumpPageInput('');
    }
  };

  return (
    <div className={cn(
      "p-6 mx-auto bg-gray-50 min-h-screen text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-6xl" : "max-w-none w-full"
    )}>
      {/* 平台选择器 & 过滤栏 */}
      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm mb-4 flex items-center gap-3">
        <Menubar className="border-none shadow-none bg-transparent h-auto p-0">
          {platforms.map((p) => (
            <MenubarMenu key={p.platform}>
              <MenubarTrigger
                onClick={() => handlePlatformChange(p.platform)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 transition-all rounded-md",
                  p.active && "bg-gray-100 text-gray-900 font-semibold"
                )}
              >
                {p.name}
              </MenubarTrigger>
            </MenubarMenu>
          ))}
        </Menubar>

        <div className="w-px h-6 bg-gray-200 shrink-0 mx-1" />

        <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700">
          全部运动 <IconChevronDown size={14} />
        </button>
        <div className="relative flex-1 max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="搜索关键词..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={fetchActivities}
          className="ml-auto px-4 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
        >
          <IconSearch size={16} />
          查询
        </button>
      </div>

      {/* 活动列表表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3 font-medium w-24">类型</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">运动时间</th>
              <th className="px-4 py-3 font-medium">总时间</th>
              <th className="px-4 py-3 font-medium">距离</th>
              <th className="px-4 py-3 font-medium">海拔</th>
              <th className="px-4 py-3 font-medium">平台</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">同步时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  正在加载运动数据...
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  未找到相关运动记录
                </td>
              </tr>
            ) : (
              activities.map((act, i) => (
                <tr key={act.platformId || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span>{act.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{act.title}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="font-mono">{act.date}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">
                    {act.workoutTime}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">
                    {act.totalTime}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">
                    {act.distance}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">
                    {act.elevation}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {act.platform}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono text-xs">
                      {act.platformId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                    {act.syncTime}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center text-gray-600">
          {/* 左侧：统计与配置 */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-1">
              共 <span className="font-medium text-gray-900">{total}</span> 条
            </div>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm"
            >
              <option value="20">20 条/页</option>
              <option value="50">50 条/页</option>
              <option value="100">100 条/页</option>
            </select>
            <div>
              第 <span className="text-gray-900 font-medium">{page}</span> 页 / 共 {totalPages} 页
            </div>
          </div>

          {/* 右侧：导航与跳转 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50">
              <IconChevronsLeft size={18} />
            </button>
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50">
              <IconChevronLeft size={18} />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50">
              <IconChevronRight size={18} />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages}
              className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50">
              <IconChevronsRight size={18} />
            </button>
            <div className="flex items-center h-9 border border-gray-200 rounded px-3 bg-gray-50/50 ml-1">
              <span>跳转到 第</span>
              <input
                type="text"
                className="w-10 mx-1 text-center border-b border-gray-300 bg-transparent outline-none focus:border-blue-500 transition-colors font-medium text-gray-900"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              />
              <span>页</span>
            </div>
            <button
              onClick={handleJump}
              className="px-5 h-9 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors font-medium">
              GO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityListPage;
