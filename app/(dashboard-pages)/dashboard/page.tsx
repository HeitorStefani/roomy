import { getDashboardData } from '@/queries/dashboard'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
