import type { Metadata } from "next";

import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";

const title = "Blunt."
const description = "A example registry for distributing code using shadcn."

export const metadata: Metadata = {
  title: `${title} | ${description}`,
  description: description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (<>
    <header>
      <div className="max-w-7xl mx-auto flex items-center px-4 py-6">
        <div className="flex items-center gap-4">
        </div>
        <div className="ml-auto flex gap-2">
          <ModeIntl />
          <ModeToggle />
        </div>
      </div>
    </header>
    {children}
  </>
  );
}
