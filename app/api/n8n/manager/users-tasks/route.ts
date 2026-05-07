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
      task_id: string | null
      task_title: string | null
      task_room: string | null
      task_status: string | null
      task_priority: string | null
      task_due_date: string | null
      task_overdue: boolean | null
    }>(
      `select
        u.id as user_id,
        u.name as user_name,
        u.telegram_chat_id,
        u.house_id,
        h.name as house_name,
        t.id as task_id,
        t.title as task_title,
        t.room as task_room,
        t.status as task_status,
        t.priority as task_priority,
        t.due_date::text as task_due_date,
        t.overdue as task_overdue
      from users u
      join houses h on u.house_id = h.id
      left join tasks t on t.assigned_to = u.id and t.status <> 'done'
      order by u.house_id, u.name, t.due_date asc nulls last`,
    )

    // Group tasks per user
    const usersMap = new Map<string, {
      id: string
      name: string
      telegram_chat_id: string | null
      house_id: string
      house_name: string
      tasks: {
        id: string
        title: string
        room: string
        status: string
        priority: string
        due_date: string | null
        overdue: boolean
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
          tasks: [],
        })
      }

      if (row.task_id) {
        usersMap.get(row.user_id)!.tasks.push({
          id: row.task_id,
          title: row.task_title!,
          room: row.task_room!,
          status: row.task_status!,
          priority: row.task_priority!,
          due_date: row.task_due_date,
          overdue: row.task_overdue ?? false,
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
