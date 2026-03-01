'use client'

import {
  Card, CardDescription, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Clipboard, Coins, ShoppingCart, Component, Home,
  TrendingUp, CheckCircle2, Clock, AlertCircle, Package,
  ArrowRight, Users,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useRouter } from 'next/navigation'
import type { getDashboardData } from '@/queries/dashboard'

type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboardData>>>

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const priorityColor: Record<string, string> = {
  alta:  'bg-red-500/20 text-red-400 border-red-500/30',
  média: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-zinc-700 text-zinc-400 border-zinc-600',
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const router      = useRouter()
  const { profile, stats, tasks, lowStock, debtors, expenseChartData } = data

  const currentHour = new Date().getHours()
  const greeting    = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite'
  const totalDebts  = debtors.reduce((s, d) => s + d.amount, 0)

  const statCards = [
    {
      label:    'Gasto pessoal',
      value:    fmt(stats.gastoEsseMes),
      icon:     Coins,
      trend:    stats.trendGasto,
      trendUp:  stats.trendGastoUp,
    },
    {
      label:    'Tarefas restantes',
      value:    String(stats.tarefasRestantes),
      icon:     Clipboard,
      trend:    `${stats.overdueTasks} atrasadas`,
      trendUp:  false,
    },
    {
      label:    'Produtos a comprar',
      value:    String(stats.shoppingCount),
      icon:     ShoppingCart,
      trend:    '',
      trendUp:  false,
    },
    {
      label:    'Conta da casa',
      value:    fmt(stats.totalCasa),
      icon:     Home,
      trend:    `${stats.pendingBillsCount} pendentes`,
      trendUp:  false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex mb-4 sm:mb-6 items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-white text-xl sm:text-2xl font-bold mx-1 sm:mx-2">Início</h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full ${profile.avatar_color} flex items-center justify-center text-white text-sm font-bold ring-2 ring-zinc-700 shrink-0`}
            >
              {profile.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-none">
                {greeting}, {profile.name.split(' ')[0]}
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

        {/* ── Stat Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => {
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
                    {stat.trend ? (
                      <span className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 flex-shrink-0 ${
                        stat.trendUp ? 'text-red-400' : 'text-zinc-500'
                      }`}>
                        {stat.trendUp && <TrendingUp className="w-3 h-3" />}
                        <span className="hidden xs:inline">{stat.trend}</span>
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className="text-white text-lg sm:text-2xl mt-1">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* ── Middle row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Gráfico de Gastos */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-white text-sm sm:text-base">Gastos últimos 30 dias</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                    Comparativo com período anterior
                  </CardDescription>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenseChartData}>
                  <defs>
                    <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dia" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(v: unknown) => [fmt(Number(v)), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="semanaPassada"
                    stroke="#3f3f46"
                    strokeWidth={1.5}
                    fill="none"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="gasto"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#gastoGrad)"
                    dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Próximas Tarefas */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-white text-sm sm:text-base">Próximas tarefas</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                    O que precisa ser feito em breve
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
                <p className="text-zinc-500 text-sm text-center py-6">
                  Nenhuma tarefa pendente 🎉
                </p>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-colors gap-2 ${
                      task.done ? 'bg-zinc-900 opacity-50' : 'bg-zinc-900 hover:bg-zinc-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {task.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      }
                      <span className={`text-xs sm:text-sm truncate ${task.done ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0.5 hidden xs:inline-flex ${priorityColor[task.priority]}`}
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-zinc-500 text-xs">{task.date}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">

          {/* Pendências da casa */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <CardTitle className="text-white text-sm sm:text-base">Pendências da casa</CardTitle>
              </div>
              <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                {totalDebts > 0 ? `${fmt(totalDebts)} a receber` : 'Tudo em dia'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
              {debtors.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-6">
                  Nenhuma pendência no momento ✅
                </p>
              ) : (
                debtors.map(d => (
                  <div key={d.name} className="flex items-center gap-2.5 bg-zinc-900 p-2.5 rounded-xl">
                    <div className={`w-7 h-7 rounded-full ${d.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {d.name[0].toUpperCase()}
                    </div>
                    <span className="text-zinc-300 text-sm flex-1">{d.name}</span>
                    <span className="text-red-400 text-sm font-semibold">{fmt(d.amount)}</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                  </div>
                ))
              )}
              <button
                className="w-full mt-1 text-xs text-zinc-500 hover:text-white flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                onClick={() => router.push('/contas')}
              >
                Ver conta da casa <ArrowRight className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>

          {/* Estoque baixo */}
          <Card className="bg-zinc-800 border-none">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
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
                <p className="text-zinc-500 text-sm text-center py-6">
                  Estoque dentro do esperado 📦
                </p>
              ) : (
                lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-900 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-white text-sm">{item.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5"
                    >
                      {item.quantity} restante{item.quantity !== 1 ? 's' : ''}
                    </Badge>
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

        {/* ── Resumo ───────────────────────────────────────────── */}
        <Card className="bg-zinc-800 border-none mt-4 sm:mt-6">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-2">
            <div className="flex items-center gap-2">
              <Component className="w-4 h-4 text-yellow-500" />
              <CardTitle className="text-white text-sm sm:text-base">Resumo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {[
                {
                  icon:  '📈',
                  text:  stats.trendGastoUp
                    ? `Você gastou ${stats.trendGasto} a mais que o mês passado.`
                    : `Você gastou ${stats.trendGasto.replace('-', '')} a menos que o mês passado.`,
                  color: stats.trendGastoUp
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-emerald-500/20 bg-emerald-500/5',
                },
                {
                  icon:  '🧹',
                  text:  stats.overdueTasks > 0
                    ? `${stats.overdueTasks} tarefa${stats.overdueTasks > 1 ? 's estão atrasadas' : ' está atrasada'}.`
                    : 'Nenhuma tarefa atrasada.',
                  color: stats.overdueTasks > 0
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-emerald-500/20 bg-emerald-500/5',
                },
                {
                  icon:  '🛒',
                  text:  stats.shoppingCount > 0
                    ? `${stats.shoppingCount} produto${stats.shoppingCount > 1 ? 's' : ''} na lista de compras.`
                    : 'Lista de compras vazia.',
                  color: 'border-blue-500/20 bg-blue-500/5',
                },
                {
                  icon:  '📦',
                  text:  lowStock.length > 0
                    ? `${lowStock.length} produto${lowStock.length > 1 ? 's estão acabando' : ' está acabando'} no estoque.`
                    : 'Estoque dentro do esperado.',
                  color: lowStock.length > 0
                    ? 'border-purple-500/20 bg-purple-500/5'
                    : 'border-emerald-500/20 bg-emerald-500/5',
                },
              ].map(({ icon, text, color }) => (
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