import { assertN8nRequest } from '@/lib/n8n'
import { jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)

    const { rows: houses } = await query<{ id: string }>('select id from houses limit 1')
    const houseId = houses[0]?.id

    if (!houseId) {
      return Response.json({
        houseId: null,
        pendingTasks: 0,
        overdueTasks: 0,
        unpaidBills: 0,
        unpaidAmount: 0,
        lowStockItems: 0,
      })
    }

    const { rows: taskStats } = await query<{ pending: string; overdue: string }>(
      `select
        count(*) filter (where status = 'todo') as pending,
        count(*) filter (where status = 'todo' and due_date < current_date) as overdue
      from tasks
      where house_id = $1`,
      [houseId],
    )

    const { rows: billStats } = await query<{ count: string; total: string }>(
      `select
        count(distinct bp.id) as count,
        coalesce(sum(bp.amount), 0) as total
      from bill_participants bp
      join house_bills hb on bp.bill_id = hb.id
      where hb.house_id = $1
        and bp.paid = false`,
      [houseId],
    )

    const { rows: stockStats } = await query<{ count: string }>(
      `select count(*) as count
       from stock_items
       where house_id = $1
         and quantity <= min_quantity`,
      [houseId],
    )

    return Response.json({
      houseId,
      pendingTasks: Number(taskStats[0]?.pending || 0),
      overdueTasks: Number(taskStats[0]?.overdue || 0),
      unpaidBills: Number(billStats[0]?.count || 0),
      unpaidAmount: Number(billStats[0]?.total || 0),
      lowStockItems: Number(stockStats[0]?.count || 0),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
