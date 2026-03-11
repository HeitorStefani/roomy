'use server'

import { createClient } from '@/lib/supabase/server'

export async function getTarefasData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, avatar_color, house_id')
    .eq('id', user.id)
    .single()

  if (!profile?.house_id) return null

  const houseId = profile.house_id

  const { data: moradores } = await supabase
    .from('users')
    .select('id, name, avatar_color')
    .eq('house_id', houseId)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, room, assigned_to, status, priority, recurrence, start_date, due_date, overdue, rotation_members')
    .eq('house_id', houseId)
    .order('due_date', { ascending: true })

  const { data: history } = await supabase
    .from('task_history')
    .select('id, task_id, done_by, done_at, tasks(title)')
    .order('done_at', { ascending: false })
    .limit(20)

  return JSON.parse(JSON.stringify({
    userId:    user.id,
    profile,
    moradores: moradores ?? [],
    tasks: (tasks ?? []).map(t => ({
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
    })),
    history: (history ?? []).map(h => ({
      id:        h.id,
      taskTitle: (h.tasks as { title?: string } | null)?.title ?? '—',
      doneBy:    h.done_by,
      doneAt:    new Date(h.done_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    })),
  }))
}