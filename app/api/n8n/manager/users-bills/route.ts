import { assertN8nRequest } from '@/lib/n8n'
import { jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)

    const { rows } = await query<{
      user_id: string
      user_name: string
      telegram_chat_id: string | null
      house_id: string
      house_name: string
      bill_id: string | null
      bill_title: string | null
      bill_due_date: string | null
      bill_total: string | null
      participant_id: string | null
      participant_amount: string | null
      participant_paid: boolean | null
      paid_by_id: string | null
      paid_by_name: string | null
      paid_by_pix: string | null
    }>(
      `select
        u.id as user_id,
        u.name as user_name,
        u.telegram_chat_id,
        u.house_id,
        h.name as house_name,
        hb.id as bill_id,
        hb.title as bill_title,
        hb.due_date::text as bill_due_date,
        hb.total::text as bill_total,
        bp.id as participant_id,
        bp.amount::text as participant_amount,
        bp.paid as participant_paid,
        payer.id as paid_by_id,
        payer.name as paid_by_name,
        payer.pix_key as paid_by_pix
      from users u
      join houses h on u.house_id = h.id
      left join bill_participants bp on bp.user_id = u.id
      left join house_bills hb on hb.id = bp.bill_id
      left join users payer on hb.paid_by = payer.id
      order by u.house_id, u.name, hb.due_date asc nulls last`,
    )

    const usersMap = new Map<string, {
      id: string
      name: string
      telegram_chat_id: string | null
      house_id: string
      house_name: string
      bills: {
        bill_id: string
        title: string
        due_date: string | null
        total: string
        participant_id: string
        amount: string
        paid: boolean
        paid_by: { id: string; name: string; pix_key: string | null } | null
      }[]
    }>()

    for (const row of rows) {
      if (!usersMap.has(row.user_id)) {
        usersMap.set(row.user_id, {
          id: row.user_id,
          name: row.user_name,
          telegram_chat_id: row.telegram_chat_id,
          house_id: row.house_id,
          house_name: row.house_name,
          bills: [],
        })
      }

      if (row.bill_id && row.participant_id) {
        usersMap.get(row.user_id)!.bills.push({
          bill_id: row.bill_id,
          title: row.bill_title!,
          due_date: row.bill_due_date,
          total: row.bill_total!,
          participant_id: row.participant_id,
          amount: row.participant_amount!,
          paid: row.participant_paid ?? false,
          paid_by: row.paid_by_id
            ? { id: row.paid_by_id, name: row.paid_by_name!, pix_key: row.paid_by_pix }
            : null,
        })
      }
    }

    return Response.json({ users: Array.from(usersMap.values()) })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
