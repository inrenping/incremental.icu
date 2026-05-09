"use client";

import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { toast } from 'sonner';
import { IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
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

  useEffect(() => {
    const userData = storage.get('user');
    if (userData) {
      try {
        const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        setUser(parsedUser);
      } catch (error) {
        console.error("解析用户信息失败:", error);
      }
    }
  }, []);

  const router = useRouter();

  const t = useTranslations("IndexPage");

  const navItems = [
    { name: t("dash"), href: '/dash' },
    { name: t("accounts"), href: '/dash/accounts' },
    { name: t("logs"), href: '/dash/logs' },
  ];

  const handleLogout = () => {
    storage.clearAuth();
    toast.success("logout Success");
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className={cn(
        "px-6 transition-all duration-300 mx-auto",
        layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
      )}>
        <div className="flex h-(--header-height) items-center **:data-[slot=separator]:h-4!">
          <h1
            className="text-base font-medium cursor-pointer"
            onClick={() => router.push('/')}
          >
            {t('title')}
          </h1>

          <nav className="hidden md:flex items-center space-x-6 ml-6">
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

          <div className="ml-auto flex items-center gap-2">
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
                <DropdownMenuItem onClick={() => router.push('/settings/profile')} className="focus:bg-primary/50">
                  <span>{t("userSettings")}</span>
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