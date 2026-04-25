'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import { SiteHeader } from "@/components/dash/site-header"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const t = useTranslations("LoginPage");
  useEffect(() => {
    const checkAuth = async () => {
      const token = storage.get('accessToken');
      if (!token) {
        storage.clearAuth();
        toast.error(t("loginFail"));
        router.replace('/login');
      }
      try {
        const userRes = await authFetch('/api/v1/user/me', { method: 'GET' });
        if (!userRes.ok) {
          storage.clearAuth();
          router.replace('/login');
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkAuth();
  }, [router, t]);
  return (<>
    <header>
      <SiteHeader />
    </header>
    {children}
  </>
  );
}
