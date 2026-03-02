'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  const supabase = await createClient()
  await supabase.from('stock_items').insert({
    house_id:       data.houseId,
    owner_id:       data.owner === 'pessoal' ? data.userId : null,
    name:           data.name,
    category:       data.category,
    quantity:       data.quantity,
    min_quantity:   data.minQuantity,
    unit:           data.unit,
    in_shopping_list: false,
  })
  revalidatePath('/estoque')
}

export async function updateQuantity(itemId: string, delta: number) {
  const supabase = await createClient()
  const { data: item } = await supabase
    .from('stock_items')
    .select('quantity')
    .eq('id', itemId)
    .single()
  if (!item) return
  await supabase
    .from('stock_items')
    .update({ quantity: Math.max(0, item.quantity + delta) })
    .eq('id', itemId)
  revalidatePath('/estoque')
}

export async function toggleShoppingList(itemId: string, current: boolean) {
  const supabase = await createClient()
  await supabase
    .from('stock_items')
    .update({ in_shopping_list: !current })
    .eq('id', itemId)
  revalidatePath('/estoque')
}

export async function deleteStockItem(itemId: string) {
  const supabase = await createClient()
  await supabase.from('stock_items').delete().eq('id', itemId)
  revalidatePath('/estoque')
}

export async function markAsBought(itemIds: string[]) {
  const supabase = await createClient()
  // Para cada item comprado: repõe ao mínimo e remove da lista
  for (const id of itemIds) {
    const { data: item } = await supabase
      .from('stock_items')
      .select('min_quantity')
      .eq('id', id)
      .single()
    if (!item) continue
    await supabase
      .from('stock_items')
      .update({ quantity: item.min_quantity, in_shopping_list: false })
      .eq('id', id)
  }
  revalidatePath('/estoque')
}

export async function addEsgotadosToList(houseId: string, userId: string) {
  const supabase = await createClient()
  // Busca itens esgotados da casa e pessoais
  const { data: items } = await supabase
    .from('stock_items')
    .select('id, quantity')
    .eq('house_id', houseId)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)
  for (const item of items ?? []) {
    if (item.quantity === 0) {
      await supabase
        .from('stock_items')
        .update({ in_shopping_list: true })
        .eq('id', item.id)
    }
  }
  revalidatePath('/estoque')
}

export async function restockItemsByName(houseId: string, userId: string, items: { name: string; quantity: number }[]) {
  const supabase = await createClient()

  // Busca todos os itens do estoque da casa e pessoal
  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('id, name, quantity, owner_id')
    .eq('house_id', houseId)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)

  if (!stockItems?.length) return []

  const matched: { stockId: string; stockName: string; notaName: string; added: number }[] = []

  for (const notaItem of items) {
    const notaNorm = normalizeStr(notaItem.name)

    // Tenta match exato primeiro, depois parcial
    let best = stockItems.find(s => normalizeStr(s.name) === notaNorm)
    if (!best) {
      best = stockItems.find(s => {
        const sn = normalizeStr(s.name)
        return notaNorm.includes(sn) || sn.includes(notaNorm) || similarity(notaNorm, sn) >= 0.6
      })
    }

    if (best) {
      const delta = Math.round(notaItem.quantity || 1)
      await supabase
        .from('stock_items')
        .update({ quantity: best.quantity + delta })
        .eq('id', best.id)

      matched.push({
        stockId:   best.id,
        stockName: best.name,
        notaName:  notaItem.name,
        added:     delta,
      })
    }
  }

  revalidatePath('/estoque')
  return matched
}

// ── Helpers de normalização ───────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Similaridade de Jaccard por bigramas
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
  items: { name: string; quantity: number }[]
): Promise<{ matched: string[]; unmatched: string[] }> {
  const supabase = await createClient()

  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('id, name')
    .eq('house_id', houseId)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)

  const matched: string[]   = []
  const unmatched: string[] = []

  for (const item of items) {
    const norm = normalizeStr(item.name)
    const hit  = (stockItems ?? []).find(s => {
      const sn = normalizeStr(s.name)
      return sn === norm || norm.includes(sn) || sn.includes(norm) || similarity(norm, sn) >= 0.6
    })
    if (hit) matched.push(item.name)
    else     unmatched.push(item.name)
  }

  return { matched, unmatched }
}