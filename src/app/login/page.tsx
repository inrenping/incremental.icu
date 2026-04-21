'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconBrandGoogleFilled, IconBrandGithubFilled } from "@tabler/icons-react";
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("LoginPage");

  useEffect(() => {
    const checkAuth = async () => {
      const token = storage.get('accessToken');
      if (!token) return;

      try {
        const userRes = await authFetch('/api/v1/user/me', {
          method: 'GET'
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          storage.set('user', userData.user);
          toast.success(t("alreadyLoggedIn", { name: userData.user.username }));
          router.replace('/dash');
        } else {
          storage.clearAuth();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkAuth();
  }, [router, t]);

  // --- Google 登录处理 ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // 1. 获取用户信息
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await userInfoRes.json();

        // 2. 发送给后端验证并登录
        const res = await fetch('/api/v1/auth/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.picture,
            googleId: googleUser.sub,
            idToken: tokenResponse.access_token,
            accessToken: tokenResponse.access_token
          }),
        });

        const data = await res.json();
        if (res.ok) {
          storage.set('accessToken', data.access_token);
          storage.set('user', data.user);
          toast.success(t("welcome"));
          router.replace('/dash');
        } else {
          toast.error(data.detail || "Google Login Failed");
        }
      } catch (err) {
        console.error("Google login error:", err);
        toast.error(t("errorNetwork"));
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => toast.error("Google Login Failed"),
  });

  // --- GitHub 登录处理 ---
  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/v1/auth/github/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = githubUrl;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailRes = await fetch(`/api/v1/user?email=${encodeURIComponent(email)}`);
      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        toast.error(emailData.detail || t("errorEmailNotRegistered"));
        return;
      }

      const sendRes = await fetch(`/api/v1/auth/send-captcha?email=${email}&purpose=login`, { method: 'POST' });
      const sendData = await sendRes.json();

      if (sendRes.ok) {
        toast.success(t("codeSent"));
        // 携带邮箱跳转到验证码页面，同时传递 username 用于展示
        router.push(`/login/verify?email=${encodeURIComponent(email)}&name=${encodeURIComponent(emailData.username)}`);
      } else {
        toast.error(sendData.detail || t("errorSendCode"));
      }
    } catch {
      toast.error(t("errorNetwork"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-xl p-8">
        <div className='text-center space-y-2 mb-6'>
          <h1 className='text-3xl font-bold'>{t("welcome")}</h1>
          <p className='text-gray-600'>{t("enterEmail")}</p>
        </div>

        <form onSubmit={handleSendCode} className="space-y-4">
          <div className='space-y-2'>
            <Label htmlFor='email'>{t("email")}</Label>
            <Input
              id="email"
              type='email'
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-black px-2 text-muted-foreground">{t("or")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              type="button"
              className="w-full relative"
              onClick={() => handleGoogleLogin()}
              disabled={isLoading}
            >
              <IconBrandGoogleFilled className="absolute left-4 h-4 w-4" />
              <span>{t("loginWith", { provider: "Google" })}</span>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full relative"
              onClick={handleGitHubLogin}
              disabled={isLoading}
            >
              <IconBrandGithubFilled className="absolute left-4 h-4 w-4" />
              <span>{t("loginWith", { provider: "GitHub" })}</span>
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("checking") : t("nextStep")}
          </Button>
        </form>

        <div className='mt-6 text-center text-sm text-gray-500'>
          {t("noAccount")} <a href="/login/register" className="text-primary-600 font-medium hover:underline">{t("signUp")}</a>
        </div>
      </motion.div>
    </div>
  );
}