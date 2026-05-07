import { assertN8nRequest } from '@/lib/n8n'
import { jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)

    const { rows: bills } = await query<{
      id: string
      title: string
      due_date: string
      participant_id: string
      participant_user_id: string
      participant_user_name: string
      participant_user_telegram: string | null
      amount: string
      paid_by_user_id: string | null
      paid_by_user_name: string | null
      paid_by_user_pix: string | null
    }>(
      `select
        hb.id,
        hb.title,
        hb.due_date::text as due_date,
        bp.id as participant_id,
        u.id as participant_user_id,
        u.name as participant_user_name,
        u.telegram_chat_id as participant_user_telegram,
        bp.amount,
        payer.id as paid_by_user_id,
        payer.name as paid_by_user_name,
        payer.pix_key as paid_by_user_pix
      from house_bills hb
      join bill_participants bp on hb.id = bp.bill_id
      join users u on bp.user_id = u.id
      left join users payer on hb.paid_by = payer.id
      where bp.paid = false
        and hb.due_date < current_date
        and hb.notified = false
      order by hb.due_date asc`,
    )

    const formatted = bills.map((b) => ({
      id: b.id,
      title: b.title,
      due_date: b.due_date,
      participant_id: b.participant_id,
      amount: b.amount,
      participant_user: {
        id: b.participant_user_id,
        name: b.participant_user_name,
        telegram_chat_id: b.participant_user_telegram,
      },
      paid_by_user: b.paid_by_user_id
        ? {
            id: b.paid_by_user_id,
            name: b.paid_by_user_name,
            pix_key: b.paid_by_user_pix,
          }
        : null,
    }))

    if (bills.length > 0) {
      const billIds = [...new Set(bills.map((b) => b.id))]
      await query(`update house_bills set notified = true where id = any($1::uuid[])`, [billIds])
    }

    return Response.json({ bills: formatted })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
