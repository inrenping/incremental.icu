import type { Metadata } from "next";
import { getMessages } from "next-intl/server";

import { SiteHeader } from "@/components/dash/site-header"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const title = messages.TabTitles?.title ?? "Incremental";
  const description = messages.TabTitles?.description ?? "";

  return {
    title: `${title} | ${description}`,
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (<>
    <header>
      <SiteHeader />
    </header>
    {children}
  </>
  );
}
