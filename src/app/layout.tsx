import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, zhCN } from "@clerk/localizations";

import { Providers } from "@/components/providers";
import { I18nBridge } from "@/components/i18n-bridge";
import { LayoutProvider } from "@/hooks/use-layout"
import "./globals.css";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const title = messages.IndexPage?.title ?? "Incremental";
  const description = messages.IndexPage?.description ?? "";

  return {
    title: `${title}`,
    description,
  };
}
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();
  // Clerk 的预置登录/注册组件自带文案，用 localization 跟随站点语言。
  // 注意：Clerk 客户端是全局单例，切语言后需刷新页面才会重建（见 README i18n 备注）。
  const clerkLocalization = locale === "zh" ? zhCN : enUS;
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClerkProvider localization={clerkLocalization}>
          <LayoutProvider>
            <NextIntlClientProvider messages={messages}>
              {/* Injects the current locale's strings into modules that cannot use hooks (e.g. lib/api.ts) */}
              <I18nBridge />
              <Providers>
                {children}
                <Toaster richColors position="top-center" />
              </Providers>
            </NextIntlClientProvider>
          </LayoutProvider>
        </ClerkProvider>
      </body>
      <GoogleAnalytics gaId="G-10K4P7GLF3" />
    </html>
  );
}
