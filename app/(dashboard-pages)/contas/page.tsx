import { redirect } from 'next/navigation'
import { getContasData } from '@/queries/contas'
import ContasClient from './contas-client'

export default async function ContasPage() {
  const now  = new Date()
  const data = await getContasData(now.getMonth(), now.getFullYear())
  if (!data) redirect('/login')
  return (
    <ContasClient
      data={data}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  )
}