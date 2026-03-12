// supabase/functions/notify-tasks/index.ts
// Cron: "0 11 * * *" (08:00 horário de Brasília)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL')!
const FROM_NAME     = Deno.env.get('FROM_NAME') ?? 'Roomy'
const APP_URL       = Deno.env.get('APP_URL')   ?? 'https://seuapp.com'

interface Task {
  id: string; title: string; room: string
  priority: string; due_date: string; recurrence: string; overdue: boolean
}
interface User { id: string; name: string; email: string; tasks: Task[] }

const priorityColor = (p: string) => p === 'alta' ? '#ef4444' : p === 'média' ? '#f59e0b' : '#71717a'
const priorityLabel = (p: string) => p === 'alta' ? '🔴 Alta' : p === 'média' ? '🟡 Média' : '⚪ Baixa'
const recurrenceLabel = (r: string) => (({ 'única':'Uma vez','diária':'Diária','2x-semana':'2x por semana','semanal':'Semanal','quinzenal':'Quinzenal','mensal':'Mensal' } as Record<string,string>)[r] ?? r)

function buildEmail(user: User, today: string): string {
  const overdueList  = user.tasks.filter(t => t.overdue)
  const todayList    = user.tasks.filter(t => !t.overdue && t.due_date === today)
  const upcomingList = user.tasks.filter(t => !t.overdue && t.due_date > today)
  const total        = user.tasks.length

  const row = (t: Task) => `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #27272a;">
      <strong style="color:#fff;font-size:14px;">${t.title}</strong>
      <span style="display:block;color:#a1a1aa;font-size:12px;margin-top:2px;">${t.room} · ${recurrenceLabel(t.recurrence)}</span>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #27272a;text-align:right;">
      <span style="color:${priorityColor(t.priority)};font-size:12px;">${priorityLabel(t.priority)}</span>
      <span style="display:block;color:#a1a1aa;font-size:11px;margin-top:2px;">${t.due_date ? new Date(t.due_date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—'}</span>
    </td>
  </tr>`

  const section = (title: string, color: string, tasks: Task[]) => tasks.length === 0 ? '' : `
    <h3 style="color:${color};font-size:13px;font-weight:700;margin:24px 0 8px;text-transform:uppercase;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;background:#18181b;border-radius:10px;overflow:hidden;">${tasks.map(row).join('')}</table>`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td style="padding-bottom:24px;">
    <span style="background:#eab308;padding:6px 10px;border-radius:8px;font-size:18px;">👑</span>
    <span style="color:#fff;font-size:22px;font-weight:800;vertical-align:middle;margin-left:8px;">ROOMY</span>
    <p style="color:#a1a1aa;font-size:13px;margin:8px 0 0;">Resumo de tarefas · ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</p>
  </td></tr>
  <tr><td style="padding-bottom:20px;">
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:20px 24px;">
      <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 6px;">Oi, ${user.name.split(' ')[0]}! 👋</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">${total === 0 ? 'Sem tarefas pendentes hoje. Aproveite! 🎉' : `Você tem <strong style="color:#eab308;">${total} tarefa${total>1?'s':''}</strong> para fazer.`}</p>
    </div>
  </td></tr>
  <tr><td>
    ${section('⚠️ Atrasadas','#ef4444',overdueList)}
    ${section('📅 Para hoje','#eab308',todayList)}
    ${section('🕐 Próximas','#a1a1aa',upcomingList.slice(0,5))}
  </td></tr>
  ${total > 0 ? `<tr><td style="padding-top:24px;text-align:center;">
    <a href="${APP_URL}/tarefas" style="display:inline-block;background:#eab308;color:#09090b;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">Ver todas as tarefas →</a>
  </td></tr>` : ''}
  <tr><td style="padding-top:32px;text-align:center;color:#52525b;font-size:11px;">
    Roomy · Você recebe este e-mail pois cadastrou este endereço no seu perfil.<br>
    Para parar de receber, acesse Meu Perfil no app e remova o e-mail.
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, room, assigned_to, priority, recurrence, start_date, due_date, overdue')
      .in('status', ['todo', 'doing'])
      .lte('start_date', today)

    if (error) throw error

    const assignedIds = [...new Set((tasks ?? []).map((t: any) => t.assigned_to))]
    if (!assignedIds.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

    // Busca e-mail de notificação da tabela users (não do auth)
    const { data: profiles } = await supabase
      .from('users')
      .select('id, name, email_notificacao')
      .in('id', assignedIds)

    const profileMap = new Map((profiles ?? []).map((p: any) => ({
      id:    p.id,
      name:  p.name,
      email: p.email_notificacao ?? '',
    })).map(p => [p.id, p]))

    const userMap = new Map<string, User>()
    for (const task of (tasks ?? [])) {
      const uid     = (task as any).assigned_to
      const profile = profileMap.get(uid)
      if (!profile?.email) continue // pula quem não tem e-mail cadastrado
      if (!userMap.has(uid)) {
        userMap.set(uid, { id: uid, name: profile.name, email: profile.email, tasks: [] })
      }
      userMap.get(uid)!.tasks.push(task as Task)
    }

    let sent = 0
    const errors: string[] = []

    for (const user of userMap.values()) {
      if (!user.email || !user.tasks.length) continue

      const overdueCount = user.tasks.filter(t => t.overdue).length
      const subject = overdueCount > 0
        ? `⚠️ Você tem ${overdueCount} tarefa(s) atrasada(s) — Roomy`
        : `📋 Suas tarefas de hoje — Roomy`

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender:      { name: FROM_NAME, email: FROM_EMAIL },
          to:          [{ email: user.email, name: user.name }],
          subject,
          htmlContent: buildEmail(user, today),
        }),
      })

      if (res.ok) sent++
      else errors.push(`${user.email}: ${await res.text()}`)
    }

    return new Response(JSON.stringify({ sent, errors }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})