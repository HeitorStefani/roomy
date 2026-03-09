'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Plus, CheckCircle2, Clock, AlertCircle, RotateCcw,
  ChevronRight, History, User, Flame, ArrowRight,
  CalendarClock, Repeat2, ListFilter, GripVertical,
  Pencil, CalendarDays, Lock, Loader2,
} from 'lucide-react'
import { moveTask, addTask, editTask } from './actions'
import type { getTarefasData } from '@/queries/tarefas'

type TarefasData   = NonNullable<Awaited<ReturnType<typeof getTarefasData>>>
type Status        = 'todo' | 'doing' | 'done'
type Priority      = 'alta' | 'média' | 'baixa'
type Recurrence    = 'única' | 'diária' | '2x-semana' | 'semanal' | 'quinzenal' | 'mensal'

type Task        = TarefasData['tasks'][number]
type Morador     = TarefasData['moradores'][number]
type HistoryItem = TarefasData['history'][number]

const ROOMS = ['Cozinha', 'Banheiro', 'Sala', 'Quintal', 'Geral']

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  'única':      'Uma vez',
  'diária':     'Diária',
  '2x-semana':  '2x por semana',
  'semanal':    'Semanal',
  'quinzenal':  'Quinzenal',
  'mensal':     'Mensal',
}

const priorityStyle: Record<Priority, string> = {
  alta:  'bg-red-500/20 text-red-400 border-red-500/30',
  média: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-zinc-700 text-zinc-400 border-zinc-600',
}

