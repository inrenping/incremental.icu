import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { SiteHeader } from "@/components/dash/site-header"
import { GoogleOAuthProvider } from '@react-oauth/google';

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
    <SiteHeader />
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      {children}
    </GoogleOAuthProvider>

  </>
  );
}
