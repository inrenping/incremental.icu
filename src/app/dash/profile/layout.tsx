'use client'

import React from 'react'
import { useLayout } from "@/hooks/use-layout"
import { cn } from "@/lib/utils"
import Link from "next/link"
import docMenu from "@/lib/doc-menu.json"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { layout } = useLayout()

  return (
    <div className={cn(
      "flex flex-row gap-6 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      {/* 左侧自定义导航菜单 */}
      <aside className="hidden lg:block w-40 shrink-0">
        <div className="sticky top-10">
          <nav className="flex flex-col gap-4 text-muted-foreground/80">
            {docMenu.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {section.divider && sectionIndex > 0 && (
                  <div className="border-t border-border/60" />
                )}
                <div className="flex flex-col gap-3">
                  {section.items.map((item, itemIndex) => (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className="hover:text-primary transition-colors"
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
