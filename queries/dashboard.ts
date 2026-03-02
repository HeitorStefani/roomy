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
    // ── Tarefas: só as atribuídas ao usuário, incluindo categoria e due_date
    supabase.from('tasks')
      .select('id, title, due_date, priority, status, overdue, room')
      .eq('house_id', houseId)
      .eq('assigned_to', user.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true })
      .limit(4),

    supabase.from('stock_items').select('id, name, quantity, min_quantity')
      .eq('house_id', houseId).is('owner_id', null).order('quantity', { ascending: true }).limit(10),

    // ── Contas: inclui due_date para mostrar vencimento
    supabase.from('house_bills')
      .select(`id, title, total, paid_by, due_date, bill_participants(user_id, amount, paid, users(name, avatar_color))`)
      .eq('house_id', houseId)
      .gte('due_date', firstDayThisMonth)
      .lte('due_date', lastDayThisMonth),

    supabase.from('personal_transactions').select('amount, type')
      .eq('user_id', user.id).gte('date', firstDayThisMonth).lte('date', lastDayThisMonth),

    supabase.from('personal_transactions').select('amount, type')
      .eq('user_id', user.id).gte('date', firstDayLastMonth).lte('date', lastDayLastMonth),

    // ── Gráfico: todos os dias do mês, não só pontos fixos
    supabase.from('personal_transactions').select('amount, date')
      .eq('user_id', user.id).eq('type', 'expense')
      .gte('date', firstDayThisMonth).lte('date', lastDayThisMonth)
      .order('date', { ascending: true }),

    supabase.from('personal_transactions').select('amount, date')
      .eq('user_id', user.id).eq('type', 'expense')
      .gte('date', firstDayLastMonth).lte('date', lastDayLastMonth)
      .order('date', { ascending: true }),
  ])

  // ── Gastos ──────────────────────────────────────────────────────────────
  const txThis = txThisRes.data ?? []
  const txLast = txLastRes.data ?? []
  const gastoEsseMes    = txThis.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const gastoMesPassado = txLast.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const trendNum     = gastoMesPassado > 0 ? Math.round(((gastoEsseMes - gastoMesPassado) / gastoMesPassado) * 100) : 0
  const trendGasto   = `${trendNum > 0 ? '+' : ''}${trendNum}%`
  const trendGastoUp = trendNum > 0

  // ── Gráfico: acumulado diário com todos os dias que tiveram gasto ────────
  const buildChartData = (
    txsThis: { amount: number; date: string }[],
    txsLast: { amount: number; date: string }[],
  ) => {
    // Agrupa por dia do mês (ex: "05" → total)
    const groupByDay = (txs: { amount: number; date: string }[]) => {
      const map: Record<string, number> = {}
      for (const tx of txs) {
        const day = tx.date.slice(8, 10) // "2024-01-05" → "05"
        map[day] = (map[day] ?? 0) + tx.amount
      }
      return map
    }

    const thisMap = groupByDay(txsThis)
    const lastMap = groupByDay(txsLast)

    // Gera todos os dias do mês atual que existem em qualquer um dos dois meses
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const today = now.getDate()

    const result = []
    for (let d = 1; d <= daysInMonth; d++) {
      const day = String(d).padStart(2, '0')
      // Não projeta dias futuros do mês atual
      if (d > today) break
      result.push({
        dia:           day,
        gasto:         thisMap[day] ?? 0,
        semanaPassada: lastMap[day] ?? 0,
      })
    }
    return result
  }

  const expenseChartData = buildChartData(
    txChartThisRes.data ?? [],
    txChartLastRes.data ?? [],
  )

  // ── Tarefas ──────────────────────────────────────────────────────────────
  const tasksRaw = tasksRes.data ?? []
  const overdueTasks = tasksRaw.filter(t => t.overdue).length

  const tasks = tasksRaw.map(t => ({
    id:       t.id,
    title:    t.title,
    category: (t.room as string) ?? 'Geral',
    dueDate:  t.due_date ?? null,
    date:     t.due_date
      ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '—',
    priority: t.priority as 'alta' | 'média' | 'baixa',
    overdue:  !!t.overdue,
    done:     t.status === 'done',
  }))

  // ── Estoque ──────────────────────────────────────────────────────────────
  const lowStock = (stockRes.data ?? []).filter(i => i.quantity < i.min_quantity)

  // ── Contas ───────────────────────────────────────────────────────────────
  const bills = billsRes.data ?? []
  const totalCasa = bills.reduce((s, b) => s + b.total, 0)
  const pendingBillsCount = bills.filter(b =>
    (b.bill_participants as any[]).some(p => !p.paid)
  ).length

  // Quanto EU devo a outros (não paguei, e não fui eu quem pagou a conta)
  const iOwe = bills.flatMap(b =>
    (b.bill_participants as any[])
      .filter(p => p.user_id === user.id && !p.paid && b.paid_by !== user.id)
      .map(p => ({
        billTitle: b.title as string,
        dueDate:   b.due_date as string,
        amount:    p.amount as number,
        paidByName: (b.bill_participants as any[]).find((x: any) => x.user_id === b.paid_by)?.users?.name ?? 'Alguém',
        paidByColor: (b.bill_participants as any[]).find((x: any) => x.user_id === b.paid_by)?.users?.avatar_color ?? 'bg-zinc-600',
      }))
  )

  // Quem me deve (eu paguei, outros não pagaram)
  const debtors = bills.flatMap(b =>
    (b.bill_participants as any[])
      .filter(p => !p.paid && p.user_id !== user.id && b.paid_by === user.id)
      .map(p => ({
        name:      p.users.name as string,
        color:     p.users.avatar_color as string,
        amount:    p.amount as number,
        billTitle: b.title as string,
        dueDate:   b.due_date as string,
      }))
  )

  const { count: shoppingCount } = await supabase
    .from('stock_items').select('*', { count: 'exact', head: true })
    .eq('house_id', houseId).eq('in_shopping_list', true)

  return JSON.parse(JSON.stringify({
    profile,
    stats: {
      gastoEsseMes,
      trendGasto,
      trendGastoUp,
      tarefasRestantes: tasks.length,
      overdueTasks,
      shoppingCount: shoppingCount ?? 0,
      totalCasa,
      pendingBillsCount,
      totalIOwe:       iOwe.reduce((s, x) => s + x.amount, 0),
      totalToReceive:  debtors.reduce((s, d) => s + d.amount, 0),
    },
    tasks,
    lowStock,
    debtors,
    iOwe,
    expenseChartData,
  }))
}