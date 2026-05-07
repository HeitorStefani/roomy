import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'
import { query } from '@/lib/db'

const COOKIE_NAME = 'roomy_session'
const DEFAULT_SECRET = 'change-me-roomy-session-secret'

type SessionPayload = {
  sub: string
  ra: string
}

export type CurrentUser = {
  id: string
  ra: string
}

function sessionSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? DEFAULT_SECRET)
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const actual = pbkdf2Sync(password, salt, 120000, 32, 'sha256')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function createSession(user: CurrentUser) {
  const token = await new SignJWT({ ra: user.ra } satisfies Omit<SessionPayload, 'sub'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(sessionSecret())

  const cookieStore = await cookies()
  const isHttps = process.env.PUBLIC_BASE_URL?.startsWith('https') === true

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, sessionSecret())
    const userId = payload.sub
    const ra = payload.ra
    if (!userId || typeof ra !== 'string') return null
    return { id: userId, ra }
  } catch {
    return null
  }
}

export async function getUserProfile(userId: string) {
  const { rows } = await query<{
    id: string
    name: string
    avatar_color: string | null
    avatar_url: string | null
    role: 'admin' | 'member'
    house_id: string | null
    email_notificacao: string | null
    pix_key: string | null
    telegram_chat_id: string | null
  }>(
    `select id, name, avatar_color, avatar_url, role, house_id, email_notificacao, pix_key, telegram_chat_id
     from users
     where id = $1
     limit 1`,
    [userId],
  )

  return rows[0] ?? null
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (profile?.role !== 'admin') return null

  return { user, profile }
}

export { COOKIE_NAME }
