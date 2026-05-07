'use server'

import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { query } from '@/lib/db'

type StockRow = {
  id: string
  name: string
  category: string
  quantity: number
  min_quantity: number
  unit: string
  in_shopping_list: boolean
}

function mapStock(i: StockRow, owner: 'casa' | 'pessoal') {
  return {
    id:             i.id,
    name:           i.name,
    category:       i.category,
    quantity:       i.quantity,
    minQuantity:    i.min_quantity,
    unit:           i.unit,
    owner,
    inShoppingList: i.in_shopping_list,
  }
}

export async function getEstoqueData() {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)
  if (!profile?.house_id) return null

  const houseId = profile.house_id

  const [{ rows: casaItems }, { rows: pessoalItems }] = await Promise.all([
    query<StockRow>(
      `select id, name, category, quantity, min_quantity, unit, in_shopping_list
       from stock_items
       where house_id = $1 and owner_id is null
       order by name asc`,
      [houseId],
    ),
    query<StockRow>(
      `select id, name, category, quantity, min_quantity, unit, in_shopping_list
       from stock_items
       where house_id = $1 and owner_id = $2
       order by name asc`,
      [houseId, user.id],
    ),
  ])

  return JSON.parse(JSON.stringify({
    userId:  user.id,
    houseId,
    casa: casaItems.map(i => mapStock(i, 'casa')),
    pessoal: pessoalItems.map(i => mapStock(i, 'pessoal')),
  }))
}
