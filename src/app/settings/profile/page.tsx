'use client';

import { useEffect, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';

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

function formatDate(dateString: string) {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;

  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

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

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 max-w-2xl">
      <div className="space-y-1 ">
        <h1 className="text-xl font-semibold">我的个人资料</h1>
      </div>
      <div className="rounded-xl bg-background p-6">
        <div className="grid gap-y-4 text-sm text-foreground">
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">用户名</span>
            <span className="font-semibold">{user?.username}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">邮箱</span>
            <span className="font-semibold">{user?.email}</span>
          </div>
          {SOCIAL_PROVIDERS.map((item) => {
            const social = socials.find((entry) => entry.provider === item.provider);
            return (
              <div key={item.provider} className="grid grid-cols-[120px_1fr] items-center gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {loadingSocials
                      ? '加载中...'
                      : social
                        ? `已连接，连接于 ${formatDate(social.created_at)}`
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
        </div>
      </div>
    </div>
  );
}
