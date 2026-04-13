'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { storage } from '@/lib/storage';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("LoginPage");

  const email = searchParams.get('email') || '';
  const displayName = searchParams.get('name') || '';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/send-captcha?email=${email}&purpose=login`, { method: 'POST' });

      if (res.ok) {
        setCountdown(60);
        toast.success(t("codeSent"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/login?email=${email}&captcha=${code}`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        storage.set('accessToken', data.Token);
        storage.set('refreshToken', data.RefreshToken);
        storage.set('user', data.User);
        toast.success(t("welcomeBack", { name: displayName }));
        router.push('/dash');
      } else {
        toast.error(data.detail || t("errorPasswordIncorrect"));
      }
    } catch {
      toast.error(t("errorLogin"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-xl p-8">
        <div className='text-center space-y-2 mb-6'>
          <h1 className='text-3xl font-bold'>{t("hi", { name: displayName })}</h1>
          <p className='text-gray-600'>{t("enterCode")}</p>
          <p className="text-xs text-primary-600">{email}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className='space-y-2'>
            <div className="flex justify-between items-center">
              <Label htmlFor='code'>{t("verificationCodeLabel")}</Label>
              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleResend}
                className="text-xs text-primary-600 hover:underline disabled:text-gray-400 font-medium"
              >
                {countdown > 0 ? `${countdown}s` : t("resend")}
              </button>
            </div>
            <Input
              id="code"
              type='text'
              placeholder="······"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="tracking-[0.8em] text-center font-mono text-2xl h-14"
            />
          </div>

          <div className="space-y-3">
            <Button type="submit" className="w-full h-11" disabled={isLoading || code.length < 4}>
              {isLoading ? t("loggingIn") : t("loginLabel")}
            </Button>
            <Button variant="ghost" type="button" className="w-full text-xs" onClick={() => router.back()}>
              {t("changeEmail")}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}