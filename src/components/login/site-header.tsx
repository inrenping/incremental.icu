import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { GitHubLink } from '@/components/githubLink';
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { layout } = useLayout();
  const router = useRouter();
  const t = useTranslations("IndexPage");
  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className={cn(
        "px-6 transition-all duration-300 mx-auto",
        layout === "fixed" ? "max-w-7xl" : "max-w-none w-full"
      )}>
        <div className="flex h-(--header-height) gap-3 items-center **:data-[slot=separator]:h-4!">
          <img src="/favicon.svg" alt="Logo" className="h-6 w-6" />
          <h1 className="text-base font-medium cursor-pointer" onClick={() => router.push('/')}>
            {t('title')}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
            <ModeIntl />
            <ModeToggle />
            <SiteConfig />
            <GitHubLink />
          </div>
        </div>
      </div>
    </header>
  )
}