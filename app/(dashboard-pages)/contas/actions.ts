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
  houseId:  string
  userId:   string
  title:    string
  total:    number
  dueDate:  string
  involved: { userId: string; amount: number }[]
  items?:   {
    descricao:   string
    quantidade:  number | null
    unidade:     string | null
    valor_unit:  number | null
    valor_total: number | null
  }[]
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

  // Salva itens da NFC-e se existirem
  if (formData.items && formData.items.length > 0) {
    await supabase.from('bill_items').insert(
      formData.items.map(item => ({
        bill_id:     bill.id,
        descricao:   item.descricao,
        quantidade:  item.quantidade,
        unidade:     item.unidade,
        valor_unit:  item.valor_unit,
        valor_total: item.valor_total,
      }))
    )
  }

  revalidatePath('/contas')
}

export async function addPersonalTransaction(data: {
  userId:      string
  description: string
  category:    string
  amount:      number
  type:        'expense' | 'income'
  date:        string
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
  userId:      string
  name:        string
  iconName:    string
  color:       string
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

export async function deleteBill(billId: string) {
  const supabase = await createClient()
  await supabase.from('bill_participants').delete().eq('bill_id', billId)
  await supabase.from('bill_items').delete().eq('bill_id', billId)
  await supabase.from('house_bills').delete().eq('id', billId)
  revalidatePath('/contas')
}

export async function deleteTransaction(txId: string) {
  const supabase = await createClient()
  await supabase.from('personal_transactions').delete().eq('id', txId)
  revalidatePath('/contas')
}

// Upload de comprovante PIX — marca como pago automaticamente
export async function uploadComprovante(formData: FormData) {
  const supabase      = await createClient()
  const file          = formData.get('file') as File
  const participantId = formData.get('participantId') as string

  if (!file || !participantId) return { error: 'Dados inválidos.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. Máximo 10MB.' }

  const ext      = file.name.split('.').pop() ?? 'jpg'
  const filePath = `comprovantes/${participantId}-${Date.now()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { error: 'Erro no upload: ' + uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(filePath)

  await supabase
    .from('bill_participants')
    .update({ paid: true, comprovante_url: publicUrl })
    .eq('id', participantId)

  revalidatePath('/contas')
  return { ok: true }
}