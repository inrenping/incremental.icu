
import { UserSidebar } from "@/components/dash/user-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="container-wrapper flex flex-1 flex-col px-2">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as React.CSSProperties
        }
      >
        {/* <div className="hidden md:block">
          <UserSidebar />
        </div> */}
        <div className="h-full w-full">{children}</div>
      </SidebarProvider>
    </div>
  )
}
