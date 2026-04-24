import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';

import { Providers } from "@/components/providers";
import { LayoutProvider } from "@/hooks/use-layout"
import "./globals.css";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const title = messages.TabTitles?.title ?? "Incremental";
  const description = messages.TabTitles?.description ?? "";

  return {
    title: `${title} | ${description}`,
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
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <LayoutProvider>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              {children}
              <Toaster richColors position="top-center" />
            </Providers>
          </NextIntlClientProvider>
        </LayoutProvider>
      </body>
      <GoogleAnalytics gaId="G-10K4P7GLF3" />
    </html>
  );
}
