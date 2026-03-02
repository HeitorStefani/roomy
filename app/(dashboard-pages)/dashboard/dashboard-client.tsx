'use client'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Clipboard,
  Coins,
  ShoppingCart,
  Component,
  Home,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  ArrowRight,
  Users,
  Utensils,
  Car,
  ShoppingBag,
  Heart,
  MoreHorizontal,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useRouter } from 'next/navigation'
import type { getDashboardData } from '@/queries/dashboard'

// ── Types ──────────────────────────────────────────────────────────────────────

type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboardData>>>

interface StatTrend {
  label: string
  value: string
  icon: LucideIcon
  trend: string
  trendUp: boolean
}

interface IOweItem {
  paidByColor: string
  paidByName: string
  billTitle: string
  dueDate: string
  amount: number
}

interface DebtorItem {
  color: string
  name: string
  billTitle: string
  amount: number
}

interface LowStockItem {
  id: string | number
  name: string
  quantity: number
  min_quantity: number
}

interface SummaryCard {
  icon: string
  text: string
  color: string
}

// ✅ NOVO: interface adicionada aqui
interface TaskItem {
  id: string | number
  title: string
  priority: string
  category: string
  overdue: boolean
  date: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const priorityColor: Record<string, string> = {
  alta:  'bg-red-500/20 text-red-400 border-red-500/30',
  média: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-zinc-700 text-zinc-400 border-zinc-600',
}

const roomIcon: Record<string, LucideIcon> = {
  Cozinha:    Utensils,
  Banheiro:   ShoppingBag,
  Sala:       Home,
  Quarto:     Heart,
  Lavanderia: ShoppingCart,
  Garagem:    Car,
  Geral:      MoreHorizontal,
}

const roomColor: Record<string, string> = {
  Cozinha:    'text-orange-400',
  Banheiro:   'text-blue-400',
  Sala:       'text-violet-400',
  Quarto:     'text-rose-400',
  Lavanderia: 'text-cyan-400',
  Garagem:    'text-zinc-400',
  Geral:      'text-zinc-500',
}

// ── Component ──────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  data: DashboardData
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter()
  const { profile, stats, tasks, lowStock, debtors, iOwe, expenseChartData } = data

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite'

  const statCards: StatTrend[] = [
    {
      label:   'Gasto pessoal',
      value:   fmt(stats.gastoEsseMes ?? 0),
      icon:    Coins,
      trend:   stats.trendGasto ?? '',
      trendUp: stats.trendGastoUp ?? false,
    },
    {
      label:   'Tarefas restantes',
      value:   String(stats.tarefasRestantes ?? 0),
      icon:    Clipboard,
      trend:   `${stats.overdueTasks ?? 0} atrasadas`,
      trendUp: (stats.overdueTasks ?? 0) > 0,
    },
    {
      label:   'Produtos a comprar',
      value:   String(stats.shoppingCount ?? 0),
      icon:    ShoppingCart,
      trend:   '',
      trendUp: false,
    },
    {
      label:   'Conta da casa',
      value:   fmt(stats.totalCasa ?? 0),
      icon:    Home,
      trend:   `${stats.pendingBillsCount ?? 0} pendentes`,
      trendUp: false,
    },
  ]

