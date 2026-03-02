'use server'

import { createClient } from '@/lib/supabase/server'

export type Notification = {
  id: string
  type: 'bill' | 'task' | 'stock'
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  href: string
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users').select('id, house_id').eq('id', user.id).single()
  if (!profile?.house_id) return []

  const houseId  = profile.house_id
  const now      = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const in2Days  = new Date(now); in2Days.setDate(in2Days.getDate() + 2)

  const notifications: Notification[] = []

  // Contas pendentes
  const { data: bills } = await supabase
    .from('house_bills')
    .select('id, title, due_date, paid_by, bill_participants(user_id, amount, paid)')
    .eq('house_id', houseId).gte('due_date', firstDay).lte('due_date', lastDay)

  for (const bill of bills ?? []) {
    const myPart = (bill.bill_participants as any[]).find(p => p.user_id === user.id)
    if (myPart && !myPart.paid && bill.paid_by !== user.id) {
      const daysLeft = Math.ceil((new Date(bill.due_date + 'T00:00:00').getTime() - now.getTime()) / 86400000)
      notifications.push({
        id: `bill-${bill.id}`, type: 'bill',
        title: `Conta pendente: ${bill.title}`,
        description: daysLeft < 0 ? `Atrasada há ${Math.abs(daysLeft)} dia(s)` : daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft} dia(s)`,
        urgency: daysLeft < 0 ? 'high' : daysLeft <= 3 ? 'medium' : 'low',
        href: '/contas',
      })
    }
  }

  // Tarefas atrasadas
  const { data: overdue } = await supabase
    .from('tasks').select('id, title')
    .eq('house_id', houseId).eq('assigned_to', user.id).eq('overdue', true).neq('status', 'done')
  for (const t of overdue ?? []) {
    notifications.push({ id: `task-${t.id}`, type: 'task', title: `Tarefa atrasada: ${t.title}`, description: 'Prazo expirado · Atribuída a você', urgency: 'high', href: '/tarefas' })
  }

  // Tarefas vencendo em breve
  const { data: soonTasks } = await supabase
    .from('tasks').select('id, title, due_date')
    .eq('house_id', houseId).eq('assigned_to', user.id).eq('overdue', false).neq('status', 'done')
    .lte('due_date', in2Days.toISOString().split('T')[0])
  for (const t of soonTasks ?? []) {
    const daysLeft = Math.ceil((new Date(t.due_date + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    notifications.push({ id: `task-soon-${t.id}`, type: 'task', title: `Tarefa: ${t.title}`, description: daysLeft === 0 ? 'Vence hoje' : 'Vence amanhã', urgency: 'medium', href: '/tarefas' })
  }

  // Estoque casa esgotado
  const { data: stockOut } = await supabase
    .from('stock_items').select('id, name').eq('house_id', houseId).is('owner_id', null).eq('quantity', 0).limit(5)
  if ((stockOut ?? []).length > 0) {
    notifications.push({ id: 'stock-out', type: 'stock', title: `${stockOut!.length} item(s) esgotado(s)`, description: stockOut!.map(i => i.name).join(', ').slice(0, 50), urgency: 'medium', href: '/estoque' })
  }

  // Estoque pessoal esgotado
  const { data: personalOut } = await supabase
    .from('stock_items').select('id, name').eq('house_id', houseId).eq('owner_id', user.id).eq('quantity', 0).limit(5)
  if ((personalOut ?? []).length > 0) {
    notifications.push({ id: 'stock-personal', type: 'stock', title: `Estoque pessoal: ${personalOut!.length} esgotado(s)`, description: personalOut!.map(i => i.name).join(', ').slice(0, 50), urgency: 'low', href: '/estoque' })
  }

  return notifications.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.urgency] - { high: 0, medium: 1, low: 2 }[b.urgency]))
}

export async function getNotificationCount(): Promise<number> {
  const notifs = await getNotifications()
  return notifs.length
}