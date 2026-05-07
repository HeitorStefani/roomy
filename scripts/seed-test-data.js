const { readFileSync } = require('fs')
const { randomBytes, pbkdf2Sync } = require('crypto')
const { Pool } = require('pg')

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

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

loadEnv('.env.local')
loadEnv('.env')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  try {
    await client.query('begin')

    const house = await client.query(
      `insert into houses (name, invite_code)
       values ('Republica Teste', 'TESTE2026')
       on conflict (invite_code) do update set name = excluded.name
       returning id`,
    )
    const houseId = house.rows[0].id

    const admin = await client.query(
      `insert into users (house_id, ra, email, password_hash, name, avatar_color, role, telegram_chat_id, pix_key)
       values ($1, 'admin', 'admin@republica.app', $2, 'Admin Roomy', 'bg-yellow-500', 'admin', '999001', 'admin-pix')
       on conflict (ra) do update
       set house_id = excluded.house_id,
           password_hash = excluded.password_hash,
           role = 'admin',
           telegram_chat_id = excluded.telegram_chat_id,
           pix_key = excluded.pix_key
       returning id`,
      [houseId, hashPassword('admin123')],
    )

    const member = await client.query(
      `insert into users (house_id, ra, email, password_hash, name, avatar_color, role, telegram_chat_id, pix_key)
       values ($1, 'morador', 'morador@republica.app', $2, 'Morador Teste', 'bg-blue-500', 'member', '999002', 'morador-pix')
       on conflict (ra) do update
       set house_id = excluded.house_id,
           password_hash = excluded.password_hash,
           role = 'member',
           telegram_chat_id = excluded.telegram_chat_id,
           pix_key = excluded.pix_key
       returning id`,
      [houseId, hashPassword('morador123')],
    )

    const adminId = admin.rows[0].id
    const memberId = member.rows[0].id

    await client.query(
      `insert into tasks (house_id, title, room, assigned_to, status, priority, recurrence, start_date, due_date, overdue)
       values ($1, 'Lavar louca teste', 'Cozinha', $2, 'todo', 'alta', 'unica', current_date, current_date - interval '1 day', false)
       on conflict do nothing`,
      [houseId, memberId],
    )

    const bill = await client.query(
      `insert into house_bills (house_id, title, total, due_date, paid_by, notified)
       values ($1, 'Conta teste mercado', 100, current_date - interval '1 day', $2, false)
       returning id`,
      [houseId, adminId],
    )

    await client.query(
      `insert into bill_participants (bill_id, user_id, amount, paid)
       values ($1, $2, 50, true), ($1, $3, 50, false)
       on conflict (bill_id, user_id) do nothing`,
      [bill.rows[0].id, adminId, memberId],
    )

    await client.query(
      `insert into stock_items (house_id, owner_id, name, category, quantity, min_quantity, unit, in_shopping_list)
       values ($1, null, 'Papel higienico teste', 'Banheiro', 0, 2, 'rolo', true)
       on conflict do nothing`,
      [houseId],
    )

    await client.query('commit')
    console.log(JSON.stringify({
      ok: true,
      houseId,
      admin: { id: adminId, ra: 'admin', password: 'admin123', telegramChatId: '999001' },
      member: { id: memberId, ra: 'morador', password: 'morador123', telegramChatId: '999002' },
    }, null, 2))
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
