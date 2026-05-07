'use server'

import { redirect } from 'next/navigation'
import { clearSession, createSession, hashPassword, verifyPassword } from '@/lib/auth'
import { query } from '@/lib/db'

const toEmail = (ra: string) => `${ra.trim()}@republica.app`

export async function login(formData: FormData) {
  const ra = String(formData.get('ra') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const { rows } = await query<{ id: string; ra: string; password_hash: string }>(
    'select id, ra, password_hash from users where ra = $1 limit 1',
    [ra],
  )

  const user = rows[0]
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect('/login?error=RA+ou+senha+invalidos')
  }

  await createSession({ id: user.id, ra: user.ra })
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const ra = String(formData.get('ra') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const inviteCode = String(formData.get('invite_code') ?? '').trim().toUpperCase()

  const { rows: houses } = await query<{ id: string }>(
    'select id from houses where invite_code = $1 limit 1',
    [inviteCode],
  )

  const house = houses[0]
  if (!house) {
    redirect('/login?mode=signup&error=Codigo+de+convite+invalido')
  }

  try {
    const { rows: counts } = await query<{ count: string }>(
      'select count(*) from users where house_id = $1',
      [house.id],
    )
    const role = Number(counts[0]?.count ?? 0) === 0 ? 'admin' : 'member'

    const { rows } = await query<{ id: string }>(
      `insert into users (ra, email, password_hash, house_id, name, avatar_color, role)
       values ($1, $2, $3, $4, $5, 'bg-zinc-500', $6)
       returning id`,
      [ra, toEmail(ra), hashPassword(password), house.id, name, role],
    )

    await createSession({ id: rows[0].id, ra })
  } catch (error) {
    console.error('signup error:', error)
    redirect('/login?mode=signup&error=Erro+ao+criar+conta.+RA+ja+cadastrado?')
  }

  redirect('/dashboard')
}

export async function logout() {
  await clearSession()
  redirect('/login')
}
