import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string) {
  const bigrams = (s: string) => { const set = new Set<string>(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set }
  const A = bigrams(a), B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0; A.forEach(bg => { if (B.has(bg)) inter++ })
  return inter / (A.size + B.size - inter)
}

export async function POST(req: NextRequest) {
  const { houseId, userId, items } = await req.json()

  const { rows: stockItems } = await query<{ id: string; name: string }>(
    `select id, name from stock_items
     where house_id = $1 and (owner_id is null or owner_id = $2)`,
    [houseId, userId],
  )

  const matched: string[] = []
  const unmatched: string[] = []

  for (const item of items as { name: string }[]) {
    const norm = normalizeStr(item.name)
    const hit = stockItems.find(s => {
      const sn = normalizeStr(s.name)
      return sn === norm || norm.includes(sn) || sn.includes(norm) || similarity(norm, sn) >= 0.6
    })
    if (hit) matched.push(item.name)
    else unmatched.push(item.name)
  }

  return NextResponse.json({ matched, unmatched })
}
