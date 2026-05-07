const { readFileSync } = require('fs')

function loadEnv(file) {
  try {
    const raw = readFileSync(file, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length && !process.env[key]) process.env[key] = rest.join('=')
    }
  } catch {}
}

loadEnv('.env.local')
loadEnv('.env')

const baseUrl = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const token = process.env.N8N_API_TOKEN || 'dev-n8n-token'
const telegramChatId = process.env.TEST_TELEGRAM_CHAT_ID || '999002'

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { text } }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${JSON.stringify(data)}`)
  }

  return data
}

async function check(name, fn) {
  process.stdout.write(`- ${name}... `)
  const result = await fn()
  console.log('ok')
  return result
}

async function main() {
  const context = await check('context', () => request(`/api/n8n/context?telegramChatId=${telegramChatId}`))
  const memberId = context.user.id

  await check('telegram link', () => request('/api/n8n/telegram/link', {
    method: 'POST',
    body: { ra: 'morador', telegramChatId },
  }))

  await check('list tasks', () => request(`/api/n8n/tasks?telegramChatId=${telegramChatId}`))

  const createdTask = await check('create task', () => request('/api/n8n/tasks', {
    method: 'POST',
    body: {
      action: 'create',
      telegramChatId,
      title: 'Endpoint test task',
      room: 'Teste',
      priority: 'media',
      assignedTo: memberId,
      dueDate: new Date().toISOString().slice(0, 10),
    },
  }))

  await check('complete task', () => request('/api/n8n/tasks', {
    method: 'POST',
    body: { action: 'complete', telegramChatId, taskId: createdTask.taskId },
  }))

  const bills = await check('list bills', () => request(`/api/n8n/bills?telegramChatId=${telegramChatId}`))
  const payable = (bills.bills || []).find((bill) => !bill.paid)
  if (payable) {
    await check('mark bill paid', () => request('/api/n8n/bills', {
      method: 'POST',
      body: { action: 'mark-paid', telegramChatId, participantId: payable.participant_id },
    }))
  }

  await check('create bill', () => request('/api/n8n/bills', {
    method: 'POST',
    body: {
      action: 'create',
      telegramChatId,
      title: 'Endpoint test bill',
      total: 42.5,
      dueDate: new Date().toISOString().slice(0, 10),
      involved: [{ userId: memberId, amount: 42.5 }],
    },
  }))

  await check('list stock', () => request(`/api/n8n/stock?telegramChatId=${telegramChatId}`))
  await check('add stock', () => request('/api/n8n/stock', {
    method: 'POST',
    body: {
      action: 'add',
      telegramChatId,
      name: 'Endpoint test item',
      category: 'Teste',
      quantity: 1,
      minQuantity: 2,
      unit: 'un',
      owner: 'casa',
    },
  }))

  await check('manager overdue tasks', () => request('/api/n8n/manager/overdue-tasks'))
  await check('manager overdue bills', () => request('/api/n8n/manager/overdue-bills'))
  await check('manager low stock', () => request('/api/n8n/manager/low-stock'))
  await check('manager weekly summary', () => request('/api/n8n/manager/weekly-summary'))

  console.log('\nAll endpoint checks passed.')
}

main().catch((error) => {
  console.error('\nEndpoint test failed:')
  console.error(error)
  process.exit(1)
})
