'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { emitN8nEvent } from '@/lib/n8n'

export async function addStockItem(data: {
  houseId: string
  userId: string
  name: string
  category: string
  quantity: number
  minQuantity: number
  unit: string
  owner: 'casa' | 'pessoal'
}) {
  const { rows } = await query<{ id: string }>(
    `insert into stock_items
     (house_id, owner_id, name, category, quantity, min_quantity, unit, in_shopping_list)
     values ($1, $2, $3, $4, $5, $6, $7, false)
     returning id`,
    [data.houseId, data.owner === 'pessoal' ? data.userId : null, data.name, data.category, data.quantity, data.minQuantity, data.unit],
  )
  await emitN8nEvent('stock.created', { stockItemId: rows[0].id, houseId: data.houseId, owner: data.owner })
  revalidatePath('/estoque')
}

export async function updateQuantity(itemId: string, delta: number) {
  const { rows } = await query<{ id: string; house_id: string; quantity: number }>(
    `update stock_items
     set quantity = greatest(0, quantity + $1), updated_at = now()
     where id = $2
     returning id, house_id, quantity`,
    [delta, itemId],
  )
  if (rows[0]) await emitN8nEvent('stock.updated', rows[0])
  revalidatePath('/estoque')
}

export async function toggleShoppingList(itemId: string, current: boolean) {
  const { rows } = await query<{ id: string; house_id: string; in_shopping_list: boolean }>(
    `update stock_items
     set in_shopping_list = $1, updated_at = now()
     where id = $2
     returning id, house_id, in_shopping_list`,
    [!current, itemId],
  )
  if (rows[0]) await emitN8nEvent('stock.updated', rows[0])
  revalidatePath('/estoque')
}

export async function deleteStockItem(itemId: string) {
  const { rows } = await query<{ id: string; house_id: string }>(
    'delete from stock_items where id = $1 returning id, house_id',
    [itemId],
  )
  if (rows[0]) await emitN8nEvent('stock.deleted', rows[0])
  revalidatePath('/estoque')
}

export async function markAsBought(itemIds: string[]) {
  for (const id of itemIds) {
    await query(
      `update stock_items
       set quantity = min_quantity, in_shopping_list = false, updated_at = now()
       where id = $1`,
      [id],
    )
  }
  await emitN8nEvent('stock.updated', { itemIds, action: 'markAsBought' })
  revalidatePath('/estoque')
}

export async function addEsgotadosToList(houseId: string, userId: string) {
  await query(
    `update stock_items
     set in_shopping_list = true, updated_at = now()
     where house_id = $1 and quantity = 0 and (owner_id is null or owner_id = $2)`,
    [houseId, userId],
  )
  await emitN8nEvent('stock.updated', { houseId, userId, action: 'addOutOfStockToList' })
  revalidatePath('/estoque')
}

export async function restockItemsByName(houseId: string, userId: string, items: { name: string; quantity: number }[]) {
  const { rows: stockItems } = await query<{ id: string; name: string; quantity: number; owner_id: string | null }>(
    `select id, name, quantity, owner_id from stock_items
     where house_id = $1 and (owner_id is null or owner_id = $2)`,
    [houseId, userId],
  )

  const matched: { stockId: string; stockName: string; notaName: string; added: number }[] = []

  for (const notaItem of items) {
    const notaNorm = normalizeStr(notaItem.name)
    let best = stockItems.find(s => normalizeStr(s.name) === notaNorm)
    if (!best) {
      best = stockItems.find(s => {
        const sn = normalizeStr(s.name)
        return notaNorm.includes(sn) || sn.includes(notaNorm) || similarity(notaNorm, sn) >= 0.6
      })
    }

    if (best) {
      const delta = Math.round(notaItem.quantity || 1)
      await query('update stock_items set quantity = quantity + $1, updated_at = now() where id = $2', [delta, best.id])
      matched.push({ stockId: best.id, stockName: best.name, notaName: notaItem.name, added: delta })
    }
  }

  if (matched.length) await emitN8nEvent('stock.updated', { houseId, userId, matched })
  revalidatePath('/estoque')
  return matched
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const A = bigrams(a)
  const B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  A.forEach(bg => { if (B.has(bg)) inter++ })
  return inter / (A.size + B.size - inter)
}

export async function checkStockMatches(
  houseId: string,
  userId: string,
  items: { name: string; quantity: number }[],
): Promise<{ matched: string[]; unmatched: string[] }> {
  const { rows: stockItems } = await query<{ id: string; name: string }>(
    `select id, name from stock_items
     where house_id = $1 and (owner_id is null or owner_id = $2)`,
    [houseId, userId],
  )

  const matched: string[] = []
  const unmatched: string[] = []

  for (const item of items) {
    const norm = normalizeStr(item.name)
    const hit = stockItems.find(s => {
      const sn = normalizeStr(s.name)
      return sn === norm || norm.includes(sn) || sn.includes(norm) || similarity(norm, sn) >= 0.6
    })
    if (hit) matched.push(item.name)
    else unmatched.push(item.name)
  }

  return { matched, unmatched }
}
