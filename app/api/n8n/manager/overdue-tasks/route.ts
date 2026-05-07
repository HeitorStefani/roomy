import { assertN8nRequest } from '@/lib/n8n'
import { jsonError } from '@/lib/n8n-api'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    assertN8nRequest(request)

    const { rows: tasks } = await query<{
      id: string
      title: string
      room: string
      due_date: string
      assigned_to: string
      assigned_user_id: string
      assigned_user_name: string
      assigned_user_telegram: string | null
    }>(
      `select
        t.id,
        t.title,
        t.room,
        t.due_date::text as due_date,
        t.assigned_to,
        u.id as assigned_user_id,
        u.name as assigned_user_name,
        u.telegram_chat_id as assigned_user_telegram
      from tasks t
      join users u on t.assigned_to = u.id
      where t.status = 'todo'
        and t.due_date < current_date
        and t.overdue = false
      order by t.due_date asc`,
    )

    const formatted = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      room: t.room,
      due_date: t.due_date,
      assigned_user: {
        id: t.assigned_user_id,
        name: t.assigned_user_name,
        telegram_chat_id: t.assigned_user_telegram,
      },
    }))

    if (tasks.length > 0) {
      await query(
        `update tasks set overdue = true where id = any($1::uuid[])`,
        [tasks.map((t) => t.id)],
      )
    }

    return Response.json({ tasks: formatted })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(error)
    return jsonError('Internal error', 500)
  }
}
