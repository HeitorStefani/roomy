import { redirect } from 'next/navigation'
import { getContasData } from '@/queries/contas'
import ContasClient from './contas-client'

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const month  = params.month !== undefined ? parseInt(params.month) : now.getMonth()
  const year   = params.year  !== undefined ? parseInt(params.year)  : now.getFullYear()

  const data = await getContasData(month, year)
  if (!data) redirect('/login')

  return (
    <ContasClient
      data={data}
      initialMonth={month}
      initialYear={year}
    />
  )
}