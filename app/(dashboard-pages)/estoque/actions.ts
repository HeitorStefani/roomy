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