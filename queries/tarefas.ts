'use server'

import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'

export async function getTarefasData() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (!profile?.house_id) return null

  const houseId = profile.house_id

  const [{ rows: moradores }, { rows: tasks }, { rows: history }] = await Promise.all([
    query<{ id: string; name: string; avatar_color: string | null }>(
      'select id, name, avatar_color from users where house_id = $1 order by name asc',
      [houseId],
    ),
    query<{
      id: string
      title: string
      room: string
      assigned_to: string
      status: string
      priority: string
      recurrence: string
      start_date: string | null
      due_date: string | null
      overdue: boolean
      rotation_members: string[] | null
      week_days: number[] | null
    }>(
      `select id, title, room, assigned_to, status, priority, recurrence, start_date, due_date,
              overdue, rotation_members, week_days
       from tasks
       where house_id = $1
       order by due_date asc nulls last`,
      [houseId],
    ),
    query<{ id: string; task_title: string | null; done_by: string; done_at: string }>(
      `select th.id, t.title as task_title, th.done_by, th.done_at
       from task_history th
       left join tasks t on t.id = th.task_id
       where t.house_id = $1 or t.house_id is null
       order by th.done_at desc
       limit 20`,
      [houseId],
    ),
  ])

  return JSON.parse(JSON.stringify({
    userId: user.id,
    profile,
    moradores,
    tasks: tasks.map(t => ({
      id:              t.id,
      title:           t.title,
      room:            t.room,
      assignedTo:      t.assigned_to,
      status:          t.status,
      priority:        t.priority,
      recurrence:      t.recurrence,
      startDate:       t.start_date,
      dueDate:         t.due_date,
      overdue:         t.overdue,
      rotationMembers: t.rotation_members ?? [],
      weekDays:        t.week_days ?? [],
    })),
    history: history.map(h => ({
      id:        h.id,
      taskTitle: h.task_title ?? '-',
      doneBy:    h.done_by,
      doneAt:    new Date(h.done_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      }),
    })),
  }))
}
