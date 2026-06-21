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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconAlertCircleFilled, IconCircleCheckFilled } from "@tabler/icons-react";
import { authFetch } from '@/lib/api';
import CryptoJS from 'crypto-js';

const SUPPORTED_PLATFORMS = [
  { id: 'garmin_cn', label: 'Garmin CN', platform: 'garmin_cn', description: '佳明中国区账号' },
  { id: 'garmin', label: 'Garmin Global', platform: 'garmin', description: '佳明国际区账号' },
  { id: 'coros', label: 'Coros', platform: 'coros', description: '高驰账号' },
];

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: {
    id: number;
    user_id: number;
    guid: string | null;
    account: string;
    encrypted_password?: string;
    source_type: 'garmin' | 'garmin_cn' | 'coros' | string;
    region: string;
    is_active: boolean;
    master: boolean;
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
  };
  action: 'add' | 'update';
  onSuccess?: () => void;
}

export function AppConnectionDialog({ open, onOpenChange, app, action, onSuccess }: ConnectionDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [master, setMaster] = useState(false);

  useEffect(() => {
    console.log(app);

    if (open && app) {
      setSelectedPlatform(app.source_type);
      if (app.region === 'cn') {
        setSelectedPlatform('garmin_cn');
      }
      setMaster(app.master || false);
    }
  }, [open, app]);

  const resetState = () => {
    setError(null);
    setUsername('');
    setPassword('');
    setSelectedPlatform('');
    setAgreed(false);
    setSuccess(false);
  };

  const handleVerifyAndSave = async () => {
    if (!selectedPlatform) return;
    setLoading(true);
    setError(null);

    try {
      const isGarmin = selectedPlatform.startsWith('garmin');
      const key = process.env.NEXT_PUBLIC_KEY?.toString() || '';
      const loginPayload = isGarmin
        ? {
          id: app.id ? app.id : 0,
          region: selectedPlatform === 'garmin_cn' ? 'cn' : 'global',
          email: username,
          password: CryptoJS.AES.encrypt(password, key).toString(),
          master,
          action,
        }
        : {
          id: app.id ? app.id : 0,
          region: 'coros',
          email: username,
          password: CryptoJS.MD5(password).toString(),
          master,
          action,
        };

      const response = await authFetch('/api/v1/base/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `验证失败 (HTTP ${response.status})`);
      }
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'error')
          throw new Error(result.message || '验证失败');
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
          <DialogTitle>连接 {app?.source_type || SUPPORTED_PLATFORMS.find(p => p.platform === selectedPlatform)?.label || '账号'}</DialogTitle>
          <DialogDescription>
            请输入您的账号凭据以授权数据同步
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>选择平台</Label>
            <Select
              value={selectedPlatform}
              onValueChange={setSelectedPlatform}
              disabled={!!app?.id || loading || success}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择平台" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.platform}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="master"
              checked={master}
              onCheckedChange={(checked) => setMaster(checked as boolean)}
              disabled={loading || success}
            />
            <Label htmlFor="master" className="text-sm font-medium leading-none">设置为主数据源</Label>
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
          <Button onClick={handleVerifyAndSave} disabled={loading || !selectedPlatform || !username || !password || !agreed || success} className="w-full sm:w-auto">
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