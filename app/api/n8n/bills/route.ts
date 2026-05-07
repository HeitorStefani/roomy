import { query } from '@/lib/db'
import { assertN8nRequest } from '@/lib/n8n'
import { getTelegramUser, jsonError } from '@/lib/n8n-api'
import { addHouseBill, markParticipantAsPaid } from '@/app/(dashboard-pages)/contas/actions'

type BillParticipantPayload = {
  userId: string
  amount: number | string
}

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)
    const url = new URL(request.url)
    const telegramChatId = url.searchParams.get('telegramChatId')
    if (!telegramChatId) return jsonError('telegramChatId is required')

    const user = await getTelegramUser(telegramChatId)
    if (!user) return jsonError('Telegram user is not linked', 404)

    const { rows } = await query(
      `select hb.id, hb.title, hb.total, hb.due_date, hb.paid_by,
              bp.id as participant_id, bp.amount, bp.paid
       from house_bills hb
       join bill_participants bp on bp.bill_id = hb.id
       where hb.house_id = $1 and bp.user_id = $2
       order by hb.due_date asc`,
      [user.house_id, user.id],
    )

    return Response.json({ bills: rows })
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

    if (body.action === 'mark-paid') {
      await markParticipantAsPaid(String(body.participantId))
      return Response.json({ ok: true })
    }

    if (body.action === 'create') {
      const involved = (body.involved ?? [{ userId: user.id, amount: Number(body.total) }]) as BillParticipantPayload[]

      await addHouseBill({
        houseId: user.house_id,
        userId: user.id,
        title: body.title,
        total: Number(body.total),
        dueDate: body.dueDate ?? new Date().toISOString().split('T')[0],
        involved: involved.map(p => ({
          userId: p.userId,
          amount: Number(p.amount),
        })),
        items: body.items ?? [],
      })
      return Response.json({ ok: true })
    }

    return jsonError('Unsupported action')
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
