import { assertN8nRequest } from '@/lib/n8n'
import { jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)

    const { rows: items } = await query<{
      id: string
      name: string
      category: string
      quantity: number
      min_quantity: number
      unit: string
      house_id: string
    }>(
      `select id, name, category, quantity, min_quantity, unit, house_id
       from stock_items
       where quantity <= min_quantity
       order by (quantity - min_quantity) asc, name asc
       limit 20`,
    )

    const houseId = items[0]?.house_id || null

    return Response.json({ items, houseId })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
