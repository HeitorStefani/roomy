import { redirect } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  return (
    <SidebarProvider>
      <AppSidebar
        user={profile ? {
          name:        profile.name,
          avatarColor: profile.avatar_color ?? 'bg-zinc-500',
          avatarUrl:   profile.avatar_url ?? null,
          isAdmin:     profile.role === 'admin',
        } : undefined}
      />
      <main className="flex-1 overflow-auto text-white">
        {children}
      </main>
    </SidebarProvider>
  )
}
