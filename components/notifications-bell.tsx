'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bell, BanknoteIcon, CheckSquare, Package, ChevronRight } from 'lucide-react'
import { getNotifications, type Notification } from '@/queries/notifications'

const typeIcon: Record<Notification['type'], any> = {
  bill: BanknoteIcon, task: CheckSquare, stock: Package,
}
const typeColor: Record<Notification['type'], string> = {
  bill: 'text-blue-400', task: 'text-yellow-400', stock: 'text-orange-400',
}
const typeBg: Record<Notification['type'], string> = {
  bill: 'bg-blue-500/10', task: 'bg-yellow-500/10', stock: 'bg-orange-500/10',
}
const urgencyDot: Record<Notification['urgency'], string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-zinc-500',
}

export function NotificationsBell({ initialCount }: { initialCount: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const handleOpen = () => {
    setOpen(true)
    setLoading(true)
    startTransition(async () => {
      const data = await getNotifications()
      setNotifications(data)
      setLoading(false)
    })
  }

  const handleNavigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <Bell className={`w-5 h-5 ${initialCount > 0 ? 'text-white' : 'text-zinc-400'}`} />
        {initialCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
            {initialCount > 9 ? '9+' : initialCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-zinc-800">
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Bell className="w-4 h-4 text-zinc-400" />
              Notificações
              {notifications.length > 0 && (
                <span className="ml-auto text-xs font-normal text-zinc-500">
                  {notifications.length} ativa{notifications.length > 1 ? 's' : ''}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm">Tudo em dia!</p>
                <p className="text-zinc-600 text-xs">Nenhuma notificação pendente.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {notifications.map(n => {
                  const Icon = typeIcon[n.type]
                  return (
                    <button key={n.id} onClick={() => handleNavigate(n.href)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-800/60 transition-colors text-left group">
                      <div className={`w-9 h-9 rounded-xl ${typeBg[n.type]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${typeColor[n.type]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgencyDot[n.urgency]}`} />
                          <p className="text-white text-sm font-medium truncate">{n.title}</p>
                        </div>
                        <p className="text-zinc-500 text-xs truncate">{n.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0 mt-2.5" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!loading && notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-zinc-800 flex items-center gap-4">
              {(['high', 'medium', 'low'] as const).map(u => (
                <div key={u} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${urgencyDot[u]}`} />
                  <span className="text-zinc-600 text-[10px]">{{ high: 'Urgente', medium: 'Atenção', low: 'Info' }[u]}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}