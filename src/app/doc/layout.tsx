'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from "next-intl";
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
