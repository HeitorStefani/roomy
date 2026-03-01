'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markParticipantAsPaid(participantId: string) {
  const supabase = await createClient()
  await supabase.from('bill_participants').update({ paid: true }).eq('id', participantId)
  revalidatePath('/contas')
}

export async function markBillNotified(billId: string) {
  const supabase = await createClient()
  await supabase.from('house_bills').update({ notified: true }).eq('id', billId)
  revalidatePath('/contas')
}

export async function addHouseBill(formData: {
  houseId: string
  userId: string
  title: string
  total: number
  dueDate: string
  involved: { userId: string; amount: number }[]
}) {
  const supabase = await createClient()
  const { data: bill, error } = await supabase
    .from('house_bills')
    .insert({
      house_id: formData.houseId,
      title:    formData.title,
      total:    formData.total,
      due_date: formData.dueDate,
      paid_by:  formData.userId,
      notified: false,
    })
    .select('id')
    .single()
  if (error || !bill) return
  await supabase.from('bill_participants').insert(
    formData.involved.map(p => ({
      bill_id: bill.id,
      user_id: p.userId,
      amount:  p.amount,
      paid:    p.userId === formData.userId,
    }))
  )
  revalidatePath('/contas')
}

export async function addPersonalTransaction(data: {
  userId: string
  description: string
  category: string
  amount: number
  type: 'expense' | 'income'
  date: string
}) {
  const supabase = await createClient()
  await supabase.from('personal_transactions').insert({
    user_id:     data.userId,
    description: data.description,
    category:    data.category,
    amount:      data.amount,
    type:        data.type,
    date:        data.date,
  })
  revalidatePath('/contas')
}

export async function addBudgetCategory(data: {
  userId: string
  name: string
  iconName: string
  color: string
  limitAmount: number
}) {
  const supabase = await createClient()
  await supabase.from('budget_categories').insert({
    user_id:      data.userId,
    name:         data.name,
    icon_name:    data.iconName,
    color:        data.color,
    limit_amount: data.limitAmount,
  })
  revalidatePath('/contas')
}

export async function deleteBudgetCategory(categoryId: string) {
  const supabase = await createClient()
  await supabase.from('budget_categories').delete().eq('id', categoryId)
  revalidatePath('/contas')
}