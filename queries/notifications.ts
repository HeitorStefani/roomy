'use server'

import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'

export type Notification = {
  id: string
  type: 'bill' | 'task' | 'stock'
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  href: string
}

export async function getNotifications(): Promise<Notification[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const profile = await getUserProfile(user.id)
  if (!profile?.house_id) return []

  const houseId = profile.house_id
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const in2Days = new Date(now); in2Days.setDate(in2Days.getDate() + 2)

  const notifications: Notification[] = []

  const { rows: billParts } = await query<{
    bill_id: string; title: string; due_date: string; paid_by: string
    user_id: string; amount: number; paid: boolean
  }>(
    `select hb.id as bill_id, hb.title, hb.due_date, hb.paid_by, bp.user_id, bp.amount, bp.paid
     from house_bills hb
     join bill_participants bp on bp.bill_id = hb.id
     where hb.house_id = $1 and hb.due_date >= $2 and hb.due_date <= $3 and bp.user_id = $4`,
    [houseId, firstDay, lastDay, user.id],
  )

  for (const bill of billParts) {
    if (!bill.paid && bill.paid_by !== user.id) {
      const daysLeft = Math.ceil((new Date(`${bill.due_date}T00:00:00`).getTime() - now.getTime()) / 86400000)
      notifications.push({
        id: `bill-${bill.bill_id}`,
        type: 'bill',
        title: `Conta pendente: ${bill.title}`,
        description: daysLeft < 0 ? `Atrasada ha ${Math.abs(daysLeft)} dia(s)` : daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft} dia(s)`,
        urgency: daysLeft < 0 ? 'high' : daysLeft <= 3 ? 'medium' : 'low',
        href: '/contas',
      })
    }
  }

  const { rows: overdue } = await query<{ id: string; title: string }>(
    `select id, title from tasks
     where house_id = $1 and assigned_to = $2 and overdue = true and status <> 'done'`,
    [houseId, user.id],
  )
  for (const t of overdue) {
    notifications.push({ id: `task-${t.id}`, type: 'task', title: `Tarefa atrasada: ${t.title}`, description: 'Prazo expirado - atribuida a voce', urgency: 'high', href: '/tarefas' })
  }

  const { rows: soonTasks } = await query<{ id: string; title: string; due_date: string }>(
    `select id, title, due_date from tasks
     where house_id = $1 and assigned_to = $2 and overdue = false and status <> 'done' and due_date <= $3`,
    [houseId, user.id, in2Days.toISOString().split('T')[0]],
  )
  for (const t of soonTasks) {
    const daysLeft = Math.ceil((new Date(`${t.due_date}T00:00:00`).getTime() - now.getTime()) / 86400000)
    notifications.push({ id: `task-soon-${t.id}`, type: 'task', title: `Tarefa: ${t.title}`, description: daysLeft === 0 ? 'Vence hoje' : 'Vence amanha', urgency: 'medium', href: '/tarefas' })
  }

  const { rows: stockOut } = await query<{ id: string; name: string }>(
    `select id, name from stock_items
     where house_id = $1 and owner_id is null and quantity = 0
     limit 5`,
    [houseId],
  )
  if (stockOut.length > 0) {
    notifications.push({ id: 'stock-out', type: 'stock', title: `${stockOut.length} item(s) esgotado(s)`, description: stockOut.map(i => i.name).join(', ').slice(0, 50), urgency: 'medium', href: '/estoque' })
  }

  const { rows: personalOut } = await query<{ id: string; name: string }>(
    `select id, name from stock_items
     where house_id = $1 and owner_id = $2 and quantity = 0
     limit 5`,
    [houseId, user.id],
  )
  if (personalOut.length > 0) {
    notifications.push({ id: 'stock-personal', type: 'stock', title: `Estoque pessoal: ${personalOut.length} esgotado(s)`, description: personalOut.map(i => i.name).join(', ').slice(0, 50), urgency: 'low', href: '/estoque' })
  }

  return notifications.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.urgency] - { high: 0, medium: 1, low: 2 }[b.urgency]))
}

export async function getNotificationCount(): Promise<number> {
  return (await getNotifications()).length
}
