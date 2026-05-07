'use server'

import { revalidatePath } from 'next/cache'
import { query, transaction } from '@/lib/db'
import { emitN8nEvent } from '@/lib/n8n'
import { saveUploadedFile } from '@/lib/storage'

export async function markParticipantAsPaid(participantId: string) {
  const { rows } = await query<{ id: string; bill_id: string; user_id: string }>(
    'update bill_participants set paid = true, updated_at = now() where id = $1 returning id, bill_id, user_id',
    [participantId],
  )
  if (rows[0]) await emitN8nEvent('bill.paid', rows[0])
  revalidatePath('/contas')
}

export async function markBillNotified(billId: string) {
  await query('update house_bills set notified = true, updated_at = now() where id = $1', [billId])
  await emitN8nEvent('bill.notified', { billId })
  revalidatePath('/contas')
}

export async function addHouseBill(formData: {
  houseId: string
  userId: string
  title: string
  total: number
  dueDate: string
  involved: { userId: string; amount: number }[]
  items?: {
    descricao: string
    quantidade: number | null
    unidade: string | null
    valor_unit: number | null
    valor_total: number | null
  }[]
}) {
  const billId = await transaction(async client => {
    const bill = await client.query<{ id: string }>(
      `insert into house_bills (house_id, title, total, due_date, paid_by, notified)
       values ($1, $2, $3, $4, $5, false)
       returning id`,
      [formData.houseId, formData.title, formData.total, formData.dueDate, formData.userId],
    )

    const id = bill.rows[0].id
    for (const p of formData.involved) {
      await client.query(
        `insert into bill_participants (bill_id, user_id, amount, paid)
         values ($1, $2, $3, $4)`,
        [id, p.userId, p.amount, p.userId === formData.userId],
      )
    }

    for (const item of formData.items ?? []) {
      await client.query(
        `insert into bill_items (bill_id, descricao, quantidade, unidade, valor_unit, valor_total)
         values ($1, $2, $3, $4, $5, $6)`,
        [id, item.descricao, item.quantidade, item.unidade, item.valor_unit, item.valor_total],
      )
    }

    return id
  })

  await emitN8nEvent('bill.created', { billId, houseId: formData.houseId, paidBy: formData.userId, involved: formData.involved })
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
  const { rows } = await query<{ id: string }>(
    `insert into personal_transactions (user_id, description, category, amount, type, date)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [data.userId, data.description, data.category, data.amount, data.type, data.date],
  )
  await emitN8nEvent('transaction.created', { transactionId: rows[0].id, ...data })
  revalidatePath('/contas')
}

export async function addBudgetCategory(data: {
  userId: string
  name: string
  iconName: string
  color: string
  limitAmount: number
}) {
  await query(
    `insert into budget_categories (user_id, name, icon_name, color, limit_amount)
     values ($1, $2, $3, $4, $5)`,
    [data.userId, data.name, data.iconName, data.color, data.limitAmount],
  )
  revalidatePath('/contas')
}

export async function deleteBudgetCategory(categoryId: string) {
  await query('delete from budget_categories where id = $1', [categoryId])
  revalidatePath('/contas')
}

export async function deleteBill(billId: string) {
  await transaction(async client => {
    await client.query('delete from bill_participants where bill_id = $1', [billId])
    await client.query('delete from bill_items where bill_id = $1', [billId])
    await client.query('delete from house_bills where id = $1', [billId])
  })
  await emitN8nEvent('bill.deleted', { billId })
  revalidatePath('/contas')
}

export async function deleteTransaction(txId: string) {
  await query('delete from personal_transactions where id = $1', [txId])
  await emitN8nEvent('transaction.deleted', { transactionId: txId })
  revalidatePath('/contas')
}

export async function uploadComprovante(formData: FormData) {
  const file = formData.get('file') as File
  const participantId = formData.get('participantId') as string

  if (!file || !participantId) return { error: 'Dados invalidos.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande. Maximo 10MB.' }

  const saved = await saveUploadedFile('comprovantes', file, participantId)

  await query(
    `update bill_participants
     set paid = true, comprovante_url = $1, updated_at = now()
     where id = $2`,
    [saved.publicUrl, participantId],
  )

  await emitN8nEvent('bill.paid', { participantId, comprovanteUrl: saved.publicUrl })
  revalidatePath('/contas')
  return { ok: true }
}
