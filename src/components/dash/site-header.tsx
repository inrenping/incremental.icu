import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
import { IconBrandGithubFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) py-4 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <h1 className="text-base font-medium">Incremental</h1>

        <div className="ml-auto flex items-center gap-2">

          <Separator orientation="vertical" className="mx-2 h-4 w-px bg-border" />
          <ModeIntl />
          <ModeToggle />

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
        </div>
      </div>
    </header>
  )
}