# Roomy - Setup Guide

Sistema gerenciador de república com bot Telegram automatizado.

## Funcionalidades

**Bot Telegram proativo:**
- ⏰ Notifica tarefas atrasadas (diário 8h)
- 💰 Cobra contas vencidas (diário 20h)
- 🛒 Alerta estoque baixo (diário 8h)
- 📊 Resumo semanal (segunda 9h)
- 🤖 Comandos interativos via chat

**Web App:**
- Gerenciar tarefas (criar, atribuir, concluir)
- Gerenciar contas (dividir, pagar, comprovante)
- Estoque (adicionar, remover, alertas)
- NFC-e (ler QR code, dividir conta automaticamente)
- Dashboard com gráficos

## Setup Rápido

### 1. Ambiente Local (Dev)

```bash
# Clone repo
git clone https://github.com/seu-user/roomy.git
cd roomy

# Copy env
cp .env.example .env
cp .env.local.example .env.local

# Inicie apenas DB
docker-compose up -d db

# Aguarde DB ficar healthy
docker ps

# Instale deps e rode dev
npm install
npm run dev
```

App roda em `http://localhost:3000`

**Criar primeiro usuário:**
```bash
# Via signup web em /login?mode=signup
# Código convite padrão: ROOMY2026

# OU via SQL direto:
node scripts/hash-password.js SENHA_DESEJADA
# Copie hash gerado, depois:
docker exec roomy-db-1 psql -U roomy -d roomy -c "
insert into users (house_id, ra, email, password_hash, name)
select h.id, '123456', '123456@republica.app', 'HASH_AQUI', 'Nome'
from houses h where h.invite_code = 'ROOMY2026' limit 1
"
```

### 2. Ambiente Produção (Docker)

```bash
# Configure .env
nano .env

# Variáveis importantes:
# POSTGRES_PASSWORD=senha-forte-aqui
# AUTH_SECRET=secret-jwt-forte-aqui
# N8N_API_TOKEN=token-forte-aqui
# N8N_ENCRYPTION_KEY=key-forte-aqui
# PUBLIC_BASE_URL=https://seu-dominio.com

# Suba tudo
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs app
docker-compose logs n8n
```

### 3. Setup Bot Telegram

**3.1 Criar Bot:**
1. Fale com [@BotFather](https://t.me/Botfather)
2. `/newbot`
3. Escolha nome e username
4. Copie token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

**3.2 Configurar n8n:**
1. Acesse n8n: `http://localhost:5678` (ou seu domínio)
2. Crie conta admin
3. Credentials → New → Telegram
   - Name: `Telegram Bot`
   - Access Token: cole token do BotFather
   - Save

**3.3 Importar Workflows:**
1. n8n → Workflows → Import
2. Selecione `workflows/roomy-telegram-bot.json`
3. Import
4. Abra workflow importado
5. Em cada node Telegram (3 nodes total):
   - Click node
   - Credential: selecione "Telegram Bot"
   - Save
6. Repeat para `workflows/roomy-manager-agent.json`
7. Em nodes HTTP Request:
   - Credentials → New → Header Auth
   - Name: `Roomy API Token`
   - Name: `Authorization`
   - Value: `Bearer dev-n8n-token` (ou seu token do .env)
   - Save
8. Ative ambos workflows (toggle no canto superior direito)

**3.4 Vincular Telegram:**
```bash
# No Telegram, fale com seu bot
/vincular SEU_RA

# Ex: /vincular 123456
```

## Comandos Telegram

**Tarefas:**
- `/tarefas` - lista pendentes
- `/concluir TASK_ID` - marca como feito
- `/tarefa titulo | local | prioridade | 2026-05-10` - cria nova

**Contas:**
- `/contas` - lista suas contas
- `/pagar PARTICIPANT_ID` - marca como pago
- `/conta titulo | 150.50 | 2026-05-15 | userId:50,userId2:100` - cria

**Estoque:**
- `/estoque` - mostra itens baixos

**NFC-e:**
- Cole link QR code da nota fiscal
- Bot lê e sugere comando `/conta` pronto

**Ajuda:**
- `/help` ou `/start`

## Notificações Automáticas

Bot age como gerente da casa:

**Diário 8h:**
- Verifica tarefas vencidas → notifica responsável
- Verifica estoque baixo → alerta todos

**Diário 20h:**
- Verifica contas vencidas → cobra devedor + envia Pix de quem pagou

**Segunda 9h:**
- Resumo semanal para todos

## Estrutura

```
roomy/
├── app/                    # Next.js app
│   ├── (dashboard-pages)/  # páginas autenticadas
│   ├── api/n8n/           # API para n8n
│   └── login/             # auth
├── db/init/               # SQL inicial
├── lib/                   # utils
├── queries/               # DB queries
├── workflows/             # n8n workflows
├── docker-compose.yml     # orquestração
└── .env                   # config docker
```

## Troubleshooting

**DB não conecta:**
```bash
docker-compose logs db
# Check se porta 5432 já usada
docker ps | grep 5432
# Mude porta em docker-compose.yml e .env.local
```

**n8n não executa:**
```bash
docker-compose logs n8n
# Check ROOMY_BASE_URL acessível de dentro do container
# Use http://app:3000 (nome do service docker)
```

**Bot não responde:**
1. Check workflow ativo em n8n
2. Check credentials Telegram configuradas
3. Test manual: Workflows → Execute Workflow
4. Check logs: docker-compose logs app

**Notificações não enviam:**
1. Usuário vinculou Telegram? `/vincular RA`
2. Workflow "Roomy Manager Agent" ativo?
3. Schedule triggers configurados?
4. Check: n8n → Executions (ver histórico)

## Produção

**Recomendações:**
- Use HTTPS (nginx reverse proxy + Let's Encrypt)
- Troque todos tokens/secrets em `.env`
- Configure backup DB (cron + pg_dump)
- Monitor logs (docker-compose logs -f)
- Configure retention em n8n (Settings → Executions)

**Backup DB:**
```bash
docker exec roomy-db-1 pg_dump -U roomy roomy > backup-$(date +%Y%m%d).sql
```

**Restore:**
```bash
cat backup-20260505.sql | docker exec -i roomy-db-1 psql -U roomy roomy
```

## Desenvolvimento

**Hot reload:**
- App Next.js: automático em dev mode
- n8n workflows: edite direto na UI, salva automaticamente
- DB schema: edite `db/init/*.sql`, depois `docker-compose down -v && docker-compose up -d db`

**Logs:**
```bash
# App
docker-compose logs -f app

# n8n
docker-compose logs -f n8n

# DB
docker-compose logs -f db

# Todos
docker-compose logs -f
```

**Reset completo:**
```bash
docker-compose down -v
docker-compose up -d
# Perde todos dados!
```

## Licença

MIT
