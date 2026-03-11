'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Recurrence = 'única' | 'diária' | '2x-semana' | 'semanal' | 'quinzenal' | 'mensal'

function getNextDueDate(current: string, recurrence: Recurrence, weekDays?: number[]): string {
  const d = new Date(current)

  // Recorrências com dias fixos configuráveis
  if ((recurrence === '2x-semana' || recurrence === 'semanal') && weekDays?.length) {
    const sorted = [...weekDays].sort((a, b) => a - b)
    const currentDay = d.getDay()
    // Próximo dia da lista depois do dia atual
    const nextDay = sorted.find(day => day > currentDay) ?? sorted[0]
    const diff = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  switch (recurrence) {
    case 'diária':    d.setDate(d.getDate() + 1);   break
    case '2x-semana': d.setDate(d.getDate() + 3);   break
    case 'semanal':   d.setDate(d.getDate() + 7);   break
    case 'quinzenal': d.setDate(d.getDate() + 14);  break
    case 'mensal':    d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString().split('T')[0]
}

function getNextStartDate(current: string): string {
  const d = new Date(current)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export async function moveTask(taskId: string, newStatus: 'todo' | 'doing' | 'done', userId: string) {
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, room, assigned_to, priority, recurrence, start_date, due_date, house_id, rotation_members, week_days')
    .eq('id', taskId)
    .single()

  if (fetchError) {
    console.error('moveTask fetch error:', fetchError)
    throw new Error(fetchError.message)
  }

  if (!task) return

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)

  if (updateError) {
    console.error('moveTask update error:', updateError)
    throw new Error(updateError.message)
  }

  if (newStatus === 'done') {
    const { error: historyError } = await supabase.from('task_history').insert({
      task_id: taskId,
      done_by: userId,
      done_at: new Date().toISOString(),
    })

    if (historyError) {
      console.error('moveTask history error:', historyError)
    }

    if (task.recurrence !== 'única') {
      let memberIds: string[] = task.rotation_members ?? []
      if (!memberIds.length) {
        const { data: moradores } = await supabase
          .from('users')
          .select('id')
          .eq('house_id', task.house_id)
          .order('name', { ascending: true })
        memberIds = (moradores ?? []).map((m: { id: string }) => m.id)
      }

      const currIdx   = memberIds.indexOf(task.assigned_to)
      const nextId    = memberIds[(currIdx + 1) % memberIds.length]
      const nextDue   = task.due_date
        ? getNextDueDate(task.due_date, task.recurrence as Recurrence, task.week_days ?? undefined)
        : null
      const nextStart = task.due_date ? getNextStartDate(task.due_date) : null

      const { error: insertError } = await supabase.from('tasks').insert({
        house_id:         task.house_id,
        title:            task.title,
        room:             task.room,
        assigned_to:      nextId,
        status:           'todo',
        priority:         task.priority,
        recurrence:       task.recurrence,
        start_date:       nextStart,
        due_date:         nextDue,
        overdue:          false,
        rotation_members: task.rotation_members,
        week_days:        task.week_days,
      })

      if (insertError) {
        console.error('moveTask recurrence insert error:', insertError)
        throw new Error(insertError.message)
      }
    }
  }

  revalidatePath('/tarefas')
}

export async function addTask(data: {
  houseId: string; title: string; room: string; assignedTo: string
  priority: 'alta' | 'média' | 'baixa'; recurrence: Recurrence
  startDate: string; dueDate: string; rotationMembers: string[]
  weekDays: number[]
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('tasks').insert({
    house_id:         data.houseId,
    title:            data.title,
    room:             data.room,
    assigned_to:      data.assignedTo,
    status:           'todo',
    priority:         data.priority,
    recurrence:       data.recurrence,
    start_date:       data.startDate || new Date().toISOString().split('T')[0],
    due_date:         data.dueDate   || null,
    overdue:          false,
    rotation_members: data.rotationMembers.length ? data.rotationMembers : null,
    week_days:        data.weekDays.length ? data.weekDays : null,
  })

  if (error) {
    console.error('addTask error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/tarefas')
}

export async function editTask(data: {
  taskId: string; title: string; room: string; assignedTo: string
  priority: 'alta' | 'média' | 'baixa'; recurrence: Recurrence
  startDate: string; dueDate: string; rotationMembers: string[]
  weekDays: number[]
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('tasks').update({
    title:            data.title,
    room:             data.room,
    assigned_to:      data.assignedTo,
    priority:         data.priority,
    recurrence:       data.recurrence,
    start_date:       data.startDate || new Date().toISOString().split('T')[0],
    due_date:         data.dueDate   || null,
    rotation_members: data.rotationMembers.length ? data.rotationMembers : null,
    week_days:        data.weekDays.length ? data.weekDays : null,
  }).eq('id', data.taskId)

  if (error) {
    console.error('editTask error:', error)
    throw new Error(error.message)
  }

  revalidatePath('/tarefas')
}