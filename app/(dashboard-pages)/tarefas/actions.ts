'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function moveTask(taskId: string, newStatus: 'todo' | 'doing' | 'done', userId: string) {
  const supabase = await createClient()

  // Busca a tarefa para ver se é recorrente
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, room, assigned_to, priority, recurrence, due_date, house_id')
    .eq('id', taskId)
    .single()

  if (!task) return

  // Atualiza o status
  await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId)

  // Se concluiu, registra no histórico
  if (newStatus === 'done') {
    await supabase.from('task_history').insert({
      task_id: taskId,
      done_by: userId,
      done_at: new Date().toISOString(),
    })

    // Se for recorrente, recria com o próximo morador
    if (task.recurrence !== 'única') {
      // Busca todos os moradores da casa em ordem
      const { data: moradores } = await supabase
        .from('users')
        .select('id')
        .eq('house_id', task.house_id)
        .order('name', { ascending: true })

      const ids      = (moradores ?? []).map(m => m.id)
      const currIdx  = ids.indexOf(task.assigned_to)
      const nextId   = ids[(currIdx + 1) % ids.length]

      // Calcula próximo prazo
      const currentDue = new Date(task.due_date)
      const nextDue    = new Date(currentDue)
      if (task.recurrence === 'semanal') nextDue.setDate(nextDue.getDate() + 7)
      if (task.recurrence === 'mensal')  nextDue.setMonth(nextDue.getMonth() + 1)

      await supabase.from('tasks').insert({
        house_id:    task.house_id,
        title:       task.title,
        room:        task.room,
        assigned_to: nextId,
        status:      'todo',
        priority:    task.priority,
        recurrence:  task.recurrence,
        due_date:    nextDue.toISOString().split('T')[0],
        overdue:     false,
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
  recurrence: 'única' | 'semanal' | 'mensal'
  dueDate: string
}) {
  const supabase = await createClient()

  console.log('=== ADD TASK ===')
  console.log('Data recebida:', data)

  const { data: result, error } = await supabase.from('tasks').insert({
    house_id:    data.houseId,
    title:       data.title,
    room:        data.room,
    assigned_to: data.assignedTo,
    status:      'todo',
    priority:    data.priority,
    recurrence:  data.recurrence,
    due_date:    data.dueDate || new Date().toISOString().split('T')[0],
    overdue:     false,
  }).select()

  console.log('Resultado:', result)
  console.log('Erro:', error)
  console.log('===============')

  revalidatePath('/tarefas')
}