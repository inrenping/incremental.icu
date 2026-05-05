
import { UserSidebar } from "@/components/dash/user-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
