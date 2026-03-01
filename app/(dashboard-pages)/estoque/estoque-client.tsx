'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Home, User, Plus, AlertCircle, ShoppingCart, Minus,
  PackageX, Package, CheckCircle2, Trash2, Search,
  ArrowDownToLine, TrendingDown, X, Check, ClipboardList,
  ShoppingBag, Lock,
} from 'lucide-react'
import {
  addStockItem, updateQuantity, toggleShoppingList,
  deleteStockItem, markAsBought, addEsgotadosToList,
} from './actions'
import type { getEstoqueData } from '@/queries/estoque'

type EstoqueData = NonNullable<Awaited<ReturnType<typeof getEstoqueData>>>
type StockTab    = 'casa' | 'pessoal'
type StockStatus = 'ok' | 'baixo' | 'crítico' | 'esgotado'
type StockItem   = EstoqueData['casa'][number]

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'rolo', 'cx', 'pct']
const CATEGORIES_CASA    = ['Limpeza', 'Banheiro', 'Alimentos', 'Outros']
const CATEGORIES_PESSOAL = ['Higiene', 'Farmácia', 'Outros']

function getStatus(qty: number, min: number): StockStatus {
  if (qty === 0)        return 'esgotado'
  if (qty < min * 0.5) return 'crítico'
  if (qty < min)       return 'baixo'
  return 'ok'
}

