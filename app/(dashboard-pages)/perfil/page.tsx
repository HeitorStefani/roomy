import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PerfilClient from './perfil-client'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, avatar_color, avatar_url, house_id, email_notificacao, pix_key')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: house } = await supabase
    .from('houses')
    .select('name')
    .eq('id', profile.house_id)
    .single()

  return (
    <PerfilClient
      data={{
        userId:           profile.id,
        name:             profile.name,
        avatarColor:      profile.avatar_color ?? 'bg-zinc-500',
        avatarUrl:        profile.avatar_url ?? null,
        houseName:        house?.name ?? '—',
        emailNotificacao: profile.email_notificacao ?? null,
        pixKey:           profile.pix_key ?? null,
      }}
    />
  )
}