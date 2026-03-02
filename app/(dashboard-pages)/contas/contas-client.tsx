'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Home, User, Plus, Bell, CheckCircle2, Clock,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Utensils, Car, ShoppingBag, Heart, Gamepad2,
  DollarSign, Target, Wallet, AlertCircle, Check,
  ChevronDown, ChevronUp, Trash2, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import {
  addHouseBill, markParticipantAsPaid, markBillNotified,
  addPersonalTransaction, addBudgetCategory, deleteBudgetCategory,
  deleteBill, deleteTransaction,
} from './actions'
import { NfceScanner } from '@/components/nfce-scanner'
import type { getContasData } from '@/queries/contas'

// ── Types ──────────────────────────────────────────────────────────────────────

type ContasData    = NonNullable<Awaited<ReturnType<typeof getContasData>>>
type TabType       = 'casa' | 'pessoal'
type Morador       = ContasData['moradores'][number]
type Bill          = ContasData['bills'][number]
type Participant   = Bill['participants'][number]
type Transaction   = ContasData['transactions'][number]
type Budget        = ContasData['budgets'][number]

interface BillForm {
  title: string
  total: string
  dueDate: string
  involved: string[]
}

interface TxForm {
  description: string
  category: string
  amount: string
  type: 'expense' | 'income'
}

interface MetaForm {
  name: string
  limitAmount: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez',
] as const

const fmt = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const CATEGORY_OPTIONS = [
  { value: 'food',      label: 'Alimentação', icon: 'food',      color: 'text-orange-400' },
  { value: 'transport', label: 'Transporte',  icon: 'transport', color: 'text-blue-400'   },
  { value: 'health',    label: 'Saúde',       icon: 'health',    color: 'text-rose-400'   },
  { value: 'shopping',  label: 'Compras',     icon: 'shopping',  color: 'text-purple-400' },
  { value: 'leisure',   label: 'Lazer',       icon: 'leisure',   color: 'text-teal-400'   },
  { value: 'income',    label: 'Renda',       icon: 'income',    color: 'text-emerald-400'},
  { value: 'other',     label: 'Outros',      icon: 'other',     color: 'text-zinc-400'   },
] as const

const categoryIcon: Record<string, LucideIcon> = {
  food: Utensils, transport: Car, health: Heart,
  shopping: ShoppingBag, leisure: Gamepad2, income: DollarSign, other: MoreHorizontal,
}

const categoryColor: Record<string, string> = {
  food: 'text-orange-400', transport: 'text-blue-400', health: 'text-rose-400',
  shopping: 'text-purple-400', leisure: 'text-teal-400', income: 'text-emerald-400', other: 'text-zinc-400',
}

const categoryBg: Record<string, string> = {
  food: 'bg-orange-500/10', transport: 'bg-blue-500/10', health: 'bg-rose-500/10',
  shopping: 'bg-purple-500/10', leisure: 'bg-teal-500/10', income: 'bg-emerald-500/10', other: 'bg-zinc-700',
}

