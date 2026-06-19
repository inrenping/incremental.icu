"use client";

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";


import { IconSlash, IconHeartFilled } from "@tabler/icons-react";

export function SiteFooter() {
  const { layout } = useLayout();
  const t = useTranslations("IndexPage");

  return (
    <footer className="border-t bg-background w-full py-4">
      <div className={cn(
        "px-6 transition-all duration-300 mx-auto",
        layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
      )}>
        <div className="flex h-(--header-height) items-center justify-center gap-x-4 text-sm text-zinc-400 dark:text-zinc-500 tracking-wide">
          <span>© 2026 incremental.icu. All rights reserved.</span>
          <IconSlash className="h-3 w-3 opacity-40" />
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <IconHeartFilled className="h-3 w-3" />
            <span>by inrenping.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}