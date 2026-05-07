import { assertN8nRequest } from '@/lib/n8n'
import { query } from '@/lib/db'
import { jsonError } from '@/lib/n8n-api'

export async function POST(request: Request) {
  try {
    assertN8nRequest(request)
    const { ra, telegramChatId } = await request.json()
    if (!ra || !telegramChatId) return jsonError('ra and telegramChatId are required')

    const { rows } = await query<{ id: string; name: string }>(
      `update users
       set telegram_chat_id = $1, updated_at = now()
       where ra = $2
       returning id, name`,
      [String(telegramChatId), String(ra).trim()],
    )

    if (!rows[0]) return jsonError('User not found', 404)
    return Response.json({ ok: true, user: rows[0] })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
