'use client';

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface LogLine {
  time: string;
  text: string;
  level: "info" | "warn" | "error" | "success";
}

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogLine[];
  status: "idle" | "syncing" | "done" | "error";
}

export function TerminalModal({ isOpen, onClose, logs, status }: TerminalModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // 核心：每次有新日志进来，平滑滚动触底
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[450px] bg-[#1e1e1e] border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-sm">

        {/* 终端头部工具栏 - 经典三色圆点 */}
        <div className="bg-[#2d2d2d] px-4 py-3 flex items-center justify-between border-b border-zinc-800 select-none">
          <div className="flex items-center gap-2">
            <span
              className={cn("w-3 h-3 rounded-full bg-[#ff5f56] cursor-pointer hover:opacity-80 transition-opacity")}
              onClick={onClose}
              title="Close"
            />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] opacity-60" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] opacity-60" />
          </div>
          <span className="text-zinc-400 font-mono text-xs tracking-wider absolute left-1/2 -translate-x-1/2">
            Console Sync Terminal — v1.0
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            {status.toUpperCase()}
          </span>
        </div>

        {/* 终端内容区 */}
        <div
          ref={bodyRef}
          className="flex-1 p-4 bg-[#151515] overflow-y-auto font-mono text-zinc-300 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800"
        >
          {logs.map((log, index) => (
            <div key={index} className="leading-relaxed break-all flex items-start gap-2">
              <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
              <span className={cn(
                "flex-1",
                log.level === "info" && "text-zinc-300",
                log.level === "success" && "text-emerald-400 font-semibold",
                log.level === "warn" && "text-amber-400",
                log.level === "error" && "text-rose-400 font-semibold"
              )}>
                {log.text}
              </span>
            </div>
          ))}

          {/* 执行中的异步闪烁光标 */}
          {status === "syncing" && (
            <div className="leading-relaxed flex items-center gap-2">
              <span className="text-zinc-600 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
              <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}