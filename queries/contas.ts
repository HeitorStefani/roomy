'use server'

import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'

type BillRow = {
  id: string
  title: string
  total: number
  due_date: string
  paid_by: string
  notified: boolean
}

export async function getContasData(month: number, year: number) {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (!profile?.house_id) return null

  const houseId = profile.house_id
  const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const [
    { rows: moradores },
    { rows: billsRaw },
    { rows: participants },
    { rows: items },
    { rows: transactions },
    { rows: budgetsRaw },
  ] = await Promise.all([
    query<{ id: string; name: string; avatar_color: string | null; pix_key: string | null }>(
      'select id, name, avatar_color, pix_key from users where house_id = $1 order by name asc',
      [houseId],
    ),
    query<BillRow>(
      `select id, title, total, due_date, paid_by, notified
       from house_bills
       where house_id = $1 and due_date >= $2 and due_date <= $3
       order by due_date asc`,
      [houseId, firstDay, lastDay],
    ),
    query<{
      id: string; bill_id: string; user_id: string; amount: number; paid: boolean
      comprovante_url: string | null; user_name: string; avatar_color: string | null
    }>(
      `select bp.id, bp.bill_id, bp.user_id, bp.amount, bp.paid, bp.comprovante_url,
              u.name as user_name, u.avatar_color
       from bill_participants bp
       join users u on u.id = bp.user_id
       join house_bills hb on hb.id = bp.bill_id
       where hb.house_id = $1 and hb.due_date >= $2 and hb.due_date <= $3`,
      [houseId, firstDay, lastDay],
    ),
    query<{
      id: string; bill_id: string; descricao: string; quantidade: number | null
      unidade: string | null; valor_unit: number | null; valor_total: number | null
    }>(
      `select bi.id, bi.bill_id, bi.descricao, bi.quantidade, bi.unidade, bi.valor_unit, bi.valor_total
       from bill_items bi
       join house_bills hb on hb.id = bi.bill_id
       where hb.house_id = $1 and hb.due_date >= $2 and hb.due_date <= $3`,
      [houseId, firstDay, lastDay],
    ),
    query<{ id: string; description: string; category: string; amount: number; type: 'expense' | 'income'; date: string }>(
      `select id, description, category, amount, type, date
       from personal_transactions
       where user_id = $1 and date >= $2 and date <= $3
       order by date desc`,
      [user.id, firstDay, lastDay],
    ),
    query<{ id: string; name: string; icon_name: string; color: string; limit_amount: number }>(
      'select id, name, icon_name, color, limit_amount from budget_categories where user_id = $1',
      [user.id],
    ),
  ])

  const totalCasa = billsRaw.reduce((s, b) => s + Number(b.total), 0)
  const participantMap = new Map<string, typeof participants>()
  const itemMap = new Map<string, typeof items>()

  for (const p of participants) participantMap.set(p.bill_id, [...(participantMap.get(p.bill_id) ?? []), p])
  for (const item of items) itemMap.set(item.bill_id, [...(itemMap.get(item.bill_id) ?? []), item])

  const totalDebt = billsRaw.reduce((s, b) => {
    const my = (participantMap.get(b.id) ?? []).find(p => p.user_id === user.id)
    return s + (my && !my.paid && b.paid_by !== user.id ? Number(my.amount) : 0)
  }, 0)

  const totalReceivable = billsRaw.reduce((s, b) => {
    if (b.paid_by !== user.id) return s
    return s + (participantMap.get(b.id) ?? [])
      .filter(p => !p.paid && p.user_id !== user.id)
      .reduce((a, p) => a + Number(p.amount), 0)
  }, 0)

  const pendingNotifs = billsRaw.filter(b =>
    (participantMap.get(b.id) ?? []).some(p => !p.paid && p.user_id !== b.paid_by) && !b.notified
  ).length

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const budgets = budgetsRaw.map(b => ({
    ...b,
    spent: transactions
      .filter(t => t.type === 'expense' && t.category === b.icon_name)
      .reduce((s, t) => s + Number(t.amount), 0),
  }))

  return JSON.parse(JSON.stringify({
    userId: user.id,
    profile,
    moradores,
    bills: billsRaw.map(b => ({
      id:       b.id,
      title:    b.title,
      total:    Number(b.total),
      dueDate:  b.due_date,
      paidBy:   b.paid_by,
      notified: b.notified,
      items: (itemMap.get(b.id) ?? []).map(item => ({
        id:         item.id,
        descricao:  item.descricao,
        quantidade: item.quantidade,
        unidade:    item.unidade,
        valorUnit:  item.valor_unit,
        valorTotal: item.valor_total,
      })),
      participants: (participantMap.get(b.id) ?? []).map(p => ({
        id:             p.id,
        userId:         p.user_id,
        name:           p.user_name,
        color:          p.avatar_color,
        amount:         Number(p.amount),
        paid:           p.paid,
        comprovanteUrl: p.comprovante_url ?? null,
      })),
    })),
    houseSummary: { totalCasa, totalDebt, totalReceivable, pendingNotifs },
    transactions,
    personalSummary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
    budgets,
  }))
}
