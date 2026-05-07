# Roomy 🏡

Sistema gerenciador de república com bot Telegram proativo, dashboard web e automações via n8n.

## Features

**🤖 Bot Telegram Automatizado:**
- Cobra tarefas atrasadas (diário 8h)
- Cobra contas vencidas com Pix (diário 20h)
- Alerta estoque baixo (diário 8h)
- Resumo semanal (segunda 9h)
- Comandos interativos (criar tarefa, pagar conta, ler NFC-e)

**📊 Dashboard Web:**
- Tarefas (criar, atribuir, concluir, recorrência)
- Contas (dividir, pagar, comprovante)
- Estoque (casa + pessoal, alertas)
- Transações pessoais + orçamento
- NFC-e (ler QR code, dividir automaticamente)

**⚙️ Stack:**
- Next.js 16 (Turbopack)
- PostgreSQL 16
- n8n (automação)
- Docker Compose

## Quick Start

**Dev local:**
```bash
npm install
cp .env.local.example .env.local
docker-compose up -d db
npm run dev
```

Acesse http://localhost:3000

**Produção (Docker):**
```bash
cp .env.example .env
# Edit .env (troque senhas/tokens)
docker-compose up -d --build
```

**Setup completo (Telegram + workflows):**
Ver [ROOMY_SETUP.md](./ROOMY_SETUP.md)

## Workflows n8n

Importar em n8n UI:

1. **roomy-telegram-bot.json** - Bot interativo (comandos manuais)
2. **roomy-manager-agent.json** - Gerente automático (notificações agendadas)

Configure credentials Telegram e HTTP Auth antes de ativar.

## API Routes (n8n)

Autenticação: `Authorization: Bearer $N8N_API_TOKEN`

**Telegram:**
- `POST /api/n8n/telegram/link` - vincular chat
- `GET /api/n8n/context?telegramChatId=...` - dados usuário

**Tarefas:**
- `GET /api/n8n/tasks?telegramChatId=...`
- `POST /api/n8n/tasks` - actions: complete, create

**Contas:**
- `GET /api/n8n/bills?telegramChatId=...`
- `POST /api/n8n/bills` - actions: mark-paid, create

**Estoque:**
- `GET /api/n8n/stock?telegramChatId=...`
- `POST /api/n8n/stock` - actions: add, quantity, shopping-list

**NFC-e:**
- `POST /api/n8n/nfce` - processa link QR code

**Manager (automação):**
- `GET /api/n8n/manager/overdue-tasks`
- `GET /api/n8n/manager/overdue-bills`
- `GET /api/n8n/manager/low-stock`
- `GET /api/n8n/manager/weekly-summary`

## Comandos Telegram

```
/vincular SEU_RA - conectar Telegram
/tarefas - listar pendentes
/concluir TASK_ID - marcar feito
/contas - listar suas contas
/pagar PARTICIPANT_ID - marcar pago
/estoque - ver itens baixos
/tarefa titulo | local | prioridade | 2026-05-10
/conta titulo | 150.50 | 2026-05-15
Cole link NFC-e - ler nota fiscal
```

## Estrutura

```
app/
├── (dashboard-pages)/  # páginas autenticadas
├── api/n8n/           # rotas para n8n
├── login/             # auth
db/init/               # schema SQL inicial
lib/                   # db, auth, n8n utils
queries/               # queries reutilizáveis
workflows/             # n8n workflows JSON
```

## Env Vars

**.env.local (dev):**
```
DATABASE_URL=postgresql://roomy:roomy@localhost:5433/roomy
AUTH_SECRET=seu-secret-jwt
N8N_API_TOKEN=seu-token
```

**.env (docker):**
```
POSTGRES_PASSWORD=senha-forte
AUTH_SECRET=secret-forte
N8N_API_TOKEN=token-forte
N8N_ENCRYPTION_KEY=key-forte
PUBLIC_BASE_URL=https://seu-dominio.com
ROOMY_BASE_URL=http://app:3000
```

## Banco Inicial

Casa padrão criada em `db/init/01-roomy-schema.sql`:
- Nome: Republica Roomy
- Código convite: `ROOMY2026`

Use código no signup ou crie usuário via SQL.

## Licença

MIT
