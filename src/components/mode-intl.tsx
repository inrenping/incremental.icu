"use client"

import { useTransition } from "react";
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { IconLanguage, IconCheck, IconLoader2 } from "@tabler/icons-react" // 引入了加载图标

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeIntl() {
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (newLocale: string) => {
    // 避免重复点击相同的语言
    if (newLocale === locale) return;

    startTransition(() => {
      if (typeof document !== "undefined") {
        document.cookie = `NEXT_INTL_LOCALE=${newLocale}; path=/; max-age=31536000`;
      }
      router.refresh();
    });
  };

  const languages = [
    { label: "简体中文", value: "zh" },
    { label: "English", value: "en" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 px-0"
          disabled={isPending}
        >
          {isPending ? (
            <IconLoader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
          ) : (
            <IconLanguage className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Toggle locale</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            disabled={isPending}
            onClick={() => changeLocale(lang.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            {lang.label}
            {locale === lang.value && <IconCheck className="ml-2 h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}