const statusStyle: Record<StockStatus, { badge: string; row: string }> = {
  ok:       { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', row: ''                          },
  baixo:    { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       row: 'bg-amber-500/5'            },
  crítico:  { badge: 'bg-red-500/20 text-red-400 border-red-500/30',             row: 'bg-red-500/5'              },
  esgotado: { badge: 'bg-zinc-700 text-zinc-400 border-zinc-600',                row: 'bg-zinc-800/80 opacity-75' },
}

const statusLabel: Record<StockStatus, string> = {
  ok: 'OK', baixo: 'Baixo', crítico: 'Crítico', esgotado: 'Esgotado',
}

function QtyBar({ qty, min }: { qty: number; min: number }) {
  const max    = Math.max(min * 2, qty, 1)
  const pct    = Math.min((qty / max) * 100, 100)
  const status = getStatus(qty, min)
  const color  =
    status === 'ok'      ? 'bg-emerald-500' :
    status === 'baixo'   ? 'bg-amber-500'   :
    status === 'crítico' ? 'bg-red-500'     : 'bg-zinc-600'
  return (
    <div className="flex items-center gap-2 min-w-[60px] sm:min-w-[80px]">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-zinc-400 text-xs w-4 text-right">{qty}</span>
    </div>
  )
}

function ShoppingListItem({ item, checked, onToggle, onRemove }: {
  item: StockItem
  checked: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const status = getStatus(item.quantity, item.minQuantity)
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800 border-zinc-700/50 hover:border-zinc-600'
    }`}>
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? 'line-through text-zinc-500' : 'text-white'}`}>
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-zinc-600 text-xs">{item.category}</span>
          <span className="text-zinc-700">·</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyle[status].badge}`}>
            {statusLabel[status]}
          </Badge>
        </div>
      </div>
      <span className="text-zinc-500 text-xs flex-shrink-0">
        {item.quantity}/{item.minQuantity} {item.unit}
      </span>
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function EstoqueClient({ data }: { data: EstoqueData }) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  const { userId, houseId, casa, pessoal } = data

  const [tab,            setTab]            = useState<StockTab>('casa')
  const [search,         setSearch]         = useState('')
  const [filterStatus,   setFilterStatus]   = useState<'todos' | StockStatus>('todos')
  const [filterCategory, setFilterCategory] = useState('todas')
  const [openAdd,        setOpenAdd]        = useState(false)
  const [openDelete,     setOpenDelete]     = useState<string | null>(null)
  const [openDrawer,     setOpenDrawer]     = useState(false)
  const [checkedItems,   setCheckedItems]   = useState<string[]>([])

  const [form, setForm] = useState({
    name: '', category: 'Limpeza', quantity: '', minQuantity: '', unit: 'un',
  })

  const currentItems = tab === 'casa' ? casa : pessoal
  const categories   = tab === 'casa' ? CATEGORIES_CASA : CATEGORIES_PESSOAL

  const filtered = currentItems.filter(i => {
    const bySearch   = i.name.toLowerCase().includes(search.toLowerCase())
    const byStatus   = filterStatus === 'todos' || getStatus(i.quantity, i.minQuantity) === filterStatus
    const byCategory = filterCategory === 'todas' || i.category === filterCategory
    return bySearch && byStatus && byCategory
  })

  const totalItems  = currentItems.length
  const lowCount    = currentItems.filter(i => { const s = getStatus(i.quantity, i.minQuantity); return s === 'baixo' || s === 'crítico' }).length
  const outCount    = currentItems.filter(i => getStatus(i.quantity, i.minQuantity) === 'esgotado').length
  const inListCount = currentItems.filter(i => i.inShoppingList).length

  const allShoppingList = [...casa, ...pessoal].filter(i => i.inShoppingList)
  const casaList        = casa.filter(i => i.inShoppingList)
  const pessoalList     = pessoal.filter(i => i.inShoppingList)

  const handleUpdateQty = (id: string, delta: number) => {
    startTransition(async () => {
      await updateQuantity(id, delta)
      router.refresh()
    })
  }

  const handleToggleList = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleShoppingList(id, current)
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteStockItem(id)
      setOpenDelete(null)
      router.refresh()
    })
  }

  const handleAddItem = () => {
    if (!form.name || !form.quantity || !form.minQuantity) return
    startTransition(async () => {
      await addStockItem({
        houseId,
        userId,
        name:        form.name,
        category:    form.category,
        quantity:    parseInt(form.quantity),
        minQuantity: parseInt(form.minQuantity),
        unit:        form.unit,
        owner:       tab,
      })
      setForm({ name: '', category: categories[0], quantity: '', minQuantity: '', unit: 'un' })
      setOpenAdd(false)
      router.refresh()
    })
  }

  const handleMarkAsBought = () => {
    startTransition(async () => {
      await markAsBought(checkedItems)
      setCheckedItems([])
      router.refresh()
    })
  }

  const handleAddEsgotados = () => {
    startTransition(async () => {
      await addEsgotadosToList(houseId, userId)
      router.refresh()
    })
  }

  const toggleChecked = (id: string) =>
    setCheckedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const deleteItem = currentItems.find(i => i.id === openDelete)

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-white text-xl sm:text-2xl font-bold mx-1 sm:mx-2">Estoque</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              onClick={() => setOpenDrawer(true)}
              className="relative flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Lista de compras</span>
              {allShoppingList.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {allShoppingList.length}
                </span>
              )}
            </button>
            {outCount > 0 && (
              <button
                onClick={handleAddEsgotados}
                className="flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden md:inline">Adicionar esgotados à lista</span>
                <span className="md:hidden">Esgotados</span>
              </button>
            )}
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold gap-1 sm:gap-1.5 text-xs sm:text-sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Novo Produto</span>
                  <span className="xs:hidden">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-md mx-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Produto — {tab === 'casa' ? 'Casa' : 'Pessoal'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Nome do produto</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Detergente" className="bg-zinc-700 border-zinc-600 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-700 border-zinc-600">
                          {categories.map(c => <SelectItem key={c} value={c} className="text-zinc-200">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Unidade</Label>
                      <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                        <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-700 border-zinc-600">
                          {UNITS.map(u => <SelectItem key={u} value={u} className="text-zinc-200">{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Quantidade atual</Label>
                      <Input type="number" min={0} value={form.quantity}
                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder="0" className="bg-zinc-700 border-zinc-600 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Quantidade mínima</Label>
                      <Input type="number" min={1} value={form.minQuantity}
                        onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))}
                        placeholder="1" className="bg-zinc-700 border-zinc-600 text-white" />
                    </div>
                  </div>
                  {form.quantity && form.minQuantity && (
                    <p className="text-zinc-400 text-xs bg-zinc-700 rounded-lg px-3 py-2">
                      Status atual:{' '}
                      <span className={`font-semibold ${
                        getStatus(+form.quantity, +form.minQuantity) === 'ok' ? 'text-emerald-400' :
                        getStatus(+form.quantity, +form.minQuantity) === 'baixo' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {statusLabel[getStatus(+form.quantity, +form.minQuantity)]}
                      </span>
                    </p>
                  )}
                  <Button onClick={handleAddItem} className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold">
                    Adicionar produto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Tab switcher ──────────────────────────────────────────── */}
        <div className="flex gap-1 sm:gap-2 bg-zinc-800 p-1 rounded-2xl w-full sm:w-fit">
          {([
            { key: 'casa',    label: 'Casa',    fullLabel: 'Estoque da Casa',  icon: Home },
            { key: 'pessoal', label: 'Pessoal', fullLabel: 'Estoque Pessoal', icon: User },
          ] as const).map(({ key, label, fullLabel, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setFilterCategory('todas'); setFilterStatus('todos'); setSearch('') }}
              className={`flex items-center justify-center gap-2 flex-1 sm:flex-none sm:px-5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? key === 'casa'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline">{fullLabel}</span>
              <span className="md:hidden">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Summary cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total',     fullLabel: 'Total de itens',      value: totalItems,  icon: Package,      accent: 'text-zinc-300',    border: 'border-zinc-700'       },
            { label: 'Baixo',     fullLabel: 'Estoque baixo',       value: lowCount,    icon: TrendingDown, accent: 'text-amber-400',   border: 'border-amber-500/20'   },
            { label: 'Esgotados', fullLabel: 'Esgotados',           value: outCount,    icon: PackageX,     accent: 'text-red-400',     border: 'border-red-500/20'     },
            { label: 'Na lista',  fullLabel: 'Na lista de compras', value: inListCount, icon: ShoppingCart, accent: 'text-blue-400',    border: 'border-blue-500/20'    },
          ].map(({ label, fullLabel, value, icon: Icon, accent, border }) => (
            <Card key={label} className={`bg-zinc-800 border ${border}`}>
              <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent}`} />
                  <CardDescription className="text-zinc-400 text-xs sm:text-sm">
                    <span className="hidden sm:inline">{fullLabel}</span>
                    <span className="sm:hidden">{label}</span>
                  </CardDescription>
                </div>
                <CardTitle className={`text-xl sm:text-2xl ${accent}`}>{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* ── Filters + Search ──────────────────────────────────────── */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:flex-wrap">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full sm:w-48 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
            />
          </div>
          <Separator orientation="vertical" className="hidden sm:block data-[orientation=vertical]:h-5 bg-zinc-700" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['todos','ok','baixo','crítico','esgotado'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize flex-shrink-0 ${
                  filterStatus === s ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                {s === 'todos' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
          </div>
          <Separator orientation="vertical" className="hidden sm:block data-[orientation=vertical]:h-5 bg-zinc-700" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['todas', ...categories].map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                  filterCategory === c ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                {c === 'todas' ? 'Todas' : c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs w-[30%] min-w-[120px]">Produto</TableHead>
                  <TableHead className="text-zinc-500 text-xs hidden sm:table-cell">Categoria</TableHead>
                  <TableHead className="text-zinc-500 text-xs min-w-[140px]">Quantidade</TableHead>
                  <TableHead className="text-zinc-500 text-xs hidden md:table-cell">Mínimo</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Status</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-center hidden sm:table-cell">Lista</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-12">
                      <PackageX className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(item => {
                    const status = getStatus(item.quantity, item.minQuantity)
                    const style  = statusStyle[status]
                    return (
                      <TableRow key={item.id} className={`border-zinc-700/50 hover:bg-zinc-700/30 transition-colors ${style.row}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {status === 'esgotado' && <PackageX className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
                            {status === 'crítico'  && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                            {status === 'baixo'    && <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                            {status === 'ok'       && <Package className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
                            <span className={`text-sm font-medium ${status === 'esgotado' ? 'text-zinc-500' : 'text-white'}`}>
                              {item.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full">{item.category}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={() => handleUpdateQty(item.id, -1)}
                              className="w-5 h-5 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <QtyBar qty={item.quantity} min={item.minQuantity} />
                            <button
                              onClick={() => handleUpdateQty(item.id, 1)}
                              className="w-5 h-5 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-zinc-600 text-xs hidden sm:inline">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-zinc-500 text-sm">{item.minQuantity} {item.unit}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 sm:px-2 py-0.5 ${style.badge}`}>
                            {statusLabel[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <button
                            onClick={() => handleToggleList(item.id, item.inShoppingList)}
                            className={`transition-colors ${item.inShoppingList ? 'text-blue-400 hover:text-blue-300' : 'text-zinc-600 hover:text-zinc-400'}`}
                          >
                            {item.inShoppingList ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleList(item.id, item.inShoppingList)}
                              className={`sm:hidden transition-colors ${item.inShoppingList ? 'text-blue-400 hover:text-blue-300' : 'text-zinc-600 hover:text-zinc-400'}`}
                            >
                              {item.inShoppingList ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setOpenDelete(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Low stock alert ───────────────────────────────────────── */}
        {lowCount + outCount > 0 && (
          <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3 sm:px-5 py-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-300 text-xs sm:text-sm">
                <span className="font-semibold">{lowCount + outCount} produto{lowCount + outCount > 1 ? 's' : ''}</span>
                {' '}precisam de reposição neste estoque.
              </span>
            </div>
            <button
              onClick={handleAddEsgotados}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Enviar todos para lista</span>
              <span className="xs:hidden">Add lista</span>
            </button>
          </div>
        )}

        {/* ── Shopping List Drawer ──────────────────────────────────── */}
        {openDrawer && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setOpenDrawer(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  <h2 className="text-white font-bold text-base sm:text-lg">Lista de Compras</h2>
                  {allShoppingList.length > 0 && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                      {allShoppingList.length} itens
                    </span>
                  )}
                </div>
                <button onClick={() => setOpenDrawer(false)} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
                {allShoppingList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <ShoppingCart className="w-12 h-12 text-zinc-700" />
                    <p className="text-zinc-500 text-sm text-center">Nenhum item na lista.<br />Adicione produtos com estoque baixo!</p>
                  </div>
                ) : (
                  <>
                    {casaList.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Home className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Da Casa</span>
                          <span className="text-zinc-600 text-xs">({casaList.length})</span>
                        </div>
                        {casaList.map(item => (
                          <ShoppingListItem
                            key={item.id}
                            item={item}
                            checked={checkedItems.includes(item.id)}
                            onToggle={() => toggleChecked(item.id)}
                            onRemove={() => handleToggleList(item.id, true)}
                          />
                        ))}
                      </div>
                    )}
                    {pessoalList.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Lock className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Pessoal</span>
                          <span className="text-zinc-600 text-xs">({pessoalList.length})</span>
                        </div>
                        {pessoalList.map(item => (
                          <ShoppingListItem
                            key={item.id}
                            item={item}
                            checked={checkedItems.includes(item.id)}
                            onToggle={() => toggleChecked(item.id)}
                            onRemove={() => handleToggleList(item.id, true)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {checkedItems.length > 0 ? (
                <div className="px-4 sm:px-5 py-4 border-t border-zinc-800 space-y-2">
                  <p className="text-zinc-500 text-xs text-center">
                    {checkedItems.length} item{checkedItems.length > 1 ? 's' : ''} marcado{checkedItems.length > 1 ? 's' : ''} como comprado{checkedItems.length > 1 ? 's' : ''}
                  </p>
                  <Button onClick={handleMarkAsBought} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar compra e repor estoque
                  </Button>
                </div>
              ) : allShoppingList.length > 0 ? (
                <div className="px-4 sm:px-5 py-4 border-t border-zinc-800">
                  <p className="text-zinc-600 text-xs text-center">Marque os itens conforme for comprando</p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* ── Delete dialog ─────────────────────────────────────────── */}
        <Dialog open={openDelete !== null} onOpenChange={() => setOpenDelete(null)}>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-sm mx-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Remover produto?</DialogTitle>
            </DialogHeader>
            <p className="text-zinc-400 text-sm">
              Tem certeza que deseja remover{' '}
              <span className="text-white font-medium">{deleteItem?.name}</span>{' '}
              do estoque? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenDelete(null)} className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700">
                Cancelar
              </Button>
              <Button onClick={() => openDelete && handleDelete(openDelete)} className="flex-1 bg-red-600 hover:bg-red-500 text-white">
                Remover
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}