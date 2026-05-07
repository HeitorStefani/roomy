import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAdminUser, createHouse, assignTaskAsAdmin, resetUserPassword, updateAdminUser } from './actions'

type House = { id: string; name: string; invite_code: string }
type User = {
  id: string
  name: string
  ra: string
  role: 'admin' | 'member'
  house_id: string
  house_name: string
  telegram_chat_id: string | null
  pix_key: string | null
}
type Task = {
  id: string
  title: string
  status: string
  assigned_to: string | null
  due_date: string | null
}

export default async function AdminPage() {
  const admin = await requireAdmin()
  if (!admin) redirect('/dashboard')

  const houseId = admin.profile.house_id

  const [{ rows: houses }, { rows: users }, { rows: tasks }] = await Promise.all([
    query<House>('select id, name, invite_code from houses order by name asc'),
    query<User>(
      `select u.id, u.name, u.ra, u.role, u.house_id, h.name as house_name,
              u.telegram_chat_id, u.pix_key
       from users u
       join houses h on h.id = u.house_id
       order by h.name asc, u.name asc`,
    ),
    query<Task>(
      `select id, title, status, assigned_to, due_date
       from tasks
       where house_id = $1
       order by due_date asc nulls last, title asc`,
      [houseId],
    ),
  ])

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm text-yellow-300">Painel administrativo</p>
          <h1 className="text-3xl font-bold">Controle da republica</h1>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <form action={createAdminUser} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-lg font-semibold">Cadastrar morador</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <Label>Nome</Label>
                <Input name="name" required className="bg-zinc-800 border-zinc-700" />
              </label>
              <label className="space-y-1">
                <Label>RA</Label>
                <Input name="ra" required className="bg-zinc-800 border-zinc-700" />
              </label>
              <label className="space-y-1">
                <Label>Senha inicial</Label>
                <Input name="password" type="password" required className="bg-zinc-800 border-zinc-700" />
              </label>
              <label className="space-y-1">
                <Label>Perfil</Label>
                <select name="role" className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm">
                  <option value="member">Morador</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <Label>Casa</Label>
                <select name="houseId" defaultValue={houseId ?? ''} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm">
                  {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
            </div>
            <Button className="bg-yellow-500 text-black hover:bg-yellow-400">Criar usuario</Button>
          </form>

          <form action={createHouse} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-lg font-semibold">Criar casa</h2>
            <label className="space-y-1 block">
              <Label>Nome da casa</Label>
              <Input name="name" required className="bg-zinc-800 border-zinc-700" />
            </label>
            <label className="space-y-1 block">
              <Label>Codigo de convite</Label>
              <Input name="inviteCode" required className="bg-zinc-800 border-zinc-700 uppercase" />
            </label>
            <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">Criar casa</Button>
            <div className="space-y-1 text-sm text-zinc-400">
              {houses.map(h => <p key={h.id}>{h.name}: <span className="text-zinc-200">{h.invite_code}</span></p>)}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Moradores</h2>
          <div className="grid gap-3">
            {users.map(user => (
              <div key={user.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <form action={updateAdminUser} className="grid gap-3 md:grid-cols-[1.2fr_.8fr_.8fr_1fr_1fr_auto]">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="space-y-1">
                    <Label>Nome</Label>
                    <Input name="name" defaultValue={user.name} className="bg-zinc-800 border-zinc-700" />
                  </label>
                  <label className="space-y-1">
                    <Label>RA</Label>
                    <Input value={user.ra} readOnly className="bg-zinc-800 border-zinc-700 text-zinc-400" />
                  </label>
                  <label className="space-y-1">
                    <Label>Perfil</Label>
                    <select name="role" defaultValue={user.role} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm">
                      <option value="member">Morador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <Label>Telegram chatId</Label>
                    <Input name="telegramChatId" defaultValue={user.telegram_chat_id ?? ''} className="bg-zinc-800 border-zinc-700" />
                  </label>
                  <label className="space-y-1">
                    <Label>Pix</Label>
                    <Input name="pixKey" defaultValue={user.pix_key ?? ''} className="bg-zinc-800 border-zinc-700" />
                  </label>
                  <div className="flex items-end">
                    <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">Salvar</Button>
                  </div>
                </form>

                <form action={resetUserPassword} className="mt-3 flex max-w-md gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <Input name="password" type="password" placeholder="Nova senha" required className="bg-zinc-800 border-zinc-700" />
                  <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">Alterar senha</Button>
                </form>
                <p className="mt-2 text-xs text-zinc-500">{user.house_name} - ID: {user.id}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Atribuir tarefas</h2>
          <div className="grid gap-3">
            {tasks.map(task => (
              <form key={task.id} action={assignTaskAsAdmin} className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_.8fr_.8fr_auto]">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-zinc-500">Vence: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
                <select name="assignedTo" defaultValue={task.assigned_to ?? ''} className="h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm">
                  {users.filter(u => u.house_id === houseId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select name="status" defaultValue={task.status} className="h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm">
                  <option value="todo">A fazer</option>
                  <option value="doing">Fazendo</option>
                  <option value="done">Concluida</option>
                </select>
                <Button className="bg-yellow-500 text-black hover:bg-yellow-400">Atualizar</Button>
              </form>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">API Endpoints & Webhooks (n8n)</h2>
          <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm font-mono text-zinc-300">
            <p className="mb-2 text-yellow-500"><strong>Auth Header:</strong> Authorization: Bearer TOKEN_DO_ENV</p>
            <div className="space-y-2">
              <p>POST /api/n8n/telegram/link <span className="text-zinc-500">// Vincular chat (body: ra, telegramChatId)</span></p>
              <p>GET  /api/n8n/context <span className="text-zinc-500">// Dados via ?telegramChatId=...</span></p>
              <p>GET  /api/n8n/tasks <span className="text-zinc-500">// Listar tarefas pendentes ?telegramChatId=...</span></p>
              <p>POST /api/n8n/tasks <span className="text-zinc-500">// actions: complete, create</span></p>
              <p>GET  /api/n8n/bills <span className="text-zinc-500">// Listar contas ?telegramChatId=...</span></p>
              <p>POST /api/n8n/bills <span className="text-zinc-500">// actions: mark-paid, create</span></p>
              <p>GET  /api/n8n/stock <span className="text-zinc-500">// Listar estoque ?telegramChatId=...</span></p>
              <p>POST /api/n8n/stock <span className="text-zinc-500">// actions: add, quantity, shopping-list</span></p>
              <p>POST /api/n8n/nfce <span className="text-zinc-500">// Processar URL da NFC-e</span></p>
              
              <div className="my-4 border-t border-zinc-800" />
              <p className="text-yellow-500"><strong>Manager (Agendamentos Automáticos):</strong></p>
              <p>GET  /api/n8n/manager/overdue-tasks <span className="text-zinc-500">// Busca tarefas atrasadas</span></p>
              <p>GET  /api/n8n/manager/overdue-bills <span className="text-zinc-500">// Busca contas vencidas</span></p>
              <p>GET  /api/n8n/manager/low-stock <span className="text-zinc-500">// Busca itens acabando</span></p>
              <p>GET  /api/n8n/manager/weekly-summary <span className="text-zinc-500">// Resumo da semana</span></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
