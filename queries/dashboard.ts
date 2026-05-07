'use server'

import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'

export async function getDashboardData() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (!profile?.house_id) return null

  const houseId = profile.house_id
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [
    { rows: tasksRaw },
    { rows: stockRaw },
    { rows: billsRaw },
    { rows: txThis },
    { rows: txLast },
    { rows: txChartThis },
    { rows: txChartLast },
    { rows: shoppingRows },
  ] = await Promise.all([
    query<{ id: string; title: string; due_date: string | null; priority: string; status: string; overdue: boolean; room: string | null }>(
      `select id, title, due_date, priority, status, overdue, room
       from tasks
       where house_id = $1 and assigned_to = $2 and status <> 'done'
       order by due_date asc nulls last
       limit 4`,
      [houseId, user.id],
    ),
    query<{ id: string; name: string; quantity: number; min_quantity: number }>(
      `select id, name, quantity, min_quantity
       from stock_items
       where house_id = $1 and owner_id is null
       order by quantity asc
       limit 10`,
      [houseId],
    ),
    query<{
      id: string; title: string; total: number; paid_by: string; due_date: string
      user_id: string; amount: number; paid: boolean; user_name: string; avatar_color: string | null
    }>(
      `select hb.id, hb.title, hb.total, hb.paid_by, hb.due_date,
              bp.user_id, bp.amount, bp.paid, u.name as user_name, u.avatar_color
       from house_bills hb
       left join bill_participants bp on bp.bill_id = hb.id
       left join users u on u.id = bp.user_id
       where hb.house_id = $1 and hb.due_date >= $2 and hb.due_date <= $3`,
      [houseId, firstDayThisMonth, lastDayThisMonth],
    ),
    query<{ amount: number; type: 'expense' | 'income' }>(
      'select amount, type from personal_transactions where user_id = $1 and date >= $2 and date <= $3',
      [user.id, firstDayThisMonth, lastDayThisMonth],
    ),
    query<{ amount: number; type: 'expense' | 'income' }>(
      'select amount, type from personal_transactions where user_id = $1 and date >= $2 and date <= $3',
      [user.id, firstDayLastMonth, lastDayLastMonth],
    ),
    query<{ amount: number; date: string }>(
      `select amount, date from personal_transactions
       where user_id = $1 and type = 'expense' and date >= $2 and date <= $3
       order by date asc`,
      [user.id, firstDayThisMonth, lastDayThisMonth],
    ),
    query<{ amount: number; date: string }>(
      `select amount, date from personal_transactions
       where user_id = $1 and type = 'expense' and date >= $2 and date <= $3
       order by date asc`,
      [user.id, firstDayLastMonth, lastDayLastMonth],
    ),
    query<{ count: string }>(
      'select count(*) from stock_items where house_id = $1 and in_shopping_list = true',
      [houseId],
    ),
  ])

  const gastoEsseMes = txThis.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const gastoMesPassado = txLast.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const trendNum = gastoMesPassado > 0 ? Math.round(((gastoEsseMes - gastoMesPassado) / gastoMesPassado) * 100) : 0

  const groupByDay = (txs: { amount: number; date: string }[]) => {
    const map: Record<string, number> = {}
    for (const tx of txs) {
      const day = String(tx.date).slice(8, 10)
      map[day] = (map[day] ?? 0) + Number(tx.amount)
    }
    return map
  }
  const thisMap = groupByDay(txChartThis)
  const lastMap = groupByDay(txChartLast)
  const expenseChartData = []
  for (let d = 1; d <= now.getDate(); d++) {
    const day = String(d).padStart(2, '0')
    expenseChartData.push({ dia: day, gasto: thisMap[day] ?? 0, semanaPassada: lastMap[day] ?? 0 })
  }

  const tasks = tasksRaw.map(t => ({
    id:       t.id,
    title:    t.title,
    category: t.room ?? 'Geral',
    dueDate:  t.due_date,
    date:     t.due_date ? new Date(`${t.due_date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-',
    priority: t.priority,
    overdue:  !!t.overdue,
    done:     t.status === 'done',
  }))

  const billMap = new Map<string, typeof billsRaw>()
  for (const row of billsRaw) billMap.set(row.id, [...(billMap.get(row.id) ?? []), row])
  const billGroups = Array.from(billMap.values())
  const totalCasa = billGroups.reduce((s, rows) => s + Number(rows[0].total), 0)
  const pendingBillsCount = billGroups.filter(rows => rows.some(p => !p.paid)).length
  const iOwe = billGroups.flatMap(rows => rows
    .filter(p => p.user_id === user.id && !p.paid && p.paid_by !== user.id)
    .map(p => ({
      billTitle: p.title,
      dueDate: p.due_date,
      amount: Number(p.amount),
      paidByName: rows.find(x => x.user_id === p.paid_by)?.user_name ?? 'Alguem',
      paidByColor: rows.find(x => x.user_id === p.paid_by)?.avatar_color ?? 'bg-zinc-600',
    })))
  const debtors = billGroups.flatMap(rows => rows
    .filter(p => !p.paid && p.user_id !== user.id && p.paid_by === user.id)
    .map(p => ({
      name: p.user_name,
      color: p.avatar_color ?? 'bg-zinc-600',
      amount: Number(p.amount),
      billTitle: p.title,
      dueDate: p.due_date,
    })))

  return JSON.parse(JSON.stringify({
    profile,
    stats: {
      gastoEsseMes,
      trendGasto: `${trendNum > 0 ? '+' : ''}${trendNum}%`,
      trendGastoUp: trendNum > 0,
      tarefasRestantes: tasks.length,
      overdueTasks: tasksRaw.filter(t => t.overdue).length,
      shoppingCount: Number(shoppingRows[0]?.count ?? 0),
      totalCasa,
      pendingBillsCount,
      totalIOwe: iOwe.reduce((s, x) => s + x.amount, 0),
      totalToReceive: debtors.reduce((s, d) => s + d.amount, 0),
    },
    tasks,
    lowStock: stockRaw.filter(i => Number(i.quantity) < Number(i.min_quantity)),
    debtors,
    iOwe,
    expenseChartData,
  }))
}
