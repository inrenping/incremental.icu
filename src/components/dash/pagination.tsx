'use client';

import React, { useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: string) => void;
}

export const Pagination = ({
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) => {
  const [jumpPageInput, setJumpPageInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleJump = () => {
    const p = parseInt(jumpPageInput);
    if (!isNaN(p) && p > 0 && p <= totalPages) {
      onPageChange(p);
      setJumpPageInput('');
    }
  };

  return (
    <div className="px-6 py-4 bg-card border-t border-border flex justify-between items-center text-muted-foreground">
      {/* 左侧：统计与配置 */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-1">
          共 <span className="font-medium text-foreground">{total}</span> 条
        </div>
        <select
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
          className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-background outline-none focus:ring-1 focus:ring-ring cursor-pointer text-sm"
        >
          <option value="10">10 条/页</option>
          <option value="20">20 条/页</option>
          <option value="50">50 条/页</option>
          <option value="100">100 条/页</option>
        </select>
        <div>
          第 <span className="text-foreground font-medium">{page}</span> 页 / 共 {totalPages} 页
        </div>
      </div>

      {/* 右侧：导航与跳转 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="w-9 h-9 border border-border rounded hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <IconChevronsLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-9 h-9 border border-border rounded hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <IconChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-9 h-9 border border-border rounded hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <IconChevronRight size={18} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="w-9 h-9 border border-border rounded hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <IconChevronsRight size={18} />
        </button>
        <div className="flex items-center h-9 border border-border rounded px-3 bg-muted/30 ml-1">
          <span>跳转到 第</span>
          <input
            type="text"
            className="w-10 mx-1 text-center border-b border-border bg-transparent outline-none focus:border-primary transition-colors font-medium text-foreground"
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          />
          <span>页</span>
        </div>
        <button
          onClick={handleJump}
          className="px-5 h-9 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium"
        >
          GO
        </button>
      </div>
    </div>
  );
};