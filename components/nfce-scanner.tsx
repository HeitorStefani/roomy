'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ScanLine, Loader2, CheckCircle2, AlertCircle, ShoppingCart,
  Store, CreditCard, Package, X, Check, ChevronRight,
  RefreshCw, Box, PackagePlus, ChevronLeft, QrCode,
  Utensils, Car, ShoppingBag, Heart, Gamepad2, DollarSign, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { addHouseBill, addPersonalTransaction } from '@/app/(dashboard-pages)/contas/actions'
import { restockItemsByName, addStockItem, checkStockMatches } from '@/app/(dashboard-pages)/estoque/actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type NfceItem = {
  codigo: string | null; descricao: string | null
  quantidade: number | null; unidade: string | null
  valor_unit: number | null; valor_total: number | null
}
type NfceData = {
  estabelecimento: string | null; cnpj: string | null
  total_itens: number; valor_pagar: number | null
  forma_pagamento: string | null; itens: NfceItem[]
}
type RestockResult = { stockName: string; notaName: string; added: number }
type UnmatchedItem = { index: number; descricao: string; quantidade: number; unidade: string }
type NewStockForm  = { category: string; minQuantity: string; unit: string }
type Morador       = { id: string; name: string; avatar_color: string }
type Mode          = 'casa' | 'pessoal'
type Step          = 'scan' | 'loading' | 'select-items' | 'new-items' | 'saving' | 'success' | 'error'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'rolo', 'cx', 'pct']
const CATEGORIES_CASA    = ['Limpeza', 'Banheiro', 'Alimentos', 'Sonhos Eróticos', 'Drogas', 'Outros']
const CATEGORIES_PESSOAL = ['Higiene', 'Farmácia', 'Alimentos', 'Limpeza', 'Outros']

// ── Categorias de transação (mesmo padrão do projeto) ─────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'food',      label: 'Alimentação', icon: 'food',      color: 'text-orange-400' },
  { value: 'transport', label: 'Transporte',  icon: 'transport', color: 'text-blue-400'   },
  { value: 'health',    label: 'Saúde',       icon: 'health',    color: 'text-rose-400'   },
  { value: 'shopping',  label: 'Compras',     icon: 'shopping',  color: 'text-purple-400' },
  { value: 'leisure',   label: 'Lazer',       icon: 'leisure',   color: 'text-teal-400'   },
  { value: 'income',    label: 'Renda',       icon: 'income',    color: 'text-emerald-400'},
  { value: 'other',     label: 'Outros',      icon: 'other',     color: 'text-zinc-400'   },
]

const categoryIcon: Record<string, LucideIcon> = {
  food: Utensils, transport: Car, health: Heart,
  shopping: ShoppingBag, leisure: Gamepad2, income: DollarSign, other: MoreHorizontal,
}
const categoryBg: Record<string, string> = {
  food: 'bg-orange-500/10', transport: 'bg-blue-500/10', health: 'bg-rose-500/10',
  shopping: 'bg-purple-500/10', leisure: 'bg-teal-500/10', income: 'bg-emerald-500/10', other: 'bg-zinc-700',
}

// ── QR Scanner ────────────────────────────────────────────────────────────────

