import { redirect } from 'next/navigation'
import { getEstoqueData } from '@/queries/estoque'
import EstoqueClient from './estoque-client'

export default async function EstoquePage() {
  const data = await getEstoqueData()
  if (!data) redirect('/login')
  return <EstoqueClient data={data} />
}