  const summaryCards: SummaryCard[] = [
    {
      icon: '📈',
      text: stats.trendGastoUp
        ? `Você gastou ${stats.trendGasto} a mais que o mês passado.`
        : `Você gastou ${stats.trendGasto?.replace('-', '') ?? '0'} a menos que o mês passado.`,
      color: stats.trendGastoUp
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-emerald-500/20 bg-emerald-500/5',
    },
    {
      icon: '🧹',
      text: (stats.overdueTasks ?? 0) > 0
        ? `${stats.overdueTasks} tarefa${stats.overdueTasks > 1 ? 's atribuídas a você estão atrasadas' : ' atribuída a você está atrasada'}.`
        : 'Nenhuma tarefa sua atrasada.',
      color: (stats.overdueTasks ?? 0) > 0
        ? 'border-amber-500/20 bg-amber-500/5'
        : 'border-emerald-500/20 bg-emerald-500/5',
    },
    {
      icon: '🛒',
      text: (stats.shoppingCount ?? 0) > 0
        ? `${stats.shoppingCount} produto${stats.shoppingCount > 1 ? 's' : ''} na lista de compras.`
        : 'Lista de compras vazia.',
      color: 'border-blue-500/20 bg-blue-500/5',
    },
    {
      icon: '💸',
      text: (stats.totalIOwe ?? 0) > 0
        ? `Você ainda deve ${fmt(stats.totalIOwe)} em contas da casa.`
        : (stats.totalToReceive ?? 0) > 0
          ? `Você tem ${fmt(stats.totalToReceive)} a receber de moradores.`
          : 'Suas contas da casa estão em dia.',
      color: (stats.totalIOwe ?? 0) > 0
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-emerald-500/20 bg-emerald-500/5',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex mb-4 sm:mb-6 items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-white text-xl sm:text-2xl font-bold mx-1 sm:mx-2">Início</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${profile.avatar_color} flex items-center justify-center text-white text-sm font-bold ring-2 ring-zinc-700 shrink-0`}>
              {profile.name[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-none">
                {greeting}, {profile.name.split(' ')[0] ?? 'Usuário'}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 hidden xs:block">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 xs:hidden">
                {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat: StatTrend) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-zinc-800 border-none">
                <CardHeader className="p-3 sm:p-4 sm:pb-2 pb-2">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Icon className="text-zinc-400 w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <CardDescription className="text-zinc-400 text-xs sm:text-sm leading-tight">
                        {stat.label}
                      </CardDescription>
                    </div>
                    {stat.trend && (
                      <span className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 flex-shrink-0 ${stat.trendUp ? 'text-red-400' : 'text-zinc-500'}`}>
                        {stat.trendUp && <TrendingUp className="w-3 h-3" />}
                        <span className="hidden xs:inline">{stat.trend}</span>
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg sm:text-2xl mt-1">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* ── Gráfico + Tarefas ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Gráfico de Gastos */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-white text-sm sm:text-base">Gastos este mês</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs sm:text-sm">Comparativo com mês anterior</CardDescription>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                    Este mês
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block flex-shrink-0" />
                    Anterior
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-44 sm:h-52 px-2 sm:px-4 pb-3 sm:pb-4">
              {expenseChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <Coins className="w-8 h-8 text-zinc-700" />
                  <p className="text-zinc-600 text-xs">Nenhum gasto registrado ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expenseChartData}>
                    <defs>
                      <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="dia"
                      stroke="#52525b"
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: 'white', borderRadius: '8px', fontSize: 12 }}
                      formatter={(v: number | string | undefined) => [fmt(Number(v ?? 0)), ''] as [string, string]}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Area type="monotone" dataKey="semanaPassada" stroke="#3f3f46" strokeWidth={1.5} fill="none" dot={false} />
                    <Area type="monotone" dataKey="gasto" stroke="#22c55e" strokeWidth={2} fill="url(#gastoGrad)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Minhas Tarefas */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-white text-sm sm:text-base">Minhas tarefas</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                    Atribuídas a você · {tasks.length} pendente{tasks.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <button
                  className="text-zinc-500 hover:text-white text-xs flex items-center gap-1 transition-colors flex-shrink-0 mt-0.5"
                  onClick={() => router.push('/tarefas')}
                >
                  <span className="hidden xs:inline">Ver todas</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                  <p className="text-zinc-500 text-sm">Nenhuma tarefa pendente 🎉</p>
                </div>
              ) : (
                // ✅ CORREÇÃO: cast para TaskItem[] aqui
                (tasks as TaskItem[]).map((task: TaskItem) => {
                  const CatIcon  = roomIcon[task.category]  ?? MoreHorizontal
                  const catColor = roomColor[task.category] ?? 'text-zinc-400'
                  const isOverdue = task.overdue

                  return (
                    <div key={task.id}
                      className={`flex flex-col p-2.5 sm:p-3 rounded-xl transition-colors gap-2 bg-zinc-900 hover:bg-zinc-700/60 ${isOverdue ? 'border border-red-500/20' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`} />
                        <span className="text-white text-xs sm:text-sm flex-1 truncate font-medium">{task.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${priorityColor[task.priority] ?? 'bg-zinc-700 text-zinc-400'}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 pl-5">
                        <span className={`flex items-center gap-1 text-[10px] ${catColor}`}>
                          <CatIcon className="w-3 h-3" />
                          {task.category || 'Geral'}
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
                          <CalendarDays className="w-3 h-3" />
                          {isOverdue ? 'Atrasada · ' : ''}{task.date}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Contas + Estoque ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Contas da casa */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <CardTitle className="text-white text-sm sm:text-base">Contas da casa</CardTitle>
              </div>
              <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                Suas pendências e cobranças do mês
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-zinc-400 text-[10px]">Você deve</span>
                  </div>
                  <p className="text-red-400 font-bold text-base sm:text-lg">{fmt(stats.totalIOwe ?? 0)}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{iOwe.length} conta{iOwe.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-zinc-400 text-[10px]">A receber</span>
                  </div>
                  <p className="text-emerald-400 font-bold text-base sm:text-lg">{fmt(stats.totalToReceive ?? 0)}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{debtors.length} devedor{debtors.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              {iOwe.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider px-1">Você deve</p>
                  {(iOwe as IOweItem[]).map((item: IOweItem, index: number) => (
                    <div key={index} className="flex items-center gap-2.5 bg-zinc-900 p-2.5 rounded-xl">
                      <div className={`w-7 h-7 rounded-full ${item.paidByColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {item.paidByName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-300 text-xs font-medium truncate">{item.billTitle}</p>
                        <p className="text-zinc-600 text-[10px]">
                          para {item.paidByName} · vence{' '}
                          {new Date(item.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <span className="text-red-400 text-sm font-semibold flex-shrink-0">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {debtors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider px-1">Vão te pagar</p>
                  {(debtors as DebtorItem[]).map((d: DebtorItem, index: number) => (
                    <div key={index} className="flex items-center gap-2.5 bg-zinc-900 p-2.5 rounded-xl">
                      <div className={`w-7 h-7 rounded-full ${d.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {d.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-300 text-xs font-medium truncate">{d.name.split(' ')[0]}</p>
                        <p className="text-zinc-600 text-[10px]">{d.billTitle}</p>
                      </div>
                      <span className="text-emerald-400 text-sm font-semibold flex-shrink-0">{fmt(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {iOwe.length === 0 && debtors.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">Nenhuma pendência no momento ✅</p>
              )}

              <button
                className="w-full text-xs text-zinc-500 hover:text-white flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                onClick={() => router.push('/contas')}
              >
                Ver conta da casa <ArrowRight className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>

          {/* Estoque baixo */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-zinc-400" />
                <CardTitle className="text-white text-sm sm:text-base">Estoque baixo</CardTitle>
              </div>
              <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                {lowStock.length > 0 ? `${lowStock.length} produtos acabando` : 'Estoque OK'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
              {lowStock.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-6">Estoque dentro do esperado 📦</p>
              ) : (
                (lowStock as LowStockItem[]).map((item: LowStockItem) => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-900 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-white text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min((item.quantity / item.min_quantity) * 100, 100)}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5">
                        {item.quantity} / {item.min_quantity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
              <button
                className="w-full mt-1 text-xs text-zinc-500 hover:text-white flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                onClick={() => router.push('/estoque')}
              >
                Ver estoque <ArrowRight className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* ── Resumo ────────────────────────────────────────────── */}
        <Card className="bg-zinc-800 border-none mt-4 sm:mt-6">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center gap-2">
              <Component className="w-4 h-4 text-yellow-500" />
              <CardTitle className="text-white text-sm sm:text-base">Resumo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {summaryCards.map(({ icon, text, color }: SummaryCard) => (
                <div key={text} className={`p-3 rounded-xl border ${color} text-xs sm:text-sm text-zinc-300`}>
                  <span className="text-base mr-1.5">{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}