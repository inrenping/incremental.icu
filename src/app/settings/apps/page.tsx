'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircleFilled, IconCircleCheckFilled } from "@tabler/icons-react";

export default function AppsPage() {
  const [apps, setApps] = useState([
    { id: 'garmin', label: 'Garmin Connect', description: '连接您的 Garmin Connect 账号', isConnected: false },
    { id: 'garmin_cn', label: 'Garmin Connect (CN)', description: '连接您的 Garmin Connect (中国) 账号', isConnected: false },
    { id: 'coros', label: 'Coros', description: '连接您的 Coros 账号', isConnected: false },
  ]);

  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 参考用户提供的请求模式：初始化获取应用连接状态
  const fetchAppsStatus = async () => {
    // setLoading(true);
    // try {
    //   // 假设后端接口为 /api/apps/status
    //   const response = await fetch('/api/apps/status');
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.error || 'Failed to fetch status');
    //   }
    //   const data = await response.json();

    //   // 更新状态：将后端返回的已连接信息合并到列表
    //   setApps(prevApps => prevApps.map(app => {
    //     const remoteInfo = data.find((d: any) => d.id === app.id);
    //     return remoteInfo ? { ...app, ...remoteInfo } : app;
    //   }));
    // } catch (err: any) {
    //   console.error("Fetch status error:", err);
    //   // 这里通常不需要在弹窗外显示错误，或者可以用 toast 提示
    // } finally {
    //   setLoading(false);
    // }
  };

  useEffect(() => {
    fetchAppsStatus();
  }, []);

  const handleVerifyAndSave = async () => {
    if (!currentApp) return;
    setLoading(true);
    setError(null);

    try {
      // 参考 /dash/test 模式，针对 Garmin 应用使用特定的 /api/garmin 接口
      const isGarmin = currentApp.id.startsWith('garmin');
      const url = isGarmin ? '/api/garmin' : '/api/apps/connect';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: currentApp.id === 'garmin_cn' ? 'cn' : null,
          username,
          password
        }),
      });

      console.log(response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `验证失败 (HTTP ${response.status})`);
      }

      // 如果是 Garmin 应用，需要将验证后的响应数据保存到本地数据库
      if (isGarmin) {
        const verifyData = await response.json();
        const saveResponse = await fetch('/api/v1/garmin/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verifyData),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `保存连接信息失败 (HTTP ${saveResponse.status})`);
        }

        const saveResult = await saveResponse.json();
        if (saveResult.status !== 'success') {
          throw new Error(saveResult.message || '数据库保存失败');
        }
      }

      setSuccess(true);
      // 验证成功后刷新列表数据
      // await fetchAppsStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to verify and save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">应用连接</h1>
      </div>

      <div className="space-y-6">
        {apps.map((app) => (
          <div key={app.id} className="rounded-xl bg-background p-6">
            <div className="grid gap-y-4 text-sm text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{app.label}</h2>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </div>
                {!app.isConnected ? (
                  <Button
                    onClick={() => {
                      setCurrentApp(app);
                      setOpen(true);
                    }}
                  >
                    去连接
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    断开连接
                  </Button>
                )}

              </div>

              {/* 应用详情（仅在已连接时显示） */}
              {app.isConnected ? (
                <div className="grid gap-y-4">
                  {/* <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-border pb-4">
                    <span className="text-sm text-muted-foreground">账号</span>
                    <span className="font-semibold">{app.email}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-border pb-4">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-600">{app.status}</span>
                      <span className="text-xs text-muted-foreground">{app.addedAt}添加</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-border pb-4">
                    <span className="text-sm text-muted-foreground">区域</span>
                    <span className="font-semibold">{app.region}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                    <span className="text-sm text-muted-foreground">上次登录信息更新</span>
                    <span className="font-semibold">{app.lastUpdate}</span>
                  </div> */}
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground italic pt-2">
                  尚未连接账号
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setError(null);
            setUsername('');
            setPassword('');
            setAgreed(false);
            setSuccess(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>连接 {currentApp?.label}</DialogTitle>
            <DialogDescription>
              请输入您的账号凭据以授权数据同步（应用 ID: <span className="font-mono text-xs">{currentApp?.id}</span>）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">用户名 / 邮箱</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || success}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-[13px] leading-relaxed text-amber-800 dark:text-amber-200 space-y-2 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <IconAlertCircleFilled className="h-4 w-4" />
                安全提示
              </div>
              <p>
                {currentApp?.id === 'coros'
                  ? '为实现数据自动同步，服务端需加密保存您的账号和加密后的密码。受限于品牌登录机制，使用本工具时请勿在其他终端同时登录，否则将导致登录失效。我们会尽力保护您的信息安全，但请您知晓并自行承担潜在的安全风险。'
                  : '本工具仅在浏览器端通过登录获取访问凭证，服务器不保存您的密码。相关操作将按业界标准处理。尽管我们已采取严格的安全防护，但您仍需知晓，网络环境下仍存在不可预料的安全风险。'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
                disabled={loading || success}
              />
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                我已阅读并知晓上述安全提示
              </Label>
            </div>

            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg text-[13px] leading-relaxed text-emerald-800 dark:text-emerald-200 space-y-2 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <IconCircleCheckFilled className="h-4 w-4" />
                  验证通过
                </div>
                <p>
                  您的账号已成功验证并安全保存。数据同步将在几分钟内开始。
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>
          <DialogFooter>
            {success && (
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                关闭
              </Button>
            )}
            <Button
              onClick={handleVerifyAndSave}
              disabled={loading || !username || !password || !agreed || success}
              className="w-full sm:w-auto"
            >
              {loading ? '验证中...' : '验证并保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}