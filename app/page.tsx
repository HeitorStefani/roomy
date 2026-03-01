import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Se já estiver logado vai pro dashboard, senão pro login
  if (user) redirect('/dashboard')
  redirect('/login')
}