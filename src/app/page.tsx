'use client'

import { useRouter } from 'next/navigation';
import { IconArrowRight, IconLock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from 'next-intl'
import { SiteHeader } from "@/components/login/site-header"
import { SiteFooter } from "@/components/dash/site-footer"
export default function Home() {
  const common = useTranslations('TabTitles')
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-24 px-4 text-center bg-cover bg-center bg-no-repeat bg-[url('/bg.webp')] dark:bg-[url('/bg-dark.webp')]">
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-6xl text-foreground font-bold tracking-tight">One place for all your movement data</p>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{common('description')}</p>
            <div className="pt-8 space-y-4">
              <Button
                onClick={() => router.push('/login')}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <IconArrowRight className="h-6 w-6" />
              </Button>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <IconLock className="h-4 w-4" />Your data is encrypted
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Auto Sync", desc: "Sync activities from Garmin & Coros automatically" },
              { title: "All-in-One", desc: "Unify all health and sleep metrics in one dashboard" },
              { title: "Secure & Private", desc: "Your data is encrypted and never shared with third parties" },
              { title: "Ready to Analyze", desc: "Clean, consistent data format for your own analysis" },
            ].map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="py-20 px-4 bg-muted/70">
          <div className="max-w-6xl mx-auto text-center space-y-12">
            <h2 className="text-3xl font-bold">Supported Platforms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { name: "Garmin GLOBAL", desc: "Sync global account data" },
                { name: "Garmin CN", desc: "Full support for Garmin China" },
                { name: "Coros", desc: "Sync your Coros training data" },
              ].map((platform) => (
                <PlatformCard key={platform.name} {...platform} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl border bg-card hover:shadow-md transition-shadow">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">{desc}</p>
    </div>
  )
}

function PlatformCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="p-8 rounded-2xl border bg-background text-center">
      <h3 className="font-bold">{name}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{desc}</p>
    </div>
  )
}