'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconBrandGoogleFilled, IconBrandGithubFilled } from "@tabler/icons-react";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("LoginPage");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auth/check?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || t("errorEmailNotRegistered"));
        return;
      }

      const sendRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (sendRes.ok) {
        toast.success(t("codeSent"));
        // 携带邮箱跳转到验证码页面，同时传递 username 用于展示
        router.push(`/login/verify?email=${encodeURIComponent(email)}&name=${encodeURIComponent(data.username)}`);
      } else {
        toast.error(t("errorSendCode"));
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
            <Button variant="outline" type="button" className="w-full relative">
              <IconBrandGoogleFilled className="absolute left-4 h-4 w-4" />
              <span>{t("loginWith", { provider: "Google" })}</span>
            </Button>
            <Button variant="outline" type="button" className="w-full relative">
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