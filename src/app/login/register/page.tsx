'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconBrandGoogleFilled, IconBrandGithubFilled } from "@tabler/icons-react";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get('name') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [captcha, setCaptcha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();
  const t = useTranslations("LoginPage");

  // 处理倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码逻辑
  const handleSendCaptcha = async () => {
    if (!email || !email.includes('@')) {
      toast.error(t("errorInvalidEmail") || "请输入正确的邮箱");
      return;
    }

    setIsSending(true);
    try {
      // 匹配你之前的后端逻辑：Query Params 方式
      const url = `/api/v1/auth/send-captcha?email=${encodeURIComponent(email)}&purpose=register`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        toast.success(t("captchaSent") || "验证码已发送");
        setCountdown(60); // 开启 60 秒倒计时
      } else {
        toast.error(data.detail || "发送失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("网络错误，请稍后再试");
    } finally {
      setIsSending(false);
    }
  };

  // 注册逻辑
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        username: name,
        email: email,
        captcha: captcha
      });

      const res = await fetch(`/api/v1/auth/register?${params.toString()}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("registerSuccess"));
        router.push(`/login?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(data.detail || t("errorRegister"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errorNetwork"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-xl p-8">
        <div className='text-center space-y-2 mb-6'>
          <h1 className='text-3xl font-bold'>{t("createAccount")}</h1>
          <p className='text-gray-600'>{t("registerSubtitle")}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* 用户名 */}
          <div className='space-y-2'>
            <Label htmlFor='username'>{t("username")}</Label>
            <Input
              id="username"
              type='text'
              placeholder="johndoe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>{t("email")}</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type='email'
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendCaptcha}
                disabled={isSending || countdown > 0}
                className="w-28 text-xs"
              >
                {countdown > 0 ? `${countdown}s` : (isSending ? "..." : t("sendCaptcha") || "获取验证码")}
              </Button>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='captcha'>{t("verificationCodeLabel") || "验证码"}</Label>
            <Input
              id="captcha"
              type='text'
              placeholder="000000"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              required
              maxLength={6}
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? t("submitting") : t("signUp")}
          </Button>

          {/* ... 分隔线和社交登录保持不变 ... */}
          <div className="relative py-2" style={{ display: "none" }}>
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-black px-2 text-muted-foreground">{t("or")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" style={{ display: "none" }}>
            <Button
              variant="outline"
              type="button"
              className="relative"
              onClick={() => window.location.href = '/api/auth/google'}
            >
              <IconBrandGoogleFilled className="h-4 w-4 mr-2" />
              <span>{t("loginWith", { provider: "Google" })}</span>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="relative"
              onClick={() => window.location.href = '/api/auth/github'}
            >
              <IconBrandGithubFilled className="h-4 w-4 mr-2" />
              <span>{t("loginWith", { provider: "GitHub" })}</span>
            </Button>
          </div>
        </form>

        <div className='mt-6 text-center text-sm text-gray-500'>
          {t("alreadyHaveAccount")}{" "}
          <a href="/login" className="text-primary-600 font-medium hover:underline">
            {t("loginLabel")}
          </a>
        </div>
      </motion.div>
    </div>
  );
}