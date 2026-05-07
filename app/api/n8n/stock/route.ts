import { query } from '@/lib/db'
import { assertN8nRequest } from '@/lib/n8n'
import { getTelegramUser, jsonError } from '@/lib/n8n-api'
import { addStockItem, toggleShoppingList, updateQuantity } from '@/app/(dashboard-pages)/estoque/actions'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)
    const url = new URL(request.url)
    const telegramChatId = url.searchParams.get('telegramChatId')
    if (!telegramChatId) return jsonError('telegramChatId is required')

    const user = await getTelegramUser(telegramChatId)
    if (!user) return jsonError('Telegram user is not linked', 404)

    const { rows } = await query(
      `select id, name, category, quantity, min_quantity, unit, owner_id, in_shopping_list
       from stock_items
       where house_id = $1 and (owner_id is null or owner_id = $2)
       order by name asc`,
      [user.house_id, user.id],
    )

    return Response.json({ stock: rows })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}

export async function POST(request: Request) {
  try {
    assertN8nRequest(request)
    const body = await request.json()
    const user = await getTelegramUser(String(body.telegramChatId ?? ''))
    if (!user) return jsonError('Telegram user is not linked', 404)

    if (body.action === 'add') {
      await addStockItem({
        houseId: user.house_id,
        userId: user.id,
        name: body.name,
        category: body.category ?? 'Outros',
        quantity: Number(body.quantity ?? 1),
        minQuantity: Number(body.minQuantity ?? 1),
        unit: body.unit ?? 'un',
        owner: body.owner ?? 'casa',
      })
      return Response.json({ ok: true })
    }

    if (body.action === 'quantity') {
      await updateQuantity(String(body.itemId), Number(body.delta))
      return Response.json({ ok: true })
    }

    if (body.action === 'shopping-list') {
      await toggleShoppingList(String(body.itemId), Boolean(body.current))
      return Response.json({ ok: true })
    }

    return jsonError('Unsupported action')
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
