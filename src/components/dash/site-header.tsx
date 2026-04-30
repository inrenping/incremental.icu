"use client";

import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { toast } from 'sonner';
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

interface User {
  id: number;
  username: string;
  email: string;
}

export function SiteHeader() {
  const { layout } = useLayout();
  const [user, setUser] = useState<User | null>(null);

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
  const t = useTranslations("LoginPage");

  const handleLogout = () => {
    storage.clearAuth();
    toast.success("logout Success");
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className={cn(
        "px-6 transition-all duration-300 mx-auto",
        layout === "fixed" ? "max-w-6xl" : "max-w-none w-full"
      )}>
        <div className="flex h-(--header-height) items-center **:data-[slot=separator]:h-4!">
          <h1 className="text-base font-medium">Incremental</h1>

          <div className="ml-auto flex items-center gap-2">
            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
            <ModeIntl />
            <ModeToggle />
            <SiteConfig />
            <GitHubLink />
            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <IconSettings className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-9 px-0">
                <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
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