import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationsBell } from "@/components/notifications-bell"
import { getNotificationCount } from "@/queries/notifications"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const count = await getNotificationCount()

  return (
    <SidebarProvider className="bg-gray-800 text-white">
      <AppSidebar />
      <main className="flex-1 min-h-screen w-full overflow-auto relative">
        <div className="fixed top-[93%] right-4 z-50">
          <NotificationsBell initialCount={count} />
        </div>
        {children}
      </main>
    </SidebarProvider>
  )
}