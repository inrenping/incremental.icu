"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconUser, IconSettings, IconShieldLock } from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const USER_MENU_ITEMS = [
  { name: "Profile", href: "/dash/user/profile", icon: IconUser },
  { name: "Settings", href: "/dash/user/settings", icon: IconSettings },
  { name: "Security", href: "/dash/user/security", icon: IconShieldLock },
]

export function UserSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar
      className="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] overscroll-none bg-transparent [--sidebar-menu-width:--spacing(56)] lg:flex"
      collapsible="none"
      {...props}
    >
      <div className="h-9" />
      <div className="absolute top-8 z-10 h-8 w-(--sidebar-menu-width) shrink-0 bg-linear-to-b from-background via-background/80 to-background/50 blur-xs" />
      <div className="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-linear-to-b from-transparent via-border to-transparent lg:flex" />
      <SidebarContent className="mx-auto no-scrollbar w-(--sidebar-menu-width) overflow-x-hidden px-2">
        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="font-medium text-muted-foreground">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {USER_MENU_ITEMS.map(({ name, href, icon: Icon }) => {
                return (
                  <SidebarMenuItem key={name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      className="relative h-9 w-full justify-start gap-2.5 border border-transparent px-3 text-sm font-medium data-[active=true]:border-accent data-[active=true]:bg-accent"
                    >
                      <Link href={href}>
                        <Icon className="size-4 shrink-0" />
                        {name}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="sticky -bottom-1 z-10 h-16 shrink-0 bg-linear-to-t from-background via-background/80 to-background/50 blur-xs" />
      </SidebarContent>
    </Sidebar>
  )
}