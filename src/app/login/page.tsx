'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { storage } from '@/lib/storage';
import { IconBrandGoogleFilled, IconBrandGithubFilled } from "@tabler/icons-react"

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const t = useTranslations("LoginPage");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/check?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (res.ok) {
        setDisplayName(data.username);
        setStep(2);
      } else {
        toast.error(data.message || t("errorEmailNotRegistered"));
      }
    } catch {
      toast.error(t("errorNetwork"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        storage.set('accessToken', data.Token);
        storage.set('refreshToken', data.RefreshToken);
        storage.set('user', data.User);
        storage.set('tokenExpires', data.Expires);
        toast.success(t("welcomeBack", { name: displayName }));
        // 登录成功，这里跳转到对应页面
        router.push('/dash');
      } else {
        toast.error(data.message || t("errorPasswordIncorrect"));
      }
    } catch {
      toast.error(t("errorLogin"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div layout className="w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-xl p-8">

        <div className='text-center space-y-2 mb-6'>
          <h1 className='text-3xl font-bold'>
            {step === 1 ? t("welcome") : t("hi", { name: displayName })}
          </h1>
          <p className='text-gray-600'>
            {step === 1 ? t("enterEmail") : t("enterPassword")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCheckEmail}
              className="space-y-4"
            >


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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-black px-2 text-muted-foreground">{t("or")}</span>
                </div>
              </div>

              <Button variant="outline" type="button" className="w-full relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  <IconBrandGoogleFilled className="h-4 w-4" />
                </span>
                <span className="mx-auto">{t("loginWith", { provider: "Google" })}</span>
              </Button>
              <Button variant="outline" type="button" className="w-full relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  <IconBrandGithubFilled className="h-4 w-4" />
                </span>
                <span className="mx-auto">{t("loginWith", { provider: "GitHub" })}</span>
              </Button>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("checking") : t("nextStep")}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div className='space-y-2'>
                <div className="flex justify-between">
                  <Label htmlFor='password'>Password</Label>
                  <Label htmlFor='password'>{t("passwordLabel")}</Label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Change Email
                    {t("changeEmail")}
                  </button>
                </div>
                <Input
                  id="password"
                  type='password'
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : t("login")}
                {isLoading ? t("loggingIn") : t("login")}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {step === 1 && (
          <div className='mt-6 text-center text-sm'>
            <p className="text-gray-500">
              {t("noAccount")}{" "}
              <a href="#" className="text-primary-600 font-medium hover:underline">{t("signUp")}</a>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}