function QrScanner({ onResult, active }: { onResult: (url: string) => void; active: boolean }) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>(0)
  const calledRef  = useRef(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [ready,    setReady]    = useState(false)
  const [facing,   setFacing]   = useState<'environment' | 'user'>('environment')

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    calledRef.current = false
    setReady(false)
  }, [])

  const startCamera = useCallback(async (facingMode: 'environment' | 'user') => {
    stop()
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream

      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setReady(true)

      const hasBarcodeDetector = 'BarcodeDetector' in window

      if (hasBarcodeDetector) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (!streamRef.current || calledRef.current) return
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0 && codes[0].rawValue?.startsWith('http')) {
              calledRef.current = true
              stop()
              onResult(codes[0].rawValue)
              return
            }
          } catch {}
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      } else {
        const jsQR = (await import('jsqr')).default
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const scan = () => {
          if (!streamRef.current || calledRef.current) return
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height)
            if (code?.data?.startsWith('http')) {
              calledRef.current = true
              stop()
              onResult(code.data)
              return
            }
          }
          setTimeout(() => { rafRef.current = requestAnimationFrame(scan) }, 300)
        }
        rafRef.current = requestAnimationFrame(scan)
      }
    } catch (e) {
      console.error('[Scanner]', e)
      setCamError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }, [stop, onResult])

  useEffect(() => {
    if (!active) { stop(); return }
    startCamera(facing)
    return () => { stop() }
  }, [active, facing, startCamera, stop])

  const toggleCamera = () => {
    setFacing(prev => prev === 'environment' ? 'user' : 'environment')
  }

  if (camError) return (
    <div className="flex flex-col items-center justify-center h-52 gap-3 bg-zinc-800 rounded-xl border border-dashed border-zinc-700">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-zinc-400 text-xs text-center px-6">{camError}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 260 }}>
        <video
          ref={videoRef}
          className="w-full object-cover"
          muted
          playsInline
          style={{ display: 'block', maxHeight: 340 }}
        />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}

        {ready && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" style={{
              maskImage: 'radial-gradient(ellipse 200px 200px at center, transparent 48%, black 62%)',
              WebkitMaskImage: 'radial-gradient(ellipse 200px 200px at center, transparent 48%, black 62%)',
            }} />
            <div className="relative w-[200px] h-[200px]">
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
              ].map((c, i) => <div key={i} className={`absolute w-7 h-7 border-violet-400 ${c}`} />)}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-[nfcescan_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Botão de troca de câmera */}
        <button
          onClick={toggleCamera}
          className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
          title={facing === 'environment' ? 'Câmera frontal' : 'Câmera traseira'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <p className="absolute bottom-2 left-0 right-0 text-center text-zinc-400 text-[10px]">
          Aponte para o QR code da nota fiscal
        </p>
        <style>{`@keyframes nfcescan{0%,100%{top:10px;opacity:.4}50%{top:195px;opacity:1}}`}</style>
      </div>

      {/* Indicador de câmera ativa */}
      <div className="flex gap-2">
        {(['environment', 'user'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFacing(f)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${
              facing === f
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'environment' ? '📷 Traseira' : '🤳 Frontal'}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function NfceScanner({ userId, houseId, moradores, mode }: {
  userId: string; houseId: string; moradores: Morador[]; mode: Mode
}) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  const [open,           setOpen]           = useState(false)
  const [step,           setStep]           = useState<Step>('scan')
  const [data,           setData]           = useState<NfceData | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [selectedItems,  setSelectedItems]  = useState<Set<number>>(new Set())
  const [involved,       setInvolved]       = useState<string[]>([])
  const [restockResults, setRestockResults] = useState<RestockResult[]>([])
  const [unmatched,      setUnmatched]      = useState<UnmatchedItem[]>([])
  const [category,       setCategory]       = useState<string>('food')
  const [newForms,       setNewForms]       = useState<Record<number, NewStockForm>>({})
  const [createNew,      setCreateNew]      = useState<Set<number>>(new Set())

  const isCasa = mode === 'casa'
  const accent = isCasa ? 'text-blue-400'   : 'text-violet-400'
  const bgBtn  = isCasa ? 'bg-blue-600 hover:bg-blue-500' : 'bg-violet-600 hover:bg-violet-500'
  const tagCls = isCasa ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'
  const cats   = isCasa ? CATEGORIES_CASA : CATEGORIES_PESSOAL

  const reset = () => {
    setStep('scan'); setData(null); setError(null)
    setSelectedItems(new Set()); setInvolved([])
    setRestockResults([]); setUnmatched([])
    setNewForms({}); setCreateNew(new Set())
    setCategory('food')
  }

  const handleClose = (v: boolean) => { if (!v) reset(); setOpen(v) }

  // ── Step 1: QR → fetch ───────────────────────────────────────────────────
  const handleQrResult = async (url: string) => {
    setStep('loading')
    try {
      const res  = await fetch(`/api/nfce?url=${encodeURIComponent(url)}`)
      const json = await res.json()
      if (!res.ok || json.status !== 'success') {
        setError(json.error ?? 'Erro ao processar a nota.'); setStep('error'); return
      }
      const nfce: NfceData = json.nfce_data
      setData(nfce)
      setSelectedItems(new Set(nfce.itens.map((_, i) => i)))
      if (isCasa) setInvolved(moradores.map(m => m.id))
      setStep('select-items')
    } catch {
      setError('Não foi possível processar a nota. Tente novamente.')
      setStep('error')
    }
  }

  // ── Step 2: seleção ──────────────────────────────────────────────────────
  const toggleItem = (i: number) =>
    setSelectedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  const toggleAll = () =>
    setSelectedItems(prev => prev.size === data!.itens.length ? new Set() : new Set(data!.itens.map((_, i) => i)))

  const totalBruto = data
  ? data.itens.reduce((s, item) => s + (item.valor_total ?? 0), 0)
  : 0

  const descontoFator = (data?.valor_pagar != null && totalBruto > 0)
    ? data.valor_pagar / totalBruto  // ex: 58,38 / 68,07 = 0.857...
    : 1

  const totalSelecionado = data
    ? data.itens
        .filter((_, i) => selectedItems.has(i))
        .reduce((s, item) => s + (item.valor_total ?? 0), 0) * descontoFator
    : 0

  // ── Avança para new-items ou direto para saving ──────────────────────────
  const handleProceed = async () => {
    if (!data) return
    setStep('loading')

    const itensEscolhidos = data.itens.filter((_, i) => selectedItems.has(i))
    const payload = itensEscolhidos
      .filter(i => i.descricao)
      .map(i => ({ name: i.descricao!, quantity: i.quantidade ?? 1 }))

    try {
      const { unmatched: um } = await checkStockMatches(houseId, userId, payload)

      if (um.length > 0) {
        const unmatchedItems: UnmatchedItem[] = um.map((name: string, idx: number) => {
          const orig = itensEscolhidos.find(i => i.descricao === name)
          return {
            index:      idx,
            descricao:  name,
            quantidade: orig?.quantidade ?? 1,
            unidade:    orig?.unidade ?? 'un',
          }
        })
        setUnmatched(unmatchedItems)
        const forms: Record<number, NewStockForm> = {}
        unmatchedItems.forEach((_, i) => { forms[i] = { category: cats[0], minQuantity: '1', unit: 'un' } })
        setNewForms(forms)
        setCreateNew(new Set(unmatchedItems.map((_, i) => i)))
        setStep('new-items')
      } else {
        handleSave([])
      }
    } catch {
      handleSave([])
    }
  }

  // ── Step 3: salvar ───────────────────────────────────────────────────────
  const handleSave = (itemsToCreate: UnmatchedItem[]) => {
    if (!data) return
    setStep('saving')

    startTransition(async () => {
      const itensEscolhidos = data.itens.filter((_, i) => selectedItems.has(i))
      const valorFinal      = totalSelecionado || data.valor_pagar || 0
      const descBase        = data.estabelecimento
        ? `Compras — ${data.estabelecimento.split(/\s+/).slice(0, 3).join(' ')}`
        : 'Compras no mercado'

      if (!isCasa) {
        await addPersonalTransaction({
          userId, description: descBase,
          category,
          amount: valorFinal,
          type: 'expense',
          date: new Date().toISOString().split('T')[0],
        })
      } else {
        const sel = involved.length > 0 ? involved : [userId]
        await addHouseBill({
          houseId, userId, title: descBase, total: valorFinal,
          dueDate: new Date().toISOString().split('T')[0],
          involved: sel.map(id => ({ userId: id, amount: valorFinal / sel.length })),
          // Passa os itens selecionados com valor proporcional ao desconto
          items: itensEscolhidos
            .filter(i => i.descricao)
            .map(i => ({
              descricao:   i.descricao!,
              quantidade:  i.quantidade,
              unidade:     i.unidade,
              valor_unit:  i.valor_unit,
              valor_total: i.valor_total != null ? i.valor_total * descontoFator : null,
            })),
        })
      }

      const results = await restockItemsByName(
        houseId, userId,
        itensEscolhidos.filter(i => i.descricao).map(i => ({ name: i.descricao!, quantity: i.quantidade ?? 1 }))
      )
      setRestockResults(results)

      for (const item of itemsToCreate) {
        const form = newForms[item.index]
        if (!form) continue
        await addStockItem({
          houseId, userId,
          name:        item.descricao,
          category:    form.category,
          quantity:    item.quantidade,
          minQuantity: parseInt(form.minQuantity) || 1,
          unit:        form.unit,
          owner:       mode,
        })
      }

      setStep('success')
      router.refresh()
    })
  }

  const handleConfirmNew = () => {
    const toCreate = unmatched.filter((_, i) => createNew.has(i))
    handleSave(toCreate)
  }

  const activeCat = CATEGORY_OPTIONS.find(c => c.value === category)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-white border-zinc-500 bg-zinc-700 gap-1.5 text-xs">
          <QrCode className="w-3.5 h-3.5" /> Escanear NFC-e
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-900 border-zinc-800 text-white w-[calc(100vw-2rem)] max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <ScanLine className={`w-4 h-4 ${accent}`} />
            Escanear Nota Fiscal
            <span className={`mr-auto text-[10px] font-normal px-2 py-0.5 rounded-full ${tagCls}`}>
              {isCasa ? 'Casa' : 'Pessoal'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* SCAN */}
          <div style={{ display: step === 'scan' ? 'block' : 'none' }}>
            <QrScanner onResult={handleQrResult} active={step === 'scan'} />
          </div>

          {/* LOADING */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
              </div>
              <p className="text-white font-medium">Processando nota...</p>
              <p className="text-zinc-500 text-xs">Pode levar até 30 segundos</p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-white font-medium">Erro ao processar</p>
                <p className="text-zinc-500 text-xs text-center">{error}</p>
              </div>
              <Button onClick={reset} variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
              </Button>
            </div>
          )}

          {/* SELECT-ITEMS */}
          {step === 'select-items' && data && (
            <>
              {/* Info da loja */}
              <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3 border border-zinc-700/50">
                <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{data.estabelecimento ?? 'Estabelecimento'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {data.forma_pagamento && (
                      <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />{data.forma_pagamento}
                      </span>
                    )}
                    <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                      <Package className="w-3 h-3" />{data.total_itens} itens
                    </span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold text-sm flex-shrink-0">
                  {data.valor_pagar ? fmt(data.valor_pagar) : '—'}
                </span>
              </div>

              {/* Lista de itens */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                    Itens ({selectedItems.size}/{data.itens.length})
                  </span>
                  <button onClick={toggleAll} className="text-zinc-400 hover:text-white text-[10px] transition-colors">
                    {selectedItems.size === data.itens.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
                <div className="bg-zinc-800 rounded-xl border border-zinc-700/50 overflow-hidden max-h-52 overflow-y-auto">
                  <div className="divide-y divide-zinc-700/40">
                    {data.itens.map((item, i) => {
                      const sel = selectedItems.has(i)
                      return (
                        <button key={i} onClick={() => toggleItem(i)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${sel ? 'hover:bg-zinc-700/30' : 'opacity-40 hover:opacity-60'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'}`}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <ShoppingCart className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{item.descricao}</p>
                            {item.quantidade != null && (
                              <p className="text-zinc-600 text-[10px]">
                                {item.quantidade} {item.unidade ?? 'un'}{item.valor_unit ? ` × ${fmt(item.valor_unit)}` : ''}
                              </p>
                            )}
                          </div>
                          <span className="text-zinc-300 text-xs font-medium flex-shrink-0">
                            {item.valor_total ? fmt(item.valor_total) : '—'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {selectedItems.size > 0 && (
                  <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-2.5 border border-zinc-700/50">
                    <span className="text-zinc-400 text-xs">{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}</span>
                    <span className="text-white font-bold text-sm">{fmt(totalSelecionado)}</span>
                  </div>
                )}
              </div>

              {/* Moradores — apenas casa */}
              {isCasa && (
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs">Dividir entre</Label>
                  <div className="flex flex-wrap gap-2">
                    {moradores.map(m => {
                      const sel = involved.includes(m.id)
                      return (
                        <button key={m.id}
                          onClick={() => setInvolved(p => sel ? p.filter(id => id !== m.id) : [...p, m.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sel ? `${m.avatar_color} text-white` : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'}`}>
                          {sel && <Check className="w-3 h-3" />}{m.name.split(' ')[0]}
                        </button>
                      )
                    })}
                  </div>
                  {involved.length > 0 && totalSelecionado > 0 && (
                    <p className="text-zinc-500 text-xs bg-zinc-800 rounded-lg px-3 py-2">
                      Cada um paga: <span className="text-white font-semibold">{fmt(totalSelecionado / involved.length)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Categoria da transação — apenas pessoal */}
              {!isCasa && (
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs">Categoria da transação</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CATEGORY_OPTIONS.map(cat => {
                      const Icon   = categoryIcon[cat.icon]
                      const active = category === cat.value
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition-all border ${
                            active
                              ? `${categoryBg[cat.icon]} border-zinc-600 ${cat.color}`
                              : 'bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? cat.color : 'text-zinc-500'}`} />
                          <span className="text-[9px] font-medium leading-tight">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={reset} variant="outline" className="bg-zinc-800 border px-3">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={handleProceed}
                  disabled={selectedItems.size === 0 || (isCasa && involved.length === 0)}
                  className={`flex-1 ${bgBtn} text-white gap-1.5 text-xs`}>
                  <ChevronRight className="w-3.5 h-3.5" />
                  {isCasa
                    ? 'Criar conta e reestocar'
                    : `Salvar — ${activeCat?.label ?? 'Outros'}`
                  }
                </Button>
              </div>
            </>
          )}

          {/* NEW-ITEMS */}
          {step === 'new-items' && (
            <>
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <PackagePlus className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 text-xs font-medium">
                    {unmatched.length} item{unmatched.length > 1 ? 's' : ''} não encontrado{unmatched.length > 1 ? 's' : ''} no estoque
                  </p>
                  <p className="text-amber-400/60 text-[10px] mt-0.5">Selecione os que deseja cadastrar e preencha as informações.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {unmatched.map((item, i) => {
                  const active = createNew.has(i)
                  const form   = newForms[i] ?? { category: cats[0], minQuantity: '1', unit: 'un' }
                  return (
                    <div key={i} className={`rounded-xl border transition-all ${active ? 'bg-zinc-800 border-zinc-700/50' : 'bg-zinc-800/40 border-zinc-800 opacity-50'}`}>
                      <button
                        onClick={() => setCreateNew(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${active ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'}`}>
                          {active && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <Box className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{item.descricao}</p>
                          <p className="text-zinc-600 text-[10px]">{item.quantidade} {item.unidade}</p>
                        </div>
                        {active
                          ? <span className="text-violet-400 text-[10px]">Cadastrar</span>
                          : <span className="text-zinc-600 text-[10px]">Ignorar</span>
                        }
                      </button>

                      {active && (
                        <div className="px-4 pb-3 pt-0 grid grid-cols-3 gap-2 border-t border-zinc-700/50">
                          <div className="col-span-3 space-y-1 pt-2">
                            <Label className="text-zinc-500 text-[10px]">Categoria</Label>
                            <Select value={form.category} onValueChange={v => setNewForms(p => ({ ...p, [i]: { ...p[i], category: v } }))}>
                              <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-zinc-700 border-zinc-600">
                                {cats.map(c => <SelectItem key={c} value={c} className="text-zinc-200 text-xs">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1 space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Mínimo</Label>
                            <Input
                              type="number" min={1}
                              value={form.minQuantity}
                              onChange={e => setNewForms(p => ({ ...p, [i]: { ...p[i], minQuantity: e.target.value } }))}
                              className="bg-zinc-700 border-zinc-600 text-white text-xs h-8"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-zinc-500 text-[10px]">Unidade</Label>
                            <Select value={form.unit} onValueChange={v => setNewForms(p => ({ ...p, [i]: { ...p[i], unit: v } }))}>
                              <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-zinc-700 border-zinc-600">
                                {UNITS.map(u => <SelectItem key={u} value={u} className="text-zinc-200 text-xs">{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => setStep('select-items')} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={handleConfirmNew} className={`flex-1 ${bgBtn} text-white gap-1.5 text-xs`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {createNew.size > 0 ? `Salvar e criar ${createNew.size} item${createNew.size > 1 ? 's' : ''}` : 'Salvar sem criar'}
                </Button>
              </div>
            </>
          )}

          {/* SAVING */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
              <p className="text-white font-medium">Salvando e reestocando...</p>
              <p className="text-zinc-500 text-xs">Aguarde um momento</p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-white font-medium">{isCasa ? 'Conta criada e dividida!' : 'Transação salva!'}</p>
                <p className="text-zinc-500 text-xs">
                  {isCasa
                    ? `Dividido entre ${involved.length} morador${involved.length > 1 ? 'es' : ''}`
                    : `Categoria: ${activeCat?.label ?? category}`
                  }
                </p>
              </div>

              {restockResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider px-1 flex items-center gap-1.5">
                    <Box className="w-3 h-3 text-emerald-400" />
                    {restockResults.length} item{restockResults.length > 1 ? 's' : ''} reestocado{restockResults.length > 1 ? 's' : ''}
                  </p>
                  <div className="bg-zinc-800 rounded-xl border border-zinc-700/50 overflow-hidden max-h-36 overflow-y-auto">
                    {restockResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-700/40 last:border-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{r.stockName}</p>
                          <p className="text-zinc-600 text-[10px]">da nota: {r.notaName}</p>
                        </div>
                        <span className="text-emerald-400 text-xs font-semibold">+{r.added}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {restockResults.length === 0 && (
                <p className="text-zinc-600 text-xs text-center bg-zinc-800 rounded-xl px-4 py-3">
                  Nenhum item foi reestocado automaticamente.
                </p>
              )}

              <Button onClick={() => handleClose(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                Fechar
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}