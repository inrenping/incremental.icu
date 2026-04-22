'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { storage } from '@/lib/storage';
import { authFetch } from '@/lib/api';
import { SiteHeader } from "@/components/login/site-header"
import { GoogleOAuthProvider } from '@react-oauth/google';

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
      if (!token) return;

      try {
        const userRes = await authFetch('/api/v1/user/me', { method: 'GET' });
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

  return (<>
    <SiteHeader />
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      {children}
    </GoogleOAuthProvider>
  </>
  );
}
