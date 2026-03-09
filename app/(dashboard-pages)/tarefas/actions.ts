'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Recurrence = 'única' | 'diária' | '2x-semana' | 'semanal' | 'quinzenal' | 'mensal'

function getNextDueDate(current: string, recurrence: Recurrence): string {
  const d = new Date(current)
  switch (recurrence) {
    case 'diária':     d.setDate(d.getDate() + 1);    break
    case '2x-semana':  d.setDate(d.getDate() + 3);    break  // ~2x por semana
    case 'semanal':    d.setDate(d.getDate() + 7);    break
    case 'quinzenal':  d.setDate(d.getDate() + 14);   break
    case 'mensal':     d.setMonth(d.getMonth() + 1);  break
    default:           break
  }
  return d.toISOString().split('T')[0]
}

export async function moveTask(taskId: string, newStatus: 'todo' | 'doing' | 'done', userId: string) {
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, room, assigned_to, priority, recurrence, due_date, house_id, rotation_members')
    .eq('id', taskId)
    .single()

  if (!task) return

  await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)

  if (newStatus === 'done') {
    await supabase.from('task_history').insert({
      task_id: taskId,
      done_by: userId,
      done_at: new Date().toISOString(),
    })

    if (task.recurrence !== 'única') {
      // Usa rotation_members se definido, senão todos da casa
      let memberIds: string[] = task.rotation_members ?? []

      if (!memberIds.length) {
        const { data: moradores } = await supabase
          .from('users')
          .select('id')
          .eq('house_id', task.house_id)
          .order('name', { ascending: true })
        memberIds = (moradores ?? []).map((m: { id: string }) => m.id)
      }

      const currIdx = memberIds.indexOf(task.assigned_to)
      const nextId  = memberIds[(currIdx + 1) % memberIds.length]
      const nextDue = getNextDueDate(task.due_date, task.recurrence as Recurrence)

      await supabase.from('tasks').insert({
        house_id:         task.house_id,
        title:            task.title,
        room:             task.room,
        assigned_to:      nextId,
        status:           'todo',
        priority:         task.priority,
        recurrence:       task.recurrence,
        due_date:         nextDue,
        overdue:          false,
        rotation_members: task.rotation_members,
      })
    }
  }

  revalidatePath('/tarefas')
}

export async function addTask(data: {
  houseId: string
  title: string
  room: string
  assignedTo: string
  priority: 'alta' | 'média' | 'baixa'
  recurrence: Recurrence
  dueDate: string
  rotationMembers: string[]
}) {
  const supabase = await createClient()

  await supabase.from('tasks').insert({
    house_id:         data.houseId,
    title:            data.title,
    room:             data.room,
    assigned_to:      data.assignedTo,
    status:           'todo',
    priority:         data.priority,
    recurrence:       data.recurrence,
    due_date:         data.dueDate || new Date().toISOString().split('T')[0],
    overdue:          false,
    rotation_members: data.rotationMembers.length ? data.rotationMembers : null,
  })

  revalidatePath('/tarefas')
}

export async function editTask(data: {
  taskId: string
  title: string
  room: string
  assignedTo: string
  priority: 'alta' | 'média' | 'baixa'
  recurrence: Recurrence
  dueDate: string
  rotationMembers: string[]
}) {
  const supabase = await createClient()

  await supabase.from('tasks').update({
    title:            data.title,
    room:             data.room,
    assigned_to:      data.assignedTo,
    priority:         data.priority,
    recurrence:       data.recurrence,
    due_date:         data.dueDate || new Date().toISOString().split('T')[0],
    rotation_members: data.rotationMembers.length ? data.rotationMembers : null,
  }).eq('id', data.taskId)

  revalidatePath('/tarefas')
}