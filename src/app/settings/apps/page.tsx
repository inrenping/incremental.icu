'use client';

import { useState } from 'react';
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
import { IconAlertCircleFilled } from "@tabler/icons-react";

export default function AppsPage() {
  // 这里模拟了应用连接的状态和数据
  const apps = [
    {
      id: 'garmin',
      label: 'Garmin Connect',
      description: '连接您的 Garmin Connect 账号',
      isConnected: true,
      email: 'inrenping@gmail.com',
      addedAt: '1 天前',
      status: '验证通过',
      region: '国际区',
      lastUpdate: '1 天前',
    },
    {
      id: 'garmin_cn',
      label: 'Garmin Connect (CN)',
      description: '连接您的 Garmin Connect (中国) 账号',
      isConnected: false
    },
    {
      id: 'coros',
      label: 'Coros',
      description: '连接您的 Coros 账号',
      isConnected: false,
    },
  ];

  const [open, setOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState<(typeof apps)[0] | null>(null);

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
                  <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-border pb-4">
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
                  </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>连接 {currentApp?.label}</DialogTitle>
            <DialogDescription>
              请输入您的账号凭据以授权数据同步（应用 ID: <span className="font-mono text-xs">{currentApp?.id}</span>）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-[13px] leading-relaxed text-amber-800 dark:text-amber-200 space-y-2 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <IconAlertCircleFilled className="h-4 w-4" />
                安全提示
              </div>
              <p>
                {currentApp?.id === 'coros'
                  ? '为实现数据自动同步，服务端需加密保存您的账号密码。受限于品牌登录机制，使用本工具时请勿在其他终端同时登录，否则将导致登录失效。我们会尽力保护您的信息安全，但请您知晓并自行承担潜在的安全风险。'
                  : '本工具仅在浏览器端通过登录获取访问凭证，服务器不保存您的账号密码。相关凭证将按业界标准加密处理。尽管我们已采取严格的安全防护，但您仍需知晓，网络环境下仍存在不可预料的安全风险。'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">用户名 / 邮箱</Label>
              <Input id="username" placeholder="请输入用户名" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" placeholder="请输入密码" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto">验证并保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}