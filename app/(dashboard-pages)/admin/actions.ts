'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { hashPassword, requireAdmin } from '@/lib/auth'
import { query } from '@/lib/db'

async function assertAdmin() {
  const admin = await requireAdmin()
  if (!admin) redirect('/dashboard')
  return admin
}

export async function createAdminUser(formData: FormData) {
  const { profile } = await assertAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const ra = String(formData.get('ra') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const role = String(formData.get('role') ?? 'member') === 'admin' ? 'admin' : 'member'
  const houseId = String(formData.get('houseId') ?? profile.house_id)

  if (!name || !ra || !password || !houseId) return

  await query(
    `insert into users (house_id, ra, email, password_hash, name, avatar_color, role)
     values ($1, $2, $3, $4, $5, 'bg-zinc-500', $6)`,
    [houseId, ra, `${ra}@republica.app`, hashPassword(password), name, role],
  )

  revalidatePath('/admin')
}

export async function updateAdminUser(formData: FormData) {
  await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? 'member') === 'admin' ? 'admin' : 'member'
  const telegramChatId = String(formData.get('telegramChatId') ?? '').trim() || null
  const pixKey = String(formData.get('pixKey') ?? '').trim() || null

  if (!userId || !name) return

  await query(
    `update users
     set name = $1, role = $2, telegram_chat_id = $3, pix_key = $4, updated_at = now()
     where id = $5`,
    [name, role, telegramChatId, pixKey, userId],
  )

  revalidatePath('/admin')
}

export async function resetUserPassword(formData: FormData) {
  await assertAdmin()
  const userId = String(formData.get('userId') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!userId || !password) return

  await query(
    'update users set password_hash = $1, updated_at = now() where id = $2',
    [hashPassword(password), userId],
  )

  revalidatePath('/admin')
}

export async function assignTaskAsAdmin(formData: FormData) {
  await assertAdmin()
  const taskId = String(formData.get('taskId') ?? '')
  const assignedTo = String(formData.get('assignedTo') ?? '')
  const status = String(formData.get('status') ?? 'todo')

  if (!taskId || !assignedTo) return

  await query(
    `update tasks
     set assigned_to = $1, status = $2, updated_at = now()
     where id = $3`,
    [assignedTo, status, taskId],
  )

  revalidatePath('/admin')
  revalidatePath('/tarefas')
}

export async function createHouse(formData: FormData) {
  await assertAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const inviteCode = String(formData.get('inviteCode') ?? '').trim().toUpperCase()

  if (!name || !inviteCode) return

  await query(
    'insert into houses (name, invite_code) values ($1, $2)',
    [name, inviteCode],
  )

  revalidatePath('/admin')
}
