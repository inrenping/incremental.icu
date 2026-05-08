import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { SiteConfig } from "@/components/site-config";
import { GitHubLink } from '@/components/githubLink';
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function SiteHeader() {

  const router = useRouter();
  const title = useTranslations("TabTitles");
  return (
    <header className="sticky top-0 z-50 py-4 w-full bg-background">
      <div className="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none 3xl:fixed:px-0">
        <div className="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container">
          <h1 className="text-base font-medium" onClick={() => router.push('/')}>{title('title')}</h1>

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