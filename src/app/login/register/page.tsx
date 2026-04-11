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

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("LoginPage");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("registerSuccess"));
        // 注册成功后，通常跳转到登录页让用户开始流程
        router.push(`/login?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(data.message || t("errorRegister"));
      }
    } catch (err) {
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
          <div className='space-y-2'>
            <Label htmlFor='username'>{t("username")}</Label>
            <Input
              id="username"
              type='text'
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>{t("email")}</Label>
            <Input
              id="email"
              type='email'
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? t("submitting") : t("signUp")}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-black px-2 text-muted-foreground">{t("or")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" type="button" className="relative">
              <IconBrandGoogleFilled className="h-4 w-4 mr-2" />
              <span>{t("signUpWith", { provider: "Google" })}</span>
            </Button>
            <Button variant="outline" type="button" className="relative">
              <IconBrandGithubFilled className="h-4 w-4 mr-2" />
              <span>{t("signUpWith", { provider: "Github" })}</span>
            </Button>
          </div>
        </form>

        {/* 底部跳转 */}
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