const columns: { key: Status; label: string; icon: any; accent: string; bg: string; dropBg: string }[] = [
  { key: 'todo',  label: 'A Fazer', icon: Clock,        accent: 'text-zinc-400',    bg: 'border-zinc-700',       dropBg: 'bg-zinc-700/30'    },
  { key: 'doing', label: 'Fazendo', icon: Flame,        accent: 'text-amber-400',   bg: 'border-amber-500/30',   dropBg: 'bg-amber-500/10'   },
  { key: 'done',  label: 'Feito',   icon: CheckCircle2, accent: 'text-emerald-400', bg: 'border-emerald-500/30', dropBg: 'bg-emerald-500/10' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDaysUntil(dueDateStr: string): number | null {
  if (!dueDateStr) return null
  const due   = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function DueDateBadge({ dueDateStr, overdue }: { dueDateStr: string; overdue: boolean }) {
  const days = getDaysUntil(dueDateStr)
  if (days === null) return null

  const formatted = new Date(dueDateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  if (overdue || days < 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
        <CalendarDays className="w-3 h-3" /> {formatted} · {Math.abs(days)}d atraso
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
        <CalendarDays className="w-3 h-3" /> Hoje
      </span>
    )
  }
  if (days === 1) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-300 font-medium">
        <CalendarDays className="w-3 h-3" /> Amanhã
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
      <CalendarDays className="w-3 h-3" /> {formatted} · {days}d
    </span>
  )
}

// ── Task Form (shared between Add and Edit) ───────────────────────────────────
type TaskForm = {
  title: string
  room: string
  assignedTo: string
  priority: Priority
  recurrence: Recurrence
  dueDate: string
  rotationMembers: string[]
}

function TaskFormFields({
  form, setForm, moradores,
}: {
  form: TaskForm
  setForm: (fn: (f: TaskForm) => TaskForm) => void
  moradores: Morador[]
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <Label className="text-zinc-400 text-xs">Título</Label>
        <Input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Ex: Limpar cozinha"
          className="bg-zinc-700 border-zinc-600 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Cômodo</Label>
          <Select value={form.room} onValueChange={v => setForm(f => ({ ...f, room: v }))}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-700 border-zinc-600">
              {ROOMS.map(r => <SelectItem key={r} value={r} className="text-zinc-200">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Responsável</Label>
          <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-700 border-zinc-600">
              {moradores.map((m: Morador) => (
                <SelectItem key={m.id} value={m.id} className="text-zinc-200">{m.name.split(' ')[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Prioridade</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-700 border-zinc-600">
              {(['alta', 'média', 'baixa'] as Priority[]).map(p => (
                <SelectItem key={p} value={p} className="text-zinc-200 capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-zinc-400 text-xs">Recorrência</Label>
          <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v as Recurrence }))}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-700 border-zinc-600">
              {(Object.entries(RECURRENCE_LABELS) as [Recurrence, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-zinc-200">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-zinc-400 text-xs">Prazo</Label>
        <Input
          type="date"
          value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          className="bg-zinc-700 border-zinc-600 text-white"
        />
      </div>

      {form.recurrence !== 'única' && (
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Participantes do rodízio</Label>
          <div className="flex flex-wrap gap-2">
            {moradores.map((m: Morador) => {
              const selected = form.rotationMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    rotationMembers: selected
                      ? f.rotationMembers.filter(id => id !== m.id)
                      : [...f.rotationMembers, m.id],
                  }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    selected
                      ? `${m.avatar_color} text-white border-transparent`
                      : 'bg-zinc-700 text-zinc-400 border-zinc-600 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.avatar_color}`} />
                  {m.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
          <p className="text-zinc-600 text-[10px]">
            {form.rotationMembers.length === 0
              ? 'Nenhum selecionado — todos participarão'
              : `${form.rotationMembers.length} participante(s) no rodízio`}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCardInner({
  task, moradores, userId, onMove, onEdit, isDragOverlay = false, dragListeners, dragAttributes,
}: {
  task: Task
  moradores: Morador[]
  userId: string
  onMove: (id: string, status: Status) => void
  onEdit: (task: Task) => void
  isDragOverlay?: boolean
  dragListeners?: any
  dragAttributes?: any
}) {
  const [moving, setMoving] = useState(false)
  const morador   = moradores.find((m: Morador) => m.id === task.assignedTo)
  const isMe      = task.assignedTo === userId
  const next: Record<Status, Status | null> = { todo: 'doing', doing: 'done', done: null }
  const nextStatus = next[task.status as Status]

  const handleMove = async () => {
    if (!nextStatus || moving) return
    setMoving(true)
    await onMove(task.id, nextStatus)
    setMoving(false)
  }

  return (
    <div className={`bg-zinc-800 rounded-xl p-3 space-y-2.5 border transition-colors select-none ${
      isDragOverlay
        ? 'border-yellow-500/60 shadow-2xl shadow-black/60 rotate-1 scale-105'
        : task.overdue
        ? 'border-red-500/40 hover:border-red-500/60'
        : 'border-zinc-700/50 hover:border-zinc-600'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug flex-1 ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-white'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isDragOverlay && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(task) }}
              className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <div
            {...(dragListeners ?? {})}
            {...(dragAttributes ?? {})}
            className="p-0.5 rounded cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">{task.room}</span>
        {task.recurrence !== 'única' && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Repeat2 className="w-3 h-3" />{RECURRENCE_LABELS[task.recurrence as Recurrence] ?? task.recurrence}
          </span>
        )}
        {task.overdue && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
            <AlertCircle className="w-3 h-3" /> Atrasada
          </span>
        )}
      </div>

      {/* Data + dias restantes */}
      {task.dueDate && task.status !== 'done' && (
        <DueDateBadge dueDateStr={task.dueDate} overdue={task.overdue} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full ${morador?.avatar_color ?? 'bg-zinc-600'} flex items-center justify-center text-white text-[9px] font-bold`}>
            {(morador?.name ?? '?')[0]}
          </div>
          <span className="text-xs text-zinc-400">
            {isMe ? 'Você' : morador?.name.split(' ')[0] ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityStyle[task.priority as Priority]}`}>
            {task.priority}
          </Badge>
          {nextStatus && !isDragOverlay && (
            !isMe && nextStatus === 'doing' ? (
              // Bloqueia iniciar tarefa de outro morador
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full cursor-not-allowed">
                <Lock className="w-2.5 h-2.5" /> Não é sua
              </span>
            ) : (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); handleMove() }}
                disabled={moving}
                className="flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-0.5 rounded-full transition-colors active:scale-95"
              >
                {moving
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando</>
                  : <>{nextStatus === 'doing' ? 'Iniciar' : 'Concluir'}<ChevronRight className="w-3 h-3" /></>
                }
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ── Draggable wrapper ─────────────────────────────────────────────────────────
function DraggableCard({ task, moradores, userId, onMove, onEdit }: {
  task: Task
  moradores: Morador[]
  userId: string
  onMove: (id: string, status: Status) => void
  onEdit: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, transition: isDragging ? 'none' : 'opacity 0.15s' }}>
      <TaskCardInner task={task} moradores={moradores} userId={userId} onMove={onMove} onEdit={onEdit} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  )
}

// ── Droppable Column ──────────────────────────────────────────────────────────
function DroppableColumn({ col, tasks, moradores, userId, onMove, onEdit, isOver }: {
  col: typeof columns[number]
  tasks: Task[]
  moradores: Morador[]
  userId: string
  onMove: (id: string, status: Status) => void
  onEdit: (task: Task) => void
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: col.key })
  const Icon = col.icon

  return (
    <div className={`rounded-2xl border ${col.bg} p-3 sm:p-4 space-y-3 transition-colors duration-150 ${isOver ? col.dropBg : 'bg-zinc-800/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${col.accent}`} />
          <span className={`font-semibold text-sm ${col.accent}`}>{col.label}</span>
        </div>
        <span className="text-zinc-500 text-xs bg-zinc-700 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="space-y-2.5 min-h-[80px] sm:min-h-[120px]">
        {tasks.length === 0 ? (
          <div className={`flex items-center justify-center h-16 sm:h-20 border border-dashed rounded-xl transition-colors ${isOver ? 'border-zinc-500 bg-zinc-700/20' : 'border-zinc-700'}`}>
            <span className="text-zinc-600 text-xs">{isOver ? 'Solte aqui ↓' : 'Nenhuma tarefa'}</span>
          </div>
        ) : (
          tasks.map(task => (
            <DraggableCard key={task.id} task={task} moradores={moradores} userId={userId} onMove={onMove} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  )
}

// ── History Sidebar ───────────────────────────────────────────────────────────
function HistorySidebarContent({ history, tasks, moradores, userId }: {
  history: TarefasData['history']
  tasks: TarefasData['tasks']
  moradores: Morador[]
  userId: string
}) {
  const scoreboard = [...moradores].map((m: Morador) => ({
    ...m,
    done: history.filter((h: HistoryItem) => h.doneBy === m.id).length,
  })).sort((a, b) => b.done - a.done)

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-800 border-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-yellow-500" />
            <CardTitle className="text-white text-sm">Ranking do mês</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {scoreboard.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <span className={`text-xs font-bold w-4 ${i === 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>{i + 1}º</span>
              <div className={`w-6 h-6 rounded-full ${m.avatar_color} flex items-center justify-center text-white text-[10px] font-bold`}>{m.name[0]}</div>
              <span className="text-zinc-300 text-sm flex-1">{m.name.split(' ')[0]}</span>
              <span className="text-zinc-400 text-xs">{m.done} feitas</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 border-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-400" />
            <CardTitle className="text-white text-sm">Próxima rotatividade</CardTitle>
          </div>
          <CardDescription className="text-zinc-500 text-xs">Quando concluída, passa para:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.filter((t: Task) => t.recurrence !== 'única' && t.status !== 'done').slice(0, 4).map((t: Task) => {
            const rotMembers = t.rotationMembers?.length
              ? moradores.filter((m: Morador) => t.rotationMembers!.includes(m.id)).sort((a, b) => a.name.localeCompare(b.name))
              : [...moradores].sort((a, b) => a.name.localeCompare(b.name))
            const currIdx = rotMembers.findIndex((m: Morador) => m.id === t.assignedTo)
            const nextM   = rotMembers[(currIdx + 1) % rotMembers.length]
            return (
              <div key={t.id} className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg">
                <span className="text-zinc-400 text-xs flex-1 truncate">{t.title}</span>
                <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                <div className={`w-5 h-5 rounded-full ${nextM?.avatar_color} flex items-center justify-center text-white text-[9px] font-bold`}>
                  {nextM?.name[0]}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 border-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <CardTitle className="text-white text-sm">Histórico</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-4">Nenhuma tarefa concluída ainda.</p>
          ) : (
            history.slice(0, 6).map((h: HistoryItem) => {
              const m = moradores.find((x: Morador) => x.id === h.doneBy)
              return (
                <div key={h.id} className="flex items-start gap-2">
                  <div className={`w-5 h-5 rounded-full ${m?.avatar_color ?? 'bg-zinc-600'} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5`}>
                    {(m?.name ?? '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs leading-snug truncate">{h.taskTitle}</p>
                    <p className="text-zinc-600 text-[10px]">{m?.name.split(' ')[0]} · {h.doneAt}</p>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const defaultForm = (moradores: Morador[]): TaskForm => ({
  title: '', room: 'Cozinha', assignedTo: moradores[0]?.id ?? '',
  priority: 'média', recurrence: 'semanal', dueDate: '',
  rotationMembers: moradores.map(m => m.id),
})

export default function TarefasClient({ data }: { data: TarefasData }) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  const { userId, profile, moradores, tasks, history } = data as {
    userId: string
    profile: TarefasData['profile']
    moradores: Morador[]
    tasks: Task[]
    history: TarefasData['history']
  }

  const [filterMorador,    setFilterMorador]    = useState('todos')
  const [filterRecurrence, setFilterRecurrence] = useState('todas')
  const [showHistory,      setShowHistory]      = useState(false)
  const [openAdd,          setOpenAdd]          = useState(false)
  const [editingTask,      setEditingTask]      = useState<Task | null>(null)
  const [activeTask,       setActiveTask]       = useState<Task | null>(null)
  const [overColumn,       setOverColumn]       = useState<Status | null>(null)

  const [form, setForm] = useState<TaskForm>(() => defaultForm(moradores))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: any) => {
    const overId = event.over?.id as Status | null
    setOverColumn(overId && ['todo','doing','done'].includes(overId) ? overId : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    setOverColumn(null)
    const { active, over } = event
    if (!over) return
    const taskId    = active.id as string
    const newStatus = over.id as Status
    if (!['todo','doing','done'].includes(newStatus)) return
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    startTransition(async () => {
      await moveTask(taskId, newStatus, userId)
      router.refresh()
    })
  }

  const handleMoveTask = (id: string, newStatus: Status) => {
    return new Promise<void>(resolve => {
      startTransition(async () => {
        await moveTask(id, newStatus, userId)
        router.refresh()
        resolve()
      })
    })
  }

  const handleAddTask = () => {
    if (!form.title) return
    startTransition(async () => {
      await addTask({
        houseId:         profile.house_id!,
        title:           form.title,
        room:            form.room,
        assignedTo:      form.assignedTo,
        priority:        form.priority,
        recurrence:      form.recurrence,
        dueDate:         form.dueDate,
        rotationMembers: form.recurrence !== 'única' ? form.rotationMembers : [],
      })
      setForm(defaultForm(moradores))
      setOpenAdd(false)
      router.refresh()
    })
  }

  const handleOpenEdit = (task: Task) => {
    setForm({
      title:           task.title,
      room:            task.room,
      assignedTo:      task.assignedTo,
      priority:        task.priority as Priority,
      recurrence:      task.recurrence as Recurrence,
      dueDate:         task.dueDate ?? '',
      rotationMembers: task.rotationMembers ?? moradores.map(m => m.id),
    })
    setEditingTask(task)
  }

  const handleEditTask = () => {
    if (!editingTask || !form.title) return
    startTransition(async () => {
      await editTask({
        taskId:          editingTask.id,
        title:           form.title,
        room:            form.room,
        assignedTo:      form.assignedTo,
        priority:        form.priority,
        recurrence:      form.recurrence,
        dueDate:         form.dueDate,
        rotationMembers: form.recurrence !== 'única' ? form.rotationMembers : [],
      })
      setEditingTask(null)
      setForm(defaultForm(moradores))
      router.refresh()
    })
  }

  const filtered = tasks.filter(t =>
    (filterMorador === 'todos' || t.assignedTo === filterMorador) &&
    (filterRecurrence === 'todas' || t.recurrence === filterRecurrence)
  )

  const overdueCount = tasks.filter(t => t.overdue).length
  const doneCount    = tasks.filter(t => t.status === 'done').length
  const totalCount   = tasks.length

  return (
    <div className="min-h-screen bg-gray-800 p-1 sm:p-2">
      <div className="bg-zinc-900 min-h-screen rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-white text-xl sm:text-2xl font-bold mx-1 sm:mx-2">Tarefas da Casa</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(v => !v)}
              className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all ${
                showHistory ? 'bg-zinc-700 border-zinc-600 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold gap-1 sm:gap-1.5 text-xs sm:text-sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Nova Tarefa</span>
                  <span className="xs:hidden">Nova</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-md mx-auto rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Criar Tarefa</DialogTitle></DialogHeader>
                <TaskFormFields form={form} setForm={setForm} moradores={moradores} />
                <Button onClick={handleAddTask} className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold mt-2">
                  Criar tarefa
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Edit Dialog ──────────────────────────────────────────── */}
        <Dialog open={!!editingTask} onOpenChange={open => { if (!open) { setEditingTask(null); setForm(defaultForm(moradores)) } }}>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white w-[calc(100vw-2rem)] max-w-md mx-auto rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Tarefa</DialogTitle></DialogHeader>
            <TaskFormFields form={form} setForm={setForm} moradores={moradores} />
            <Button onClick={handleEditTask} className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold mt-2">
              Salvar alterações
            </Button>
          </DialogContent>
        </Dialog>

        {/* ── Summary cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total',      value: totalCount,   icon: ListFilter,   accent: 'text-zinc-300',    border: 'border-zinc-700'       },
            { label: 'Concluídas', value: doneCount,    icon: CheckCircle2, accent: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Atrasadas',  value: overdueCount, icon: AlertCircle,  accent: 'text-red-400',     border: 'border-red-500/20'     },
            { label: 'Conclusão',  value: totalCount > 0 ? `${Math.round((doneCount / totalCount) * 100)}%` : '0%', icon: CalendarClock, accent: 'text-blue-400', border: 'border-blue-500/20' },
          ].map(({ label, value, icon: Icon, accent, border }) => (
            <Card key={label} className={`bg-zinc-800 border ${border}`}>
              <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent}`} />
                  <span className="text-zinc-400 text-xs sm:text-sm">{label}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${accent}`}>{value}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:flex-wrap">
          <span className="text-zinc-500 text-sm flex items-center gap-1.5">
            <ListFilter className="w-4 h-4" /> Filtrar:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none">
            {['todos', ...moradores.map((m: Morador) => m.id)].map(id => {
              const m = moradores.find((x: Morador) => x.id === id)
              return (
                <button key={id} onClick={() => setFilterMorador(id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    filterMorador === id
                      ? id === 'todos' ? 'bg-zinc-600 text-white' : `${m?.avatar_color} text-white`
                      : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                  }`}
                >
                  {id !== 'todos' && <span className={`w-1.5 h-1.5 rounded-full ${m?.avatar_color}`} />}
                  {id === 'todos' ? 'Todos' : m?.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
          <Separator orientation="vertical" className="hidden sm:block data-[orientation=vertical]:h-5 bg-zinc-700" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['todas', 'única', 'diária', '2x-semana', 'semanal', 'quinzenal', 'mensal'].map(r => (
              <button key={r} onClick={() => setFilterRecurrence(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize flex-shrink-0 ${
                  filterRecurrence === r ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                {r === 'todas' ? 'Todas' : RECURRENCE_LABELS[r as Recurrence] ?? r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Kanban + History ────────────────────────────────────── */}
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="right" className="bg-zinc-900 border-zinc-800 text-white w-[300px] sm:w-[320px] overflow-y-auto p-4 block lg:hidden">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-white flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" /> Histórico & Ranking
              </SheetTitle>
            </SheetHeader>
            <HistorySidebarContent history={history} tasks={tasks} moradores={moradores} userId={userId} />
          </SheetContent>
        </Sheet>

        <div className={`grid gap-5 ${showHistory ? 'lg:grid-cols-[1fr_260px]' : 'grid-cols-1'}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {columns.map(col => (
                <DroppableColumn
                  key={col.key}
                  col={col}
                  tasks={filtered.filter(t => t.status === col.key)}
                  moradores={moradores}
                  userId={userId}
                  onMove={handleMoveTask}
                  onEdit={handleOpenEdit}
                  isOver={overColumn === col.key}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeTask ? (
                <TaskCardInner task={activeTask} moradores={moradores} userId={userId} onMove={() => Promise.resolve()} onEdit={() => {}} isDragOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>

          {showHistory && (
            <div className="hidden lg:block space-y-4">
              <HistorySidebarContent history={history} tasks={tasks} moradores={moradores} userId={userId} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}