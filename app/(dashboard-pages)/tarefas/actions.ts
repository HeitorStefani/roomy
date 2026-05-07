'use server'

import { revalidatePath } from 'next/cache'
import { query, transaction } from '@/lib/db'
import { emitN8nEvent } from '@/lib/n8n'

type Recurrence = 'unica' | 'diaria' | '2x-semana' | 'semanal' | 'quinzenal' | 'mensal' | 'única' | 'diária'

function getNextDueDate(current: string, recurrence: Recurrence, weekDays?: number[]): string {
  const d = new Date(current)

  if ((recurrence === '2x-semana' || recurrence === 'semanal') && weekDays?.length) {
    const sorted = [...weekDays].sort((a, b) => a - b)
    const currentDay = d.getDay()
    const nextDay = sorted.find(day => day > currentDay) ?? sorted[0]
    const diff = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  switch (recurrence) {
    case 'diaria':
    case 'diária':
      d.setDate(d.getDate() + 1); break
    case '2x-semana':
      d.setDate(d.getDate() + 3); break
    case 'semanal':
      d.setDate(d.getDate() + 7); break
    case 'quinzenal':
      d.setDate(d.getDate() + 14); break
    case 'mensal':
      d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString().split('T')[0]
}

function getNextStartDate(current: string): string {
  const d = new Date(current)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export async function moveTask(taskId: string, newStatus: 'todo' | 'doing' | 'done', userId: string) {
  const { rows } = await query<{
    id: string; title: string; room: string; assigned_to: string; priority: string
    recurrence: Recurrence; start_date: string | null; due_date: string | null
    house_id: string; rotation_members: string[] | null; week_days: number[] | null
  }>(
    `select id, title, room, assigned_to, priority, recurrence, start_date, due_date,
            house_id, rotation_members, week_days
     from tasks
     where id = $1
     limit 1`,
    [taskId],
  )

  const task = rows[0]
  if (!task) return

  await transaction(async client => {
    await client.query('update tasks set status = $1, updated_at = now() where id = $2', [newStatus, taskId])

    if (newStatus === 'done') {
      if (task.recurrence !== 'unica' && task.recurrence !== 'única') {
        let memberIds = task.rotation_members ?? []
        if (!memberIds.length) {
          const moradores = await client.query<{ id: string }>(
            'select id from users where house_id = $1 order by name asc',
            [task.house_id],
          )
          memberIds = moradores.rows.map(m => m.id)
        }

        const currIdx = memberIds.indexOf(task.assigned_to)
        const nextId = memberIds[(currIdx + 1) % memberIds.length]
        const nextDue = task.due_date ? getNextDueDate(task.due_date, task.recurrence, task.week_days ?? undefined) : null
        const nextStart = task.due_date ? getNextStartDate(task.due_date) : null

        await client.query(
          `insert into tasks
           (house_id, title, room, assigned_to, status, priority, recurrence, start_date, due_date, overdue, rotation_members, week_days)
           values ($1, $2, $3, $4, 'todo', $5, $6, $7, $8, false, $9, $10)`,
          [task.house_id, task.title, task.room, nextId, task.priority, task.recurrence, nextStart, nextDue, task.rotation_members, task.week_days],
        )
      }
    }
  })

  await emitN8nEvent(newStatus === 'done' ? 'task.completed' : 'task.updated', { taskId, status: newStatus, userId, houseId: task.house_id })
  revalidatePath('/tarefas')
}

export async function addTask(data: {
  houseId: string; title: string; room: string; assignedTo: string
  priority: 'alta' | 'média' | 'media' | 'baixa'; recurrence: Recurrence
  startDate: string; dueDate: string; rotationMembers: string[]
  weekDays: number[]
}) {
  const { rows } = await query<{ id: string }>(
    `insert into tasks
     (house_id, title, room, assigned_to, status, priority, recurrence, start_date, due_date, overdue, rotation_members, week_days)
     values ($1, $2, $3, $4, 'todo', $5, $6, $7, $8, false, $9, $10)
     returning id`,
    [
      data.houseId,
      data.title,
      data.room,
      data.assignedTo,
      data.priority,
      data.recurrence,
      data.startDate || new Date().toISOString().split('T')[0],
      data.dueDate || null,
      data.rotationMembers.length ? data.rotationMembers : null,
      data.weekDays.length ? data.weekDays : null,
    ],
  )

  await emitN8nEvent('task.created', { taskId: rows[0].id, houseId: data.houseId, assignedTo: data.assignedTo })
  revalidatePath('/tarefas')
}

export async function editTask(data: {
  taskId: string; title: string; room: string; assignedTo: string
  priority: 'alta' | 'média' | 'media' | 'baixa'; recurrence: Recurrence
  startDate: string; dueDate: string; rotationMembers: string[]
  weekDays: number[]
}) {
  await query(
    `update tasks
     set title = $1, room = $2, assigned_to = $3, priority = $4, recurrence = $5,
         start_date = $6, due_date = $7, rotation_members = $8, week_days = $9, updated_at = now()
     where id = $10`,
    [
      data.title,
      data.room,
      data.assignedTo,
      data.priority,
      data.recurrence,
      data.startDate || new Date().toISOString().split('T')[0],
      data.dueDate || null,
      data.rotationMembers.length ? data.rotationMembers : null,
      data.weekDays.length ? data.weekDays : null,
      data.taskId,
    ],
  )

  await emitN8nEvent('task.updated', { taskId: data.taskId, assignedTo: data.assignedTo })
  revalidatePath('/tarefas')
}
