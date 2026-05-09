'use client';

import { useEffect, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import dayjs from 'dayjs';
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

interface User {
  username?: string;
  email?: string;
}

interface SocialAccount {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  created_at: string;
}

const SOCIAL_PROVIDERS = [
  { provider: 'google', label: 'Google' },
  { provider: 'github', label: 'Github' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [loadingSocials, setLoadingSocials] = useState(true);

  useEffect(() => {
    const userData = storage.get('user');
    if (!userData) return;

    try {
      const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
      setUser(parsedUser as User);
    } catch (error) {
      console.error('解析用户信息失败:', error);
    }
  }, []);

  useEffect(() => {
    const loadSocials = async () => {
      try {
        const res = await authFetch('/api/v1/user/socials', { method: 'GET' });
        if (!res.ok) {
          console.error('获取社交账号信息失败:', res.status);
          return;
        }

        const data = await res.json();
        setSocials(data ?? []);
      } catch (error) {
        console.error('获取社交账号信息出错:', error);
      } finally {
        setLoadingSocials(false);
      }
    };

    loadSocials();
  }, []);

  const handleConnect = (provider: string) => {
    console.log(`连接社交账号: ${provider}`);
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await authFetch('/api/v1/user', { method: 'DELETE' });
      if (res.ok) {
        // 清除本地存储并跳转
        storage.remove('user');
        storage.remove('token');
        window.location.href = '/';
      } else {
        console.error('删除账号失败:', res.status);
        // 这里可以添加一个 Toast 提示
      }
    } catch (error) {
      console.error('删除账号出错:', error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="space-y-1 ">
        <h1 className="text-xl font-semibold">我的个人资料</h1>
      </div>
      <div className="rounded-xl bg-background p-6">
        <div className="grid gap-y-4 text-sm text-foreground">
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">用户名</span>
            <span className="font-semibold">{user?.username}</span>
          </div>
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">邮箱</span>
            <span className="font-semibold">{user?.email}</span>
          </div>
          {SOCIAL_PROVIDERS.map((item) => {
            const social = socials.find((entry) => entry.provider === item.provider);
            return (
              <div key={item.provider} className="grid items-center gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {loadingSocials
                      ? '加载中...'
                      : social
                        ? `已连接，连接于 ${dayjs(social.created_at).format('YYYY-MM-DD HH:mm')}`
                        : '未连接'}
                  </span>
                  {!loadingSocials && !social ? (
                    <Button variant="outline" size="sm" onClick={() => handleConnect(item.provider)}>
                      连接
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="flex flex-col items-start gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="default">删除账号</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>您确定要删除账号吗？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将永久删除您的个人资料、设置以及所有相关数据。一旦确认，您将无法恢复这些内容。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">
              一旦删除账号，您的所有数据将被永久移除，此操作不可撤销。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
