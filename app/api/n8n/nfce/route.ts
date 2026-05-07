import { assertN8nRequest } from '@/lib/n8n'
import { getTelegramUser, jsonError } from '@/lib/n8n-api'

export async function POST(request: Request) {
  try {
    assertN8nRequest(request)
    const { telegramChatId, url } = await request.json()
    if (!url) return jsonError('url is required')

    if (telegramChatId) {
      const user = await getTelegramUser(String(telegramChatId))
      if (!user) return jsonError('Telegram user is not linked', 404)
    }

    const baseUrl = new URL(request.url).origin
    const response = await fetch(`${baseUrl}/api/nfce?url=${encodeURIComponent(url)}`, { cache: 'no-store' })
    const data = await response.json()
    return Response.json(data, { status: response.status })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
