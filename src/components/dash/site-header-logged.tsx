"use client";

import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { IconBrandGithubFilled, IconUser, IconSettings, IconLogout } from "@tabler/icons-react";
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

interface User {
  id: number;
  username: string;
  email: string;
}

export function SiteHeader() {
  const router = useRouter();
  const t = useTranslations("LoginPage");

  const handleLogout = () => {
    storage.clearAuth();
    toast.success("logout Success");
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none 3xl:fixed:px-0">
        <div className="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container">
          <h1 className="text-base font-medium">Incremental</h1>

          <div className="ml-auto flex items-center gap-2">

            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />

            <ModeIntl />
            <ModeToggle />
            <SiteConfig />

            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />

            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/incremental-icu/incremental.icu"
                target="_blank"
                rel="noreferrer"
              >
                <IconBrandGithubFilled className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
            </Button>

            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <IconUser className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{(storage.get('user') as unknown as User)?.username || t("myAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <IconSettings className="mr-2 h-4 w-4" />
                  <span>{t("userSettings")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                  <IconLogout className="mr-2 h-4 w-4" />
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