const categoryLabel: Record<string, string> = {
  food: 'Alimentação', transport: 'Transporte', health: 'Saúde',
  shopping: 'Compras', leisure: 'Lazer', income: 'Renda', other: 'Outros',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface AvatarPillProps {
  name: string
  color: string
  size?: 'sm' | 'md'
}

function AvatarPill({ name, color, size = 'md' }: AvatarPillProps) {
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-zinc-900`}>
      {name[0].toUpperCase()}
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  accent: string
  border: string
  icon: LucideIcon
}

function SummaryCard({ label, value, accent, border, icon: Icon }: SummaryCardProps) {
  return (
    <div className={`bg-zinc-800 border ${border} rounded-2xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-500 text-[10px] sm:text-xs">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
      </div>
      <p className={`text-base sm:text-xl font-bold ${accent}`}>{fmt(value)}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ContasClientProps {
  data: ContasData
  initialMonth: number
  initialYear: number
}

export default function ContasClient({ data, initialMonth, initialYear }: ContasClientProps) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  const [tab, setTab] = useState<TabType>('casa')

  const monthIndex = initialMonth
  const year       = initialYear

  const navigateMonth = (dir: -1 | 1): void => {
    let m = initialMonth + dir
    let y = initialYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    router.push(`/contas?month=${m}&year=${y}`)
  }

  const [expandedBill, setExpandedBill] = useState<string | null>(null)
  const [openAddBill,  setOpenAddBill]  = useState<boolean>(false)
  const [openAddTx,    setOpenAddTx]    = useState<boolean>(false)
  const [openAddMeta,  setOpenAddMeta]  = useState<boolean>(false)

  const [billForm, setBillForm] = useState<BillForm>({ title: '', total: '', dueDate: '', involved: [] })
  const [txForm,   setTxForm]   = useState<TxForm>({ description: '', category: 'food', amount: '', type: 'expense' })
  const [metaForm, setMetaForm] = useState<MetaForm>({ name: 'food', limitAmount: '' })

  const { userId, profile, moradores, bills, houseSummary, transactions, personalSummary, budgets } = data
  const houseId = profile.house_id!

  const run = (fn: () => Promise<void>): void => {
    startTransition(async () => { await fn(); router.refresh() })
  }

  const handleMarkPaid   = (id: string): void => run(() => markParticipantAsPaid(id))
  const handleNotify     = (id: string): void => run(() => markBillNotified(id))
  const handleDeleteMeta = (id: string): void => run(() => deleteBudgetCategory(id))

  const handleAddBill = (): void => {
    if (!billForm.title || !billForm.total || billForm.involved.length === 0) return
    const total = parseFloat(billForm.total.replace(',', '.'))
    const share = total / billForm.involved.length
    run(async () => {
      await addHouseBill({
        houseId: profile.house_id!, userId,
        title: billForm.title, total,
        dueDate: billForm.dueDate || new Date().toISOString().split('T')[0],
        involved: billForm.involved.map((id: string) => ({ userId: id, amount: share })),
      })
      setBillForm({ title: '', total: '', dueDate: '', involved: [] })
      setOpenAddBill(false)
    })
  }

  const handleAddTx = (): void => {
    if (!txForm.description || !txForm.amount) return
    run(async () => {
      await addPersonalTransaction({
        userId, description: txForm.description, category: txForm.category,
        amount: parseFloat(txForm.amount.replace(',', '.')),
        type: txForm.type, date: new Date().toISOString().split('T')[0],
      })
      setTxForm({ description: '', category: 'food', amount: '', type: 'expense' })
      setOpenAddTx(false)
    })
  }

  const handleAddMeta = (): void => {
    if (!metaForm.limitAmount) return
    const cat = CATEGORY_OPTIONS.find(c => c.value === metaForm.name)
    if (!cat) return
    run(async () => {
      await addBudgetCategory({
        userId, name: cat.label, iconName: cat.icon,
        color: cat.color, limitAmount: parseFloat(metaForm.limitAmount.replace(',', '.')),
      })
      setMetaForm({ name: 'food', limitAmount: '' })
      setOpenAddMeta(false)
    })
  }

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
            <h1 className="text-white text-xl sm:text-2xl font-bold">Contas</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-800 rounded-xl px-2 sm:px-3 py-1.5">
              <button onClick={() => navigateMonth(-1)} className="text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white text-xs sm:text-sm font-medium w-16 sm:w-20 text-center">
                {MONTHS[monthIndex]} {year}
              </span>
              <button onClick={() => navigateMonth(1)} className="text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-zinc-800 p-1 rounded-2xl w-full sm:w-fit">
          {([
            { key: 'casa',    label: 'Casa',    icon: Home },
            { key: 'pessoal', label: 'Pessoal', icon: User },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 flex-1 sm:flex-none sm:px-6 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === key
                  ? key === 'casa' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ══════════ CASA ════════════════════════════════════════ */}
        {tab === 'casa' && (
          <div className="space-y-4">

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryCard label="Você deve"  value={houseSummary.totalDebt}       accent="text-red-400"     border="border-red-500/20"     icon={TrendingDown} />
              <SummaryCard label="A receber"  value={houseSummary.totalReceivable} accent="text-emerald-400" border="border-emerald-500/20" icon={TrendingUp}   />
              <SummaryCard label="Total casa" value={houseSummary.totalCasa}       accent="text-blue-400"    border="border-blue-500/20"    icon={Home}         />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-white font-semibold">Contas do Mês</h2>
              <div className="flex items-center gap-2">
                <NfceScanner userId={userId} houseId={houseId} moradores={moradores} mode="casa" />
                <Dialog open={openAddBill} onOpenChange={setOpenAddBill}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Nova Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-md rounded-2xl">
                    <DialogHeader><DialogTitle>Cadastrar Conta da Casa</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <Label className="text-zinc-400 text-xs">Nome da conta</Label>
                        <Input value={billForm.title} onChange={e => setBillForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Ex: Aluguel, Água..." className="bg-zinc-700 border-zinc-600 text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-zinc-400 text-xs">Valor total (R$)</Label>
                          <Input value={billForm.total} onChange={e => setBillForm(f => ({ ...f, total: e.target.value }))}
                            placeholder="0,00" className="bg-zinc-700 border-zinc-600 text-white" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-zinc-400 text-xs">Vencimento</Label>
                          <Input type="date" value={billForm.dueDate} onChange={e => setBillForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="bg-zinc-700 border-zinc-600 text-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Quem está envolvido?</Label>
                        <div className="flex flex-wrap gap-2">
                          {moradores.map((m: Morador) => {
                            const sel = billForm.involved.includes(m.id)
                            return (
                              <button key={m.id}
                                onClick={() => setBillForm(f => ({
                                  ...f,
                                  involved: sel
                                    ? f.involved.filter((id: string) => id !== m.id)
                                    : [...f.involved, m.id],
                                }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                  sel ? `${m.avatar_color} text-white` : 'bg-zinc-700 text-zinc-400 hover:text-white'
                                }`}>
                                {sel && <Check className="w-3 h-3" />}{m.name.split(' ')[0]}
                              </button>
                            )
                          })}
                        </div>
                        {billForm.involved.length > 0 && billForm.total && (
                          <p className="text-zinc-400 text-xs bg-zinc-700 rounded-lg px-3 py-2">
                            Cada um paga:{' '}
                            <span className="text-white font-semibold">
                              {fmt(parseFloat(billForm.total.replace(',', '.') || '0') / billForm.involved.length)}
                            </span>
                          </p>
                        )}
                      </div>
                      <Button onClick={handleAddBill} className="w-full bg-blue-600 hover:bg-blue-500">Cadastrar e dividir</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-zinc-800 rounded-2xl border border-zinc-700/50 overflow-hidden">
              {bills.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-10">Nenhuma conta registrada este mês.</p>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {bills.map((bill: Bill) => {
                    const pending    = bill.participants.filter((p: Participant) => !p.paid && p.userId !== bill.paidBy)
                    const myEntry    = bill.participants.find((p: Participant) => p.userId === userId)
                    const iOwe       = myEntry != null && !myEntry.paid && bill.paidBy !== userId
                    const isExpanded = expandedBill === bill.id
                    const paidCount  = bill.participants.filter((p: Participant) => p.paid).length
                    const paidByUser = moradores.find((m: Morador) => m.id === bill.paidBy)

                    return (
                      <div key={bill.id}>
                        <button
                          onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/30 transition-colors text-left"
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            iOwe ? 'bg-red-400' : paidCount === bill.participants.length ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-sm font-medium">{bill.title}</span>
                              {iOwe && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">
                                  Você deve
                                </Badge>
                              )}
                              {bill.paidBy === userId && pending.length > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  {pending.length} pendente{pending.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1 w-20 bg-zinc-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${(paidCount / bill.participants.length) * 100}%` }} />
                              </div>
                              <span className="text-zinc-500 text-[10px]">{paidCount}/{bill.participants.length}</span>
                              <span className="text-zinc-600 text-[10px]">
                                · vence {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-white font-bold text-sm">{fmt(bill.total)}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 bg-zinc-750 border-t border-zinc-700/30">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <span className="text-zinc-500 text-xs">
                                Pago por: <span className="text-zinc-300">{paidByUser?.name.split(' ')[0]}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {bill.paidBy === userId && pending.length > 0 && (
                                  <Button size="sm" variant="outline" onClick={() => handleNotify(bill.id)}
                                    className={`text-xs h-7 gap-1 ${
                                      bill.notified
                                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                        : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                    }`}>
                                    {bill.notified
                                      ? <><CheckCircle2 className="w-3 h-3" /> Notificado</>
                                      : <><Bell className="w-3 h-3" /> Cobrar</>
                                    }
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => run(() => deleteBill(bill.id))}
                                  className="text-xs h-7 gap-1 border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/20">
                                  <Trash2 className="w-3 h-3" /> Apagar
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {bill.participants.map((p: Participant) => (
                                <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${p.paid ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                  <AvatarPill name={p.name} color={p.color} size="sm" />
                                  <span className="text-zinc-300 text-xs flex-1">{p.name.split(' ')[0]}</span>
                                  <span className="text-zinc-400 text-xs font-medium">{fmt(p.amount)}</span>
                                  {p.paid
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    : (
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-red-400" />
                                        {bill.paidBy === userId && (
                                          <button onClick={() => handleMarkPaid(p.id)}
                                            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-2 py-0.5 rounded-full transition-colors">
                                            Confirmar
                                          </button>
                                        )}
                                      </div>
                                    )
                                  }
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ PESSOAL ═════════════════════════════════════ */}
        {tab === 'pessoal' && (
          <div className="space-y-4">

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryCard
                label="Saldo"
                value={personalSummary.balance}
                accent={personalSummary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}
                border={personalSummary.balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}
                icon={Wallet}
              />
              <SummaryCard label="Receitas" value={personalSummary.totalIncome}  accent="text-blue-400" border="border-blue-500/20" icon={TrendingUp}   />
              <SummaryCard label="Gastos"   value={personalSummary.totalExpense} accent="text-rose-400" border="border-rose-500/20" icon={TrendingDown} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

              {/* ── Metas ────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <h2 className="text-white font-semibold text-sm">Metas por Categoria</h2>
                  </div>
                  <Dialog open={openAddMeta} onOpenChange={setOpenAddMeta}>
                    <DialogTrigger asChild>
                      <button className="text-violet-400 hover:text-violet-300 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
                      <DialogHeader><DialogTitle>Nova Meta de Gasto</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <Label className="text-zinc-400 text-xs">Categoria</Label>
                          <Select value={metaForm.name} onValueChange={v => setMetaForm(f => ({ ...f, name: v }))}>
                            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-700 border-zinc-600">
                              {CATEGORY_OPTIONS.map(c => (
                                <SelectItem key={c.value} value={c.value} className="text-zinc-200">{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-zinc-400 text-xs">Limite mensal (R$)</Label>
                          <Input value={metaForm.limitAmount} onChange={e => setMetaForm(f => ({ ...f, limitAmount: e.target.value }))}
                            placeholder="0,00" className="bg-zinc-700 border-zinc-600 text-white" />
                        </div>
                        <Button onClick={handleAddMeta} className="w-full bg-violet-600 hover:bg-violet-500">Criar meta</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {budgets.length === 0 ? (
                  <div className="bg-zinc-800 border border-dashed border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-2">
                    <Target className="w-8 h-8 text-zinc-700" />
                    <p className="text-zinc-500 text-xs text-center">Nenhuma meta ainda.<br />Clique em + para criar.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {budgets.map((cat: Budget) => {
                      const Icon = categoryIcon[cat.icon_name] ?? MoreHorizontal
                      const pct  = Math.min((cat.spent / cat.limit_amount) * 100, 100)
                      const over = cat.spent > cat.limit_amount
                      return (
                        <div key={cat.id} className="bg-zinc-800 rounded-xl p-3 group">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-7 h-7 rounded-lg ${categoryBg[cat.icon_name] ?? 'bg-zinc-700'} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                            </div>
                            <span className="text-zinc-200 text-sm flex-1 font-medium">{cat.name}</span>
                            {over && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                            <span className={`text-xs font-semibold ${over ? 'text-red-400' : 'text-zinc-300'}`}>
                              {fmt(cat.spent)}
                              <span className="text-zinc-600 font-normal"> / {fmt(cat.limit_amount)}</span>
                            </span>
                            <button
                              onClick={() => handleDeleteMeta(cat.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : 'bg-violet-500'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-zinc-600 text-[10px]">{pct.toFixed(0)}% usado</span>
                            {over
                              ? <span className="text-red-500 text-[10px]">+{fmt(cat.spent - cat.limit_amount)}</span>
                              : <span className="text-zinc-600 text-[10px]">Falta {fmt(cat.limit_amount - cat.spent)}</span>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Transações ───────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-white font-semibold text-sm">Transações</h2>
                  <div className="flex items-center gap-2">
                    <NfceScanner userId={userId} houseId={houseId} moradores={moradores} mode="pessoal" />
                    <Dialog open={openAddTx} onOpenChange={setOpenAddTx}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5 text-xs">
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-md rounded-2xl">
                        <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="flex gap-2 bg-zinc-700 p-1 rounded-xl">
                            {(['expense', 'income'] as const).map(t => (
                              <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                  txForm.type === t
                                    ? (t === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white')
                                    : 'text-zinc-400 hover:text-white'
                                }`}>
                                {t === 'expense' ? 'Gasto' : 'Receita'}
                              </button>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-zinc-400 text-xs">Descrição</Label>
                            <Input value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Ex: Almoço, Salário..." className="bg-zinc-700 border-zinc-600 text-white" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-zinc-400 text-xs">Categoria</Label>
                              <Select value={txForm.category} onValueChange={v => setTxForm(f => ({ ...f, category: v }))}>
                                <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-zinc-700 border-zinc-600">
                                  {CATEGORY_OPTIONS.map(c => (
                                    <SelectItem key={c.value} value={c.value} className="text-zinc-200">{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-zinc-400 text-xs">Valor (R$)</Label>
                              <Input value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0,00" className="bg-zinc-700 border-zinc-600 text-white" />
                            </div>
                          </div>
                          <Button onClick={handleAddTx} className="w-full bg-violet-600 hover:bg-violet-500">Salvar transação</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-zinc-800 rounded-2xl border border-zinc-700/50 overflow-hidden">
                  {transactions.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-10">Nenhuma transação este mês.</p>
                  ) : (
                    <div className="divide-y divide-zinc-700/40">
                      {transactions.map((tx: Transaction) => {
                        const Icon  = categoryIcon[tx.category] ?? MoreHorizontal
                        const color = tx.type === 'income' ? 'text-emerald-400' : (categoryColor[tx.category] ?? 'text-zinc-400')
                        const bg    = tx.type === 'income' ? 'bg-emerald-500/10' : (categoryBg[tx.category] ?? 'bg-zinc-700')
                        return (
                          <div key={tx.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/30 transition-colors">
                            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-3.5 h-3.5 ${color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                              <p className="text-zinc-500 text-[10px]">
                                {categoryLabel[tx.category] ?? tx.category} · {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                            <span className={`font-semibold text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                            </span>
                            <button
                              onClick={() => run(() => deleteTransaction(tx.id))}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}