'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import { SiteHeader } from "@/components/dash/site-header"
import { SiteFooter } from "@/components/dash/site-footer"

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
  return (
    <div className="flex flex-col min-h-screen">
      <header>
        <SiteHeader />
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
