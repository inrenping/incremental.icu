import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle";
import { ModeIntl } from "@/components/mode-intl";
export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) py-4 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dash</h1>
        <div className="ml-auto flex items-center gap-2">

          <ModeIntl />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
