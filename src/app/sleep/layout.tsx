'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { SiteHeader } from '@/components/dash/site-header';
import { SiteFooter } from '@/components/dash/site-footer';

// 与 /dash/layout.tsx 保持一致：SiteHeader + SiteFooter + 登录守卫，
// 让 /sleep 与 /sleep/calendar 拥有和后台一样的横幅与页脚。
export default function SleepLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // 由 Clerk middleware 负责服务端鉴权，这里只做客户端兜底，
    // 避免在已登录时因 API 失败跳回 /sign-in 造成循环跳转。
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <header>
        <SiteHeader />
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
