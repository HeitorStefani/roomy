import { assertN8nRequest } from '@/lib/n8n'
import { getTelegramUser, jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)
    const url = new URL(request.url)
    const telegramChatId = url.searchParams.get('telegramChatId')
    if (!telegramChatId) return jsonError('telegramChatId is required')

    const user = await getTelegramUser(telegramChatId)
    if (!user) return jsonError('Telegram user is not linked', 404)

    const { rows: moradores } = await query<{ id: string; name: string; pix_key: string | null }>(
      'select id, name, pix_key from users where house_id = $1 order by name asc',
      [user.house_id],
    )

    return Response.json({ user, moradores })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
