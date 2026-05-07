type N8nEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'bill.created'
  | 'bill.paid'
  | 'bill.notified'
  | 'bill.deleted'
  | 'transaction.created'
  | 'transaction.deleted'
  | 'stock.created'
  | 'stock.updated'
  | 'stock.deleted'
  | 'profile.updated'

export async function emitN8nEvent(event: N8nEvent, payload: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        event,
        occurredAt: new Date().toISOString(),
        payload,
      }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('n8n webhook failed:', error)
  }
}

export function assertN8nRequest(request: Request) {
  const expected = process.env.N8N_API_TOKEN
  if (!expected) return

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
