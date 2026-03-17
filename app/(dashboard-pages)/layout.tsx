import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_color, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <SidebarProvider>
      <AppSidebar
        user={profile ? {
          name:        profile.name,
          avatarColor: profile.avatar_color ?? 'bg-zinc-500',
          avatarUrl:   profile.avatar_url ?? null,
        } : undefined}
      />
      <main className="flex-1 overflow-auto text-white">
        {children}
      </main>
    </SidebarProvider>
  )
}