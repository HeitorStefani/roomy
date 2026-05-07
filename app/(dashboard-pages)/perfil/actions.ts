'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { emitN8nEvent } from '@/lib/n8n'
import { saveUploadedFile } from '@/lib/storage'

export async function updateProfile(data: {
  userId: string
  name: string
  avatarColor: string
  emailNotificacao: string | null
  pixKey: string | null
}) {
  await query(
    `update users
     set name = $1, avatar_color = $2, email_notificacao = $3, pix_key = $4, updated_at = now()
     where id = $5`,
    [data.name, data.avatarColor, data.emailNotificacao, data.pixKey, data.userId],
  )

  await emitN8nEvent('profile.updated', { userId: data.userId })
  revalidatePath('/perfil')
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File
  const userId = formData.get('userId') as string

  if (!file || !userId) return { error: 'Dados invalidos.' }

  const saved = await saveUploadedFile('avatars', file, userId)
  const urlWithCache = `${saved.publicUrl}?t=${Date.now()}`

  await query('update users set avatar_url = $1, updated_at = now() where id = $2', [urlWithCache, userId])

  await emitN8nEvent('profile.updated', { userId, avatarUrl: urlWithCache })
  revalidatePath('/perfil')
  return { url: urlWithCache }
}
