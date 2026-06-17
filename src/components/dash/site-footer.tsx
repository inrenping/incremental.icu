"use client";

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";


import { IconSlash, IconHeartFilled } from "@tabler/icons-react";

export function SiteFooter() {
  const { layout } = useLayout();
  const t = useTranslations("IndexPage");

  return (
    <footer className="border-t bg-background w-full">
      <div className={cn(
        "py-10 text-center text-sm text-muted-foreground mx-auto transition-all duration-300",
        layout === "fixed" ? "max-w-7xl px-6" : "max-w-none w-full px-6"
      )}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-400 dark:text-zinc-500 tracking-wide">
            <span>© 2026 incremental.icu. All rights reserved.</span>
            <IconSlash className="h-3 w-3 opacity-40" />
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <IconHeartFilled className="h-3 w-3" />
              <span>by inrenping.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}