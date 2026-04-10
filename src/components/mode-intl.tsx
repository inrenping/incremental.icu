"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { IconLanguage, IconCheck } from "@tabler/icons-react"

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

  const changeLocale = (newLocale: string) => {
    // 设置 cookie 存储用户选择的语言
    document.cookie = `NEXT_INTL_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // 刷新页面让 next-intl 读取新的 cookie
    router.refresh();
  }

  // 语言配置列表，方便扩展
  const languages = [
    { label: "简体中文", value: "zh" },
    { label: "English", value: "en" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 px-0">
          <IconLanguage className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span className="sr-only">Toggle locale</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
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