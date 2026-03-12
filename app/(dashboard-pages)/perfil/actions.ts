'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  userId: string
  name: string
  avatarColor: string
  emailNotificacao: string | null
  pixKey: string | null
}) {
  const supabase = await createClient()

  await supabase
    .from('users')
    .update({
      name:              data.name,
      avatar_color:      data.avatarColor,
      email_notificacao: data.emailNotificacao,
      pix_key:           data.pixKey,
    })
    .eq('id', data.userId)

  revalidatePath('/perfil')
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()

  const file   = formData.get('file') as File
  const userId = formData.get('userId') as string

  if (!file || !userId) return { error: 'Dados inválidos.' }

  const ext      = file.name.split('.').pop() ?? 'jpg'
  const filePath = `avatars/${userId}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { error: 'Erro ao fazer upload: ' + uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
  const urlWithCache = `${publicUrl}?t=${Date.now()}`

  await supabase.from('users').update({ avatar_url: urlWithCache }).eq('id', userId)

  revalidatePath('/perfil')
  return { url: urlWithCache }
}