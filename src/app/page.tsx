'use client'

import { useRouter } from 'next/navigation';
import { IconArrowRight, IconLock, IconRepeat, IconStack, IconShield, IconChartBar, } from "@tabler/icons-react";
import { Button } from "@/components/ui/button"
import { useTranslations } from 'next-intl'
import { SiteHeader } from "@/components/login/site-header"
import { SiteFooter } from "@/components/dash/site-footer"
export default function Home() {
  const t = useTranslations('IndexPage')
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-24 px-4 text-center bg-cover bg-center bg-no-repeat bg-[url('/bg.webp')] dark:bg-[url('/bg-dark.webp')]">
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-6xl text-foreground font-bold tracking-tight">{t('hello')}</p>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t('description')}</p>
            <div className="pt-8 space-y-4">
              <Button
                onClick={() => router.push('/login')}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <IconArrowRight className="h-6 w-6" />
              </Button>
              {/* <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <IconLock className="h-4 w-4" />Your data is encrypted
              </p> */}

            </div>
          </div>
        </section>

        <section className="py-20 px-4 max-w-6xl mx-auto">
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

        <section className="py-20 px-4 bg-muted/70">
          <div className="max-w-6xl mx-auto text-center space-y-12">
            <h2 className="text-lg font-black">{t("supportPlatform")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { name: t("garmin"), logo: "garmin", desc: "Garmin Connect", link: "https://connect.garmin.com" },
                { name: t("garminCn"), logo: "garmin", desc: "Garmin Connect for China", link: "https://connect.garmin.cn/" },
                { name: t("coros"), logo: "coros", desc: "COROS Training Hub", link: "https://t.coros.com/" },
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

function PlatformCard({ name, desc, logo, link }: { name: string; desc: string; logo: string; link: string }) {
  return (
    <div className="p-8 rounded-2xl border bg-background text-center flex flex-col items-center justify-center hover:shadow-md transition-shadow" onClick={() => window.open(`${link}`, '_blank')}>
      <img src={`/${logo}.png`} alt={name} className="h-20 w-auto mb-4 object-contain" />
      <h3 className="font-bold mb-1">{name}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{desc}</p>
    </div>
  )
}