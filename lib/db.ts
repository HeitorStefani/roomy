import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

declare global {
  var roomyPgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('DATABASE_URL is not configured. Database calls will fail until it is set.')
}

export const db =
  globalThis.roomyPgPool ??
  new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.roomyPgPool = db
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return db.query<T>(text, params)
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
