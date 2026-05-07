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
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircleFilled, IconCircleCheckFilled } from "@tabler/icons-react";
import { authFetch } from '@/lib/api';
import CryptoJS from 'crypto-js';

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: { id: string; label: string } | null;
  onSuccess?: () => void;
}

export function AppConnectionDialog({ open, onOpenChange, app, onSuccess }: ConnectionDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setError(null);
    setUsername('');
    setPassword('');
    setAgreed(false);
    setSuccess(false);
  };

  const handleVerifyAndSave = async () => {
    if (!app) return;
    setLoading(true);
    setError(null);

    try {
      let response = null;
      if (app.id.startsWith('garmin')) {
        const key = process.env.NEXT_PUBLIC_KEY?.toString() || '';
        const decryptedPassword = CryptoJS.AES.decrypt(password, key).toString(CryptoJS.enc.Utf8);
        response = await fetch('/api/garmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: app.id === 'garmin_cn' ? 'cn' : null,
            username,
            password: decryptedPassword
          }),
        });
      } else if (app.id.startsWith('coros')) {
        const encryptedPassword = CryptoJS.MD5(password).toString();
        response = await authFetch('/api/v1/coros/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: username,
            password: encryptedPassword
          }),
        });
      }

      if (response && !response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `验证失败 (HTTP ${response.status})`);
      }

      if (response && app.id.startsWith('garmin')) {
        const verifyData = await response.json();
        const key = process.env.NEXT_PUBLIC_KEY?.toString() || '';
        const saveResponse = await authFetch('/api/v1/garmin/saveConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...verifyData,
            username,
            password: CryptoJS.AES.encrypt(password, key).toString()
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `连接服务失败 (HTTP ${saveResponse.status})`);
        }
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to verify and save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>连接 {app?.label}</DialogTitle>
          <DialogDescription>
            请输入您的账号凭据以授权数据同步（应用 ID: <span className="font-mono text-xs">{app?.id}</span>）
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
              为实现数据自动同步，服务端需要获取您的账号和密码。受限于品牌登录机制，使用本工具时请勿在其他终端同时登录，否则将导致凭证失效。<br />我们会尽力保护您的信息安全，但请您知晓并自行承担潜在的安全风险。
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              disabled={loading || success}
            />
            <Label htmlFor="terms" className="text-sm font-medium leading-none">我已阅读并知晓上述安全提示</Label>
          </div>

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg text-[13px] text-emerald-800 border border-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <IconCircleCheckFilled className="h-4 w-4" />验证通过
              </div>
              <p>您的账号已成功验证并安全保存。</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleVerifyAndSave} disabled={loading || !username || !password || !agreed || success} className="w-full sm:w-auto">
            {loading ? '验证中...' : '验证'}
          </Button>
          {success && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">关闭</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}