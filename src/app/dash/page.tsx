'use client';

import { useState, useEffect, useRef } from "react";
import { storage } from '@/lib/storage';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api";
import { fetchEventSource } from "@microsoft/fetch-event-source"; // 导入 SSE 客户端库
import { TerminalModal, type LogLine } from "@/components/dash/terminal-modal"; // 导入刚才创建的组件
import {
  IconRefresh,
  IconArrowsLeftRight,
} from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SyncLogs } from "@/components/dash/sync-logs";
import { useTranslations } from "next-intl";
import Link from "next/link";

export interface AppConfig {
  id: number;
  user_id: number;
  guid: string | null;
  account: string;
  encrypted_password?: string;
  source_type: 'garmin' | 'garmin_cn' | 'coros' | string;
  region: string;
  is_active: boolean;
  access_token: string | null;
  access_token_expires_at: string | null;
  refresh_token: string | null;
  refresh_token_expires_at: string | null;
  oauth_token: string | null;
  oauth_token_secret: string | null;
  secret_string: string | null;
  total_count: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export default function DashPage() {
  const t = useTranslations('DashPage');
  const { layout } = useLayout();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourceId, setSourceId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();

  // ---- 终端状态管理 ----
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogLine[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchAppsStatus();
  }, []);

  const fetchAppsStatus = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/base/getConnectConfigs');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const data: AppConfig[] = await response.json();
      setApps(data);
    } catch (err: any) {
      console.error("Fetch status error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 辅助方法：快速写入终端单行日志
  const pushTerminalLog = (text: string, level: LogLine["level"] = "info") => {
    const newLine: LogLine = {
      time: new Date().toLocaleTimeString(),
      text,
      level,
    };
    setTerminalLogs((prev) => [...prev, newLine]);
  };

  // 一键同步处理函数（核心改造为 SSE 模式）
  const handleGlobalSync = async () => {
    if (isSyncing || !sourceId || !targetId) {
      if (!isSyncing && (!sourceId || !targetId)) {
        toast.error(t("selectSourceAndTarget"));
      }
      return;
    }

    // 1. 初始化终端状态
    setIsSyncing(true);
    setSyncStatus("syncing");
    setTerminalLogs([]); // 清空上次日志
    setIsTerminalOpen(true); // 唤起类终端弹出框

    pushTerminalLog("🔧 开始调用同步任务...", "info");
    pushTerminalLog(`Source ID: ${sourceId} | Target ID: ${targetId}`, "info");

    // 2. 准备控制信号（用于支持点击圆点强制退出/中止）
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 3. 启动 HTTP POST 模拟的流式 SSE 接口
      const token = storage.get('accessToken');
      await fetchEventSource('/api/v1/base/execute', { // 修改为你实际的 FastAPI 接口地址
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
          count: 10
        }),
        signal: controller.signal,

        onopen(response) {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            pushTerminalLog("🛰️ Pipeline handshake complete. Data streaming...", "success");
          } else {
            pushTerminalLog(`❌ Pipeline rejected connection. Status: ${response.status}`, "error");
            setSyncStatus("error");
          }
          return Promise.resolve();
        },

        onmessage(msg) {
          // 捕获约定的结束暗号
          if (msg.data === '[DONE]') {
            pushTerminalLog("🎉 Synchronization routine exited with code 0.", "success");
            setSyncStatus("done");
            setIsSyncing(false);
            controller.abort();
            toast.success("任务完成！");
            return;
          }

          // 正常解析 FastAPI 推送出的 JSON 日志段
          try {
            const payload = JSON.parse(msg.data);
            // 契合 FastAPI 发来的结构: { level: 'info' | 'warn' | 'error' | 'success', message: '内容' }
            pushTerminalLog(payload.message, payload.level || "info");
          } catch (e) {
            // 如果后端吐过来的是非 JSON 的纯文本
            pushTerminalLog(msg.data, "info");
          }
        },

        onclose() {
          pushTerminalLog("🔒 Server pipeline link channel closed.", "warn");
          setSyncStatus("done");
          setIsSyncing(false);
        },

        onerror(err) {
          pushTerminalLog(`🚨 Interrupted fatal error: ${err.message || err}`, "error");
          setSyncStatus("error");
          setIsSyncing(false);
          throw err; // 抛出异常避免库自动疯狂重试
        }
      });

    } catch (err) {
      console.log("SSE execution pipeline final clear.");
    }
  };

  // 处理在终端弹窗中点击红色关闭按钮的逻辑
  const handleCloseTerminal = () => {
    if (syncStatus === "syncing" && abortControllerRef.current) {
      // 如果正在同步时强行关闭，终止长连接，通知后端中断
      abortControllerRef.current.abort();
      pushTerminalLog("🛑 Sync pipeline aborted by manual terminal kill signal.", "error");
    }
    setIsTerminalOpen(false);
    setIsSyncing(false);
    setSyncStatus("idle");
  };

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
    )}>

      {/* 核心操作区 */}
      <section className="text-center space-y-6 py-8 bg-muted/30 rounded-3xl border border-dashed border-border">
        {/* ...原有顶层代码不变... */}
        <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-[2.5rem] w-full md:w-fit">

            {/* 数据源选择 */}
            <div className="flex items-center gap-2 bg-background rounded-4xl px-6 py-2 border border-border/50 shadow-sm  w-full text-left transition-all hover:border-primary/30">
              <div className="flex flex-col flex-1">
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="border-none shadow-none focus:ring-0 p-0 h-auto bg-transparent text-lg font-semibold">
                    <SelectValue placeholder={t("selectPlatform")} />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.filter(a => a.is_active).map(app => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {app.source_type}-{app.region}  ({app.account})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-primary/5 p-2 rounded-full hidden md:block shrink-0">
              <IconArrowsLeftRight className="h-5 w-5 text-primary/60" />
            </div>

            {/* 目标平台选择 */}
            <div className="flex items-center gap-2 bg-background rounded-4xl px-6 py-2 border border-border/50 shadow-sm w-full text-left transition-all hover:border-primary/30">
              <div className="flex flex-col flex-1">
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="border-none shadow-none focus:ring-0 p-0 h-auto bg-transparent text-lg font-semibold">
                    <SelectValue placeholder={t("selectPlatform")} />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.filter(a => a.is_active).map(app => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {app.source_type}-{app.region}  ({app.account})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 一键同步触发按钮 */}
            <Button
              size="lg"
              className="h-14 px-8 text-lg gap-2 rounded-4xl shadow-lg hover:shadow-xl transition-all w-full md:w-auto shrink-0"
              onClick={handleGlobalSync}
              disabled={isSyncing || !sourceId || !targetId}
            >
              <IconRefresh className={cn("h-6 w-6", isSyncing && "animate-spin")} />
              {isSyncing ? t("syncing") : t("oneclickSync")}
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dash/accounts" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
              平台账号管理
            </Link>
            <Link href="/dash/activities" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
              查询详细数据
            </Link>
          </div>
        </div>
      </section>

      <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
        <div className="space-y-4 text-foreground">
          <p>
            为实现运动数据的同步，本工具需在服务端登录并保存您的账号及密码信息。我们将严格遵循业界通用标准对您的凭证进行加密存储，保障您的信息安全。
          </p>
          <p>请您知悉并同意以下事项：</p>
          <p>继续使用本工具，即表示您已阅读并同意我们的<a href="/dash/tos" target="_self" rel="noopener noreferrer"
            className="underline">「使用条款」</a>。</p>
          <p>相关服务依赖第三方，我们尽力保障可用性，但不承诺持续可用或可访问。</p>
          <p>受限于品牌登录机制，使用本工具期间，请勿在其他终端同时登录您的账号，以免导致授权凭证失效。</p>
          <p>我们将严格加密存储您的信息，但无法完全排除网络环境中的潜在不确定性。继续使用即代表您已充分知悉并理解上述情况，授权我们为您进行数据的同步与管理。</p>
        </div>
      </div>

      <SyncLogs />

      {/*终端模态框 */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={handleCloseTerminal}
        logs={terminalLogs}
        status={syncStatus}
      />
    </div>
  );
}