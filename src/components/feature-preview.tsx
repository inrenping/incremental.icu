'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  IconLayoutDashboard,
  IconDatabaseSearch,
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'

const TABS = [
  { id: 'dashboard', label: '仪表盘', image: '/dash_0.webp', icon: IconLayoutDashboard },
  { id: 'query', label: '数据查询', image: '/dash_1.webp', icon: IconDatabaseSearch },
  { id: 'accounts', label: '账号管理', image: '/dash_2.webp', icon: IconUsers },
] as const

const AUTO_ROTATE_INTERVAL = 10000

export function FeaturePreview() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [[page, direction], setPage] = useState([0, 0])

  const paginate = useCallback((newDirection: number) => {
    setActiveIndex((prev) => (prev + newDirection + TABS.length) % TABS.length)
    setPage(([prev]) => [prev + newDirection, newDirection])
  }, [])

  const goTo = useCallback((index: number) => {
    const newDirection = index > activeIndex ? 1 : index < activeIndex ? -1 : 0
    if (newDirection !== 0) {
      setActiveIndex(index)
      setPage(([prev]) => [prev + newDirection, newDirection])
    }
  }, [activeIndex])

  // Auto-rotate every 10 seconds, pause on hover
  useEffect(() => {
    if (isHovering) return
    const timer = setInterval(() => paginate(1), AUTO_ROTATE_INTERVAL)
    return () => clearInterval(timer)
  }, [isHovering, paginate])

  const activeTab = TABS[activeIndex]

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">

        {/* Tab bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-border/50 shadow-sm">
            {TABS.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => goTo(index)} className={cn(
                    'relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300',
                    activeIndex === index
                      ? 'text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeIndex === index && (
                    <motion.div
                      layoutId="feature-tab-indicator"
                      className="absolute inset-0 bg-primary rounded-xl shadow-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview card */}
        <div
          className="relative group"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Prev/Next buttons */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-white/20"
            aria-label="上一个"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white dark:hover:bg-white/20"
            aria-label="下一个"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>

          <div className="relative rounded-2xl overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20">
            {/* Image container with bottom fade-out */}
            <div className="relative w-full" style={{ aspectRatio: '5/3', maxHeight: '70vh' }}>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 z-10 pointer-events-none bg-gradient-to-t from-background to-transparent" />
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.img
                  key={page}
                  src={activeTab.image}
                  alt={activeTab.label}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-full h-full object-cover object-top"
                />
              </AnimatePresence>
            </div>

          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {TABS.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  index === activeIndex
                    ? 'w-8 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                aria-label={`切换到第 ${index + 1} 个预览`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
