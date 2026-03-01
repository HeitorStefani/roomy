'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData() {
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
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDayThisMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastDayLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [
    tasksRes, stockRes, billsRes,
    txThisRes, txLastRes, txChartThisRes, txChartLastRes,
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, due_date, priority, status, overdue')
      .eq('house_id', houseId).neq('status', 'done').order('due_date', { ascending: true }).limit(4),
    supabase.from('stock_items').select('id, name, quantity, min_quantity')
      .eq('house_id', houseId).is('owner_id', null).order('quantity', { ascending: true }).limit(10),
    supabase.from('house_bills').select(`id, title, total, paid_by, bill_participants(user_id, amount, paid, users(name, avatar_color))`)
      .eq('house_id', houseId).gte('due_date', firstDayThisMonth).lte('due_date', lastDayThisMonth),
    supabase.from('personal_transactions').select('amount, type')
      .eq('user_id', user.id).gte('date', firstDayThisMonth).lte('date', lastDayThisMonth),
    supabase.from('personal_transactions').select('amount, type')
      .eq('user_id', user.id).gte('date', firstDayLastMonth).lte('date', lastDayLastMonth),
    supabase.from('personal_transactions').select('amount, date')
      .eq('user_id', user.id).eq('type', 'expense').gte('date', firstDayThisMonth).lte('date', lastDayThisMonth).order('date', { ascending: true }),
    supabase.from('personal_transactions').select('amount, date')
      .eq('user_id', user.id).eq('type', 'expense').gte('date', firstDayLastMonth).lte('date', lastDayLastMonth).order('date', { ascending: true }),
  ])

  const txThis = txThisRes.data ?? []
  const txLast = txLastRes.data ?? []
  const gastoEsseMes    = txThis.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const gastoMesPassado = txLast.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const trendNum     = gastoMesPassado > 0 ? Math.round(((gastoEsseMes - gastoMesPassado) / gastoMesPassado) * 100) : 0
  const trendGasto   = `${trendNum > 0 ? '+' : ''}${trendNum}%`
  const trendGastoUp = trendNum > 0

  const tasks        = tasksRes.data ?? []
  const overdueTasks = tasks.filter(t => t.overdue).length
  const lowStock     = (stockRes.data ?? []).filter(i => i.quantity < i.min_quantity)
  const bills        = billsRes.data ?? []
  const totalCasa    = bills.reduce((s, b) => s + b.total, 0)
  const pendingBillsCount = bills.filter(b => (b.bill_participants as any[]).some(p => !p.paid)).length

  const debtors = bills.flatMap(b =>
    (b.bill_participants as any[])
      .filter(p => !p.paid && p.user_id !== user.id && b.paid_by === user.id)
      .map(p => ({ name: p.users.name as string, color: p.users.avatar_color as string, amount: p.amount as number }))
  )

  const groupByDay = (txs: { amount: number; date: string }[]) => {
    const map: Record<string, number> = {}
    for (const tx of txs) { const day = tx.date.split('-')[2]; map[day] = (map[day] ?? 0) + tx.amount }
    return map
  }
  const thisMap = groupByDay(txChartThisRes.data ?? [])
  const lastMap = groupByDay(txChartLastRes.data ?? [])
  const expenseChartData = ['01','05','10','15','20','25','30'].map(dia => ({
    dia, gasto: thisMap[dia] ?? 0, semanaPassada: lastMap[dia] ?? 0,
  }))

  const { count: shoppingCount } = await supabase
    .from('stock_items').select('*', { count: 'exact', head: true })
    .eq('house_id', houseId).eq('in_shopping_list', true)

  return JSON.parse(JSON.stringify({
    profile,
    stats: { gastoEsseMes, trendGasto, trendGastoUp, tarefasRestantes: tasks.length, overdueTasks, shoppingCount: shoppingCount ?? 0, totalCasa, pendingBillsCount },
    tasks: tasks.map(t => ({
      id: t.id, title: t.title,
      date: t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—',
      priority: t.priority as 'alta' | 'média' | 'baixa',
      done: t.status === 'done',
    })),
    lowStock, debtors, expenseChartData,
  }))
}