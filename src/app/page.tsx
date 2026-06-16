'use client'

import { useRouter } from 'next/navigation';
import { IconArrowRight, IconRepeat, IconStack, IconShield, IconChartBar, } from "@tabler/icons-react";
import { Button } from "@/components/ui/button"
import { useTranslations } from 'next-intl'
import { SiteHeader } from "@/components/login/site-header"
import { SiteFooter } from "@/components/dash/site-footer"
import { SiteExplore } from '@/components/login/site-explore';
export default function Home() {
  const t = useTranslations('IndexPage')
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">

        <section className="py-24 px-4 text-center bg-cover bg-center bg-no-repeat">
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-6xl text-foreground font-bold tracking-tight">{t('hello')}</p>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t('description')}</p>
            <div className="pt-8 space-y-4">
              <Button
                onClick={() => router.push('/login')}
                size="lg"
                className="h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all gap-2 text-lg font-semibold"
              >
                {t('getStarted')}
                <IconArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-10 px-0 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t("card1Title"), desc: t("card1Desc"), icon: <IconRepeat className="h-6 w-6" /> },
              { title: t("card2Title"), desc: t("card2Desc"), icon: <IconStack className="h-6 w-6" /> },
              { title: t("card3Title"), desc: t("card3Desc"), icon: <IconShield className="h-6 w-6" /> },
              { title: t("card4Title"), desc: t("card4Desc"), icon: <IconChartBar className="h-6 w-6" /> },
            ].map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="py-20 px-0 max-w-6xl mx-auto">
          <SiteExplore />
        </section>

      </main>
      <SiteFooter />
    </div>
  )
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-black rounded-lg p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
      {/* 图标 */}
      <div className="text-green-500 mb-2 text-2xl">{icon}</div>
      {/* 标题 */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {/* 描述 */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {desc}
      </p>
    </div>
  )
}