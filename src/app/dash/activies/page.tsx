'use client';
import React from 'react';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft
} from '@tabler/icons-react';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";

const ActivityListPage = () => {
  const { layout } = useLayout();
  const platforms = [
    { name: '佳明国际版', count: '156 条', active: true },
    { name: '佳明国内版', count: '未连接', active: false },
    { name: '高驰', count: '89 条', active: false },
  ];

  const activities = [
    {
      title: '宁波市 跑步',
      date: '2024-04-30',
      time: '06:32',
      type: '跑步',
      duration: '42:15',
      distance: '8.50 km',
      elevation: '45 m',
      platform: '佳明国际版',
      platformId: 'garmin_intl_8902',
    },
    {
      title: '温州市 远足',
      date: '2024-04-29',
      time: '18:15',
      type: '远足',
      duration: '1:28:03',
      distance: '12.30 km',
      elevation: '680 m',
      platform: '佳明国际版',
      platformId: 'garmin_intl_8891',
    },
    {
      title: '宁波市 游泳',
      date: '2024-04-28',
      time: '07:01',
      type: '游泳',
      duration: '32:50',
      distance: '1,500 m',
      elevation: '--',
      platform: '佳明国际版',
      platformId: 'garmin_intl_8875',
    },
    {
      title: '宁波市 跑步',
      date: '2024-04-27',
      time: '06:45',
      type: '跑步',
      duration: '55:22',
      distance: '10.01 km',
      elevation: '20 m',
      platform: '佳明国际版',
      platformId: 'garmin_intl_8860',
    },
    {
      title: '北京市 越野跑',
      date: '2024-04-26',
      time: '10:30',
      type: '越野跑',
      duration: '2:15:40',
      distance: '21.10 km',
      elevation: '1240 m',
      platform: '佳明国际版',
      platformId: 'garmin_intl_8833',
    }
  ];


  return (
    <div className={cn(
      "p-6 mx-auto bg-gray-50 min-h-screen text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-[1400px]" : "max-w-none w-full"
    )}>
      {/* 平台选择器 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
        <div className="flex gap-4">
          {platforms.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <button className={`px-4 py-1.5 rounded-md border ${p.active ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                {p.name}
              </button>
              <span className={`mt-2 text-xs ${p.count === '未连接' ? 'text-gray-400' : 'text-gray-600'}`}>
                {p.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 flex gap-3">
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
      </div>

      {/* 活动列表表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3 font-medium w-24">类型</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">耗时</th>
              <th className="px-4 py-3 font-medium">距离</th>
              <th className="px-4 py-3 font-medium">海拔</th>
              <th className="px-4 py-3 font-medium">平台</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activities.map((act, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
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
                  {act.duration}
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
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center text-gray-600">
          {/* 左侧：统计与配置 */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-1">
              共 <span className="font-medium text-gray-900">1,234</span> 条
            </div>
            <button className="flex items-center gap-1 px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              20 条/页 <IconChevronDown size={14} />
            </button>
            <div>
              第 <span className="text-gray-900 font-medium">12</span> 页 / 共 62 页
            </div>
          </div>

          {/* 右侧：导航与跳转 */}
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors">
              <IconChevronsLeft size={18} />
            </button>
            <button className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors">
              <IconChevronLeft size={18} />
            </button>
            <button className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center transition-colors">
              <IconChevronRight size={18} />
            </button>
            <div className="flex items-center h-9 border border-gray-200 rounded px-3 bg-gray-50/50 ml-1">
              <span>跳转到 第</span>
              <input type="text" className="w-10 mx-1 text-center border-b border-gray-300 bg-transparent outline-none focus:border-blue-500 transition-colors font-medium text-gray-900" defaultValue="12" />
              <span>页</span>
            </div>
            <button className="px-5 h-9 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors font-medium">
              GO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityListPage;
