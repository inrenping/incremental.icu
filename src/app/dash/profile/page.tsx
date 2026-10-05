'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
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
  timezone?: string;
  yearly_target?: number | null;
  updated_at?: string;
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
  const t = useTranslations('ProfilePage');
  const tc = useTranslations('Common');
  const [user, setUser] = useState<User | null>(null);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [loadingSocials, setLoadingSocials] = useState(true);
  const [yearlyTarget, setYearlyTarget] = useState<string>('');
  const [savingYearlyTarget, setSavingYearlyTarget] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = storage.get('user');
      if (userData) {
        try {
          const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
          if (!parsedUser.timezone) {
            parsedUser.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          setUser(parsedUser as User);
          setYearlyTarget(
            parsedUser.yearly_target?.toString() ?? String(new Date().getFullYear())
          );
        } catch (error) {
          console.error('Failed to parse stored user info:', error);
        }
        return;
      }

      // No user info in localStorage, fall back to the backend API
      try {
        const res = await authFetch('/api/v1/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const userInfo: User = {
              username: data.user.username,
              email: data.user.email,
              timezone: data.user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
              yearly_target: data.user.yearly_target,
            };
            storage.set('user', userInfo);
            setUser(userInfo);
            setYearlyTarget(
              data.user.yearly_target?.toString() ?? String(new Date().getFullYear())
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const loadSocials = async () => {
      try {
        const res = await authFetch('/api/v1/user/socials', { method: 'GET' });
        if (!res.ok) {
          console.error('Failed to fetch social accounts:', res.status);
          return;
        }

        const data = await res.json();
        setSocials(data ?? []);
      } catch (error) {
        console.error('Error while fetching social accounts:', error);
      } finally {
        setLoadingSocials(false);
      }
    };

    loadSocials();
  }, []);

  const handleConnect = (provider: string) => {
    console.log(`Connect social account: ${provider}`);
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await authFetch('/api/v1/user', { method: 'DELETE' });
      if (res.ok) {
        // Clear local storage and redirect
        storage.remove('user');
        storage.remove('token');
        window.location.href = '/';
      } else {
        console.error('Failed to delete account:', res.status);
        // TODO: surface this as a toast
      }
    } catch (error) {
      console.error('Error while deleting account:', error);
    }
  };

  const handleSaveYearlyTarget = async () => {
    const value = Number(yearlyTarget);
    if (!Number.isInteger(value) || value < 0) {
      toast.error(t('invalidYearlyTarget'));
      return;
    }
    setSavingYearlyTarget(true);
    try {
      const res = await authFetch('/api/v1/user/yearly-target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearly_target: value }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const userData = storage.get('user');
        if (userData) {
          const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
          parsed.yearly_target = data.yearly_target;
          storage.set('user', parsed);
        }
        setUser((prev) => prev ? { ...prev, yearly_target: data.yearly_target } : prev);
        toast.success(t('yearlyTargetUpdated', { value: data.yearly_target }));
      } else {
        toast.error(t('yearlyTargetFailed'));
      }
    } catch (error) {
      console.error('Failed to update yearly target:', error);
      toast.error(t('yearlyTargetFailedRetry'));
    } finally {
      setSavingYearlyTarget(false);
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="space-y-1 ">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
      </div>
      <div className="rounded-xl bg-background p-6">
        <div className="grid gap-y-4 text-sm text-foreground">
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">{t('username')}</span>
            <span className="font-semibold">{user?.username}</span>
          </div>
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">{t('email')}</span>
            <span className="font-semibold">{user?.email}</span>
          </div>
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">{t('timezone')}</span>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{user?.timezone ?? t('timezoneUnset')}</span>
              <Button variant="outline" size="sm" onClick={async () => {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                setUser((prev) => prev ? { ...prev, timezone: tz } : prev);
                try {
                  const res = await authFetch('/api/v1/user/timezone', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tz }),
                  });
                  const data = await res.json();
                  if (data.status === 'success') {
                    const userData = storage.get('user');
                    if (userData) {
                      const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
                      parsed.timezone = data.timezone;
                      storage.set('user', parsed);
                    }
                    toast.success(t('timezoneUpdated', { value: data.timezone }));
                  } else {
                    toast.error(t('timezoneFailed'));
                  }
                } catch (error) {
                  console.error('Failed to update timezone:', error);
                  toast.error(t('timezoneFailedRetry'));
                }
              }}>
                {t('refresh')}
              </Button>
            </div>
          </div>
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">{t('yearlyTarget')}</span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={yearlyTarget}
                  onChange={(e) => setYearlyTarget(e.target.value)}
                  placeholder={t('yearlyTargetPlaceholder')}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">{t('km')}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveYearlyTarget}
                disabled={savingYearlyTarget}
              >
                {savingYearlyTarget ? tc('saving') : tc('save')}
              </Button>
            </div>
          </div>
          {SOCIAL_PROVIDERS.map((item) => {
            const social = socials.find((entry) => entry.provider === item.provider);
            return (
              <div key={item.provider} className="grid items-center gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {loadingSocials
                      ? tc('loading')
                      : social
                        ? t('socialConnected', { date: dayjs(social.created_at).format('YYYY-MM-DD HH:mm') })
                        : t('socialNotConnected')}
                  </span>
                  {!loadingSocials && !social ? (
                    <Button variant="outline" size="sm" onClick={() => handleConnect(item.provider)}>
                      {t('connect')}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="grid items-center gap-4 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">{t('lastModified')}</span>
            <span className="font-semibold">{user?.updated_at ? dayjs(user.updated_at).format('YYYY-MM-DD HH:mm') : t('notRecorded')}</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="default">{t('deleteAccount')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteAccountTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteAccountDesc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('deleteAccountConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">
              {t('deleteAccountWarning')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
