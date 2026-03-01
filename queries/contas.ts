'use server'

import { createClient } from '@/lib/supabase/server'

export async function getContasData(month: number, year: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, avatar_color, house_id')
    .eq('id', user.id)
    .single()

  if (!profile?.house_id) return null

  const houseId  = profile.house_id
  const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
  const lastDay  = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: moradores } = await supabase
    .from('users')
    .select('id, name, avatar_color')
    .eq('house_id', houseId)

  const { data: billsRaw } = await supabase
    .from('house_bills')
    .select(`
      id, title, total, due_date, paid_by, notified,
      bill_participants (
        id, user_id, amount, paid,
        users ( id, name, avatar_color )
      )
    `)
    .eq('house_id', houseId)
    .gte('due_date', firstDay)
    .lte('due_date', lastDay)
    .order('due_date', { ascending: true })

  const bills = billsRaw ?? []

  const totalCasa = bills.reduce((s, b) => s + b.total, 0)

  const totalDebt = bills.reduce((s, b) => {
    const my = (b.bill_participants as any[]).find(p => p.user_id === user.id)
    return s + (my && !my.paid && b.paid_by !== user.id ? my.amount : 0)
  }, 0)

  const totalReceivable = bills.reduce((s, b) => {
    if (b.paid_by !== user.id) return s
    return s + (b.bill_participants as any[])
      .filter(p => !p.paid && p.user_id !== user.id)
      .reduce((a: number, p: any) => a + p.amount, 0)
  }, 0)

  const pendingNotifs = bills.filter(b =>
    (b.bill_participants as any[]).some(p => !p.paid && p.user_id !== b.paid_by) && !b.notified
  ).length

  const { data: txRaw } = await supabase
    .from('personal_transactions')
    .select('id, description, category, amount, type, date')
    .eq('user_id', user.id)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date', { ascending: false })

  const transactions = txRaw ?? []
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const { data: budgetsRaw } = await supabase
    .from('budget_categories')
    .select('id, name, icon_name, color, limit_amount')
    .eq('user_id', user.id)

  const budgets = (budgetsRaw ?? []).map(b => ({
    ...b,
    // icon_name armazena o valor da categoria (ex: 'food'), que é o que
    // personal_transactions.category também usa — não usar b.name (label em pt-BR)
    spent: transactions
      .filter(t => t.type === 'expense' && t.category === b.icon_name)
      .reduce((s, t) => s + t.amount, 0),
  }))

  return JSON.parse(JSON.stringify({
    userId:  user.id,
    profile,
    moradores: moradores ?? [],
    bills: bills.map(b => ({
      id:       b.id,
      title:    b.title,
      total:    b.total,
      dueDate:  b.due_date,
      paidBy:   b.paid_by,
      notified: b.notified,
      participants: (b.bill_participants as any[]).map(p => ({
        id:     p.id,
        userId: p.user_id,
        name:   p.users.name,
        color:  p.users.avatar_color,
        amount: p.amount,
        paid:   p.paid,
      })),
    })),
    houseSummary:    { totalCasa, totalDebt, totalReceivable, pendingNotifs },
    transactions,
    personalSummary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
    budgets,
  }))
}