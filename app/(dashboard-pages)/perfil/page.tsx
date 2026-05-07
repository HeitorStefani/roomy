import { redirect } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'
import PerfilClient from './perfil-client'

export default async function PerfilPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)
  if (!profile) redirect('/login')

  const { rows } = await query<{ name: string }>(
    'select name from houses where id = $1 limit 1',
    [profile.house_id],
  )

  return (
    <PerfilClient
      data={{
        userId:           profile.id,
        name:             profile.name,
        avatarColor:      profile.avatar_color ?? 'bg-zinc-500',
        avatarUrl:        profile.avatar_url ?? null,
        houseName:        rows[0]?.name ?? '-',
        emailNotificacao: profile.email_notificacao ?? null,
        pixKey:           profile.pix_key ?? null,
      }}
    />
  )
}
