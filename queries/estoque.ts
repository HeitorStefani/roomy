'use server'

import { createClient } from '@/lib/supabase/server'

export async function getEstoqueData() {
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

  // Itens da casa (owner_id = null)
  const { data: casaItems } = await supabase
    .from('stock_items')
    .select('id, name, category, quantity, min_quantity, unit, in_shopping_list')
    .eq('house_id', houseId)
    .is('owner_id', null)
    .order('name', { ascending: true })

  // Itens pessoais (owner_id = user.id)
  const { data: pessoalItems } = await supabase
    .from('stock_items')
    .select('id, name, category, quantity, min_quantity, unit, in_shopping_list')
    .eq('house_id', houseId)
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  return JSON.parse(JSON.stringify({
    userId:  user.id,
    houseId: profile.house_id,
    casa: (casaItems ?? []).map(i => ({
      id:             i.id,
      name:           i.name,
      category:       i.category,
      quantity:       i.quantity,
      minQuantity:    i.min_quantity,
      unit:           i.unit,
      owner:          'casa' as const,
      inShoppingList: i.in_shopping_list,
    })),
    pessoal: (pessoalItems ?? []).map(i => ({
      id:             i.id,
      name:           i.name,
      category:       i.category,
      quantity:       i.quantity,
      minQuantity:    i.min_quantity,
      unit:           i.unit,
      owner:          'pessoal' as const,
      inShoppingList: i.in_shopping_list,
    })),
  }))
}