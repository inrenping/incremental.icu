import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const { layout } = useLayout();

  return (
    <footer className="border-t bg-background w-full">
      <div className={cn(
        "py-6 text-center text-sm text-muted-foreground mx-auto transition-all duration-300",
        layout === "fixed" ? "max-w-7xl px-6" : "max-w-none w-full px-6"
      )}>
        Made with ❤️ © 2026 inrenping. The source code is available on{" "}
        <a href="https://github.com/inrenping/incremental.icu" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
          GitHub
        </a>.
      </div>
    </footer>
  );
}