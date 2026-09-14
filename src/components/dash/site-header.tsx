"use client";

import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { storage } from "@/lib/storage";
import { toast } from 'sonner';
import { IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { authFetch } from "@/lib/api";
import { GitHubLink } from '@/components/githubLink';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
}

export function SiteHeader() {
  const { layout } = useLayout();
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const { signOut } = useClerk();

  useEffect(() => {
    const loadUser = async () => {
      const userData = storage.get('user');
      if (userData) {
        try {
          const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
          setUser(parsedUser);
        } catch (error) {
          console.error("解析用户信息失败:", error);
        }
        return;
      }

      // localStorage 中没有用户信息，从后端 API 获取
      try {
        const res = await authFetch('/api/v1/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const userInfo = {
              id: data.user.id,
              username: data.user.username,
              email: data.user.email,
              timezone: data.user.timezone,
              yearly_target: data.user.yearly_target,
            };
            storage.set('user', userInfo);
            setUser(userInfo);
          }
        }
      } catch (error) {
        console.error("获取用户信息失败:", error);
      }
    };

    loadUser();
  }, []);

  const router = useRouter();

  const t = useTranslations("IndexPage");

  const navItems = [
    { name: t("dash"), href: '/dash' },
    { name: "定时任务", href: '/dash/task' },
    { name: "快速开始", href: '/doc/guide' },
    { name: "网站状态", href: 'https://status.incremental.icu' }
  ];

  const handleLogout = async () => {
    // 清除本地存储
    storage.clearAuth();
    // 调用 Clerk signOut 清除 session
    await signOut();
    toast.success("logout Success");
    router.replace('/sign-in');
  };

  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className={cn(
        "px-6 transition-all duration-300 mx-auto",
        layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
      )}>
        <div className="grid h-(--header-height) grid-cols-[1fr_auto] items-center gap-3 **:data-[slot=separator]:h-4!">
          <div className="flex items-center gap-2">
            <Image src="/favicon.svg" alt="Logo" width={24} height={24} className="h-6 w-6" />
            <h1 className="cursor-pointer text-base font-medium" onClick={() => router.push('/')}>
              {t('title')}
            </h1>
          </div>

          <div className="flex items-center justify-end gap-2">
            <nav className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-2">
              <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
              <ModeIntl />
              <ModeToggle />
              <SiteConfig />
              <GitHubLink />
            </div>
            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 flex items-center gap-2 rounded-full">
                  <IconMenu2 className="h-5 w-5 md:hidden" />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="" alt={user?.username} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {user?.username && (
                    <span className="text-sm font-medium text-muted-foreground mr-1 hidden md:inline-block">
                      {user.username}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="md:hidden">
                  <div className="flex items-center justify-around py-2 px-1">
                    <ModeIntl />
                    <ModeToggle />
                    <SiteConfig />
                    <GitHubLink />
                  </div>
                  <DropdownMenuSeparator />
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={cn(
                        "focus:bg-primary/50",
                        pathname === item.href
                          ? "text-primary"
                          : ""
                      )}
                    >
                      <span>{item.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={() => router.push('/dash/profile')} className="focus:bg-primary/50">
                  <span>{t("userSettings")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/accounts')} className="focus:bg-primary/50">
                  <span>{t("accounts")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/gpt')} className="focus:bg-primary/50">
                  <span>{t("gptCode")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/task')} className="focus:bg-primary/50">
                  <span>{t("task")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/files')} className="focus:bg-primary/50">
                  <span>文件管理</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/activities/files')} className="focus:bg-primary/50">
                  <span>文件比对</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dash/activities/compare')} className="focus:bg-primary/50">
                  <span>数据比对</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}