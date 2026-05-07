import { query } from '@/lib/db'

export async function getTelegramUser(telegramChatId: string) {
  const { rows } = await query<{
    id: string
    name: string
    house_id: string
    telegram_chat_id: string
  }>(
    `select id, name, house_id, telegram_chat_id
     from users
     where telegram_chat_id = $1
     limit 1`,
    [telegramChatId],
  )

  return rows[0] ?? null
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
