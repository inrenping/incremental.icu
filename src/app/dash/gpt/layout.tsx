'use client'

import React from 'react'
import { useLayout } from "@/hooks/use-layout"
import { cn } from "@/lib/utils"
import { DocSidebar } from "@/components/dash/doc-sidebar"

export default function GptLayout({
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
      <DocSidebar />

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
