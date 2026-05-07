import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { assertN8nRequest, emitN8nEvent } from '@/lib/n8n'
import { getTelegramUser, jsonError } from '@/lib/n8n-api'
import { moveTask } from '@/app/(dashboard-pages)/tarefas/actions'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)
    const url = new URL(request.url)
    const telegramChatId = url.searchParams.get('telegramChatId')
    if (!telegramChatId) return jsonError('telegramChatId is required')

    const user = await getTelegramUser(telegramChatId)
    if (!user) return jsonError('Telegram user is not linked', 404)

    const { rows } = await query(
      `select id, title, room, status, priority, due_date, overdue
       from tasks
       where house_id = $1 and assigned_to = $2 and status <> 'done'
       order by due_date asc nulls last`,
      [user.house_id, user.id],
    )

    return Response.json({ tasks: rows })
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

    if (body.action === 'complete') {
      await moveTask(String(body.taskId), 'done', user.id)
      return Response.json({ ok: true })
    }

    if (body.action === 'create') {
      const { rows } = await query<{ id: string }>(
        `insert into tasks
         (house_id, title, room, assigned_to, status, priority, recurrence, start_date, due_date, overdue)
         values ($1, $2, $3, $4, 'todo', $5, 'unica', current_date, $6, false)
         returning id`,
        [user.house_id, body.title, body.room ?? 'Geral', body.assignedTo ?? user.id, body.priority ?? 'media', body.dueDate ?? null],
      )
      await emitN8nEvent('task.created', { taskId: rows[0].id, houseId: user.house_id, source: 'n8n' })
      revalidatePath('/tarefas')
      return Response.json({ ok: true, taskId: rows[0].id })
    }

    return jsonError('Unsupported action')
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
