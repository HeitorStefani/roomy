import { redirect } from 'next/navigation'
import { getTarefasData } from '@/queries/tarefas'
import TarefasClient from './tarefas-client'

export default async function TarefasPage() {
  const data = await getTarefasData()
  if (!data) redirect('/login')
  return <TarefasClient data={data} />
}