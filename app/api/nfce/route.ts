import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toFloatBr(s: string | null | undefined): number | null {
  if (!s) return null
  const cleaned = s.trim().replace(/\xa0/g, ' ').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function cleanTxt(s: string | null | undefined): string | null {
  if (!s) return null
  return s.replace(/\s+/g, ' ').trim()
}

// ── Extratores ────────────────────────────────────────────────────────────────

function extractEstabelecimento($: cheerio.CheerioAPI) {
  let estabelecimento: string | null = null
  let cnpj: string | null = null

  const nomeTag = $('div.txtTopo').first() || $('#u20').first()
  if (nomeTag.length) estabelecimento = cleanTxt(nomeTag.text())

  $('*').each((_, el) => {
    const text = $(el).text()
    const m = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)
    if (m && !cnpj) cnpj = m[0]
  })

  return { estabelecimento, cnpj }
}

function extractTotals($: cheerio.CheerioAPI) {
  let total_itens: number | null = null
  let subtotal: number | null = null
  let desconto: number | null = null
  let valor_pagar: number | null = null
  let forma_pagamento: string | null = null

  const section = $('#totalNota, .txtRight').first()
  if (!section.length) return { total_itens, valor_pagar, forma_pagamento }

  section.find('[id*="linhaTotal"], .linhaShade').each((_, linha) => {
    const label = cleanTxt($(linha).find('label').text()) ?? ''
    const valor = cleanTxt($(linha).find('.totalNumb').text()) ?? ''

    if (/qtd\.?\s*total\s*de\s*itens/i.test(label)) {
      const m = valor.match(/\d+/)
      if (m) total_itens = parseInt(m[0])
    } else if (/valor\s*total\s*bruto|subtotal/i.test(label)) {
      // Subtotal ANTES do desconto
      subtotal = toFloatBr(valor)
    } else if (/desconto/i.test(label)) {
      // Desconto pode vir como "-R$ 5,00" ou "R$ 5,00"
      const raw = toFloatBr(valor)
      if (raw !== null) desconto = Math.abs(raw)
    } else if (/valor\s*a\s*pagar/i.test(label)) {
      valor_pagar = toFloatBr(valor)
    } else if (/forma\s*de\s*pagamento|cartão|débito|crédito|pix/i.test(label)) {
      forma_pagamento = /cartão|débito|crédito|pix|dinheiro/i.test(label) ? label : forma_pagamento
    }
  })

  if (!forma_pagamento) {
    section.find('div').each((_, div) => {
      const label = $(div).find('label.tx').first()
      if (label.length) {
        const txt = cleanTxt(label.text()) ?? ''
        if (/cartão|débito|crédito|pix|dinheiro/i.test(txt)) {
          forma_pagamento = txt
          return false // break
        }
      }
    })
  }

  // Prioridade: valor_pagar (já com desconto) > subtotal - desconto > subtotal
  const valor_final =
    valor_pagar ??
    (subtotal !== null && desconto !== null ? subtotal - desconto : null) ??
    subtotal

  return { total_itens, valor_pagar: valor_final, forma_pagamento }
}

function extractItems($: cheerio.CheerioAPI) {
  const itens: {
    codigo: string | null
    descricao: string | null
    quantidade: number | null
    unidade: string | null
    valor_unit: number | null
    valor_total: number | null
  }[] = []

  $('table#tabResult tr[id*="Item"]').each((_, tr) => {
    const descricao = cleanTxt($(tr).find('.txtTit2').text())
    if (!descricao) return

    let codigo: string | null = null
    const codMatch = $(tr).find('.RCod').text().match(/\b(\d+)\b/)
    if (codMatch) codigo = codMatch[1]

    let quantidade: number | null = null
    const qtdMatch = $(tr).find('.Rqtd').text().match(/Qtde\.\s*:\s*([\d\.,]+)/i)
    if (qtdMatch) quantidade = toFloatBr(qtdMatch[1])

    let unidade: string | null = null
    const unMatch = $(tr).find('.RUN').text().match(/UN\s*:\s*([A-Za-z]+)/i)
    if (unMatch) unidade = unMatch[1].toUpperCase()

    let valor_unit: number | null = null
    const vuMatch = $(tr).find('.RvlUnit').text().match(/Vl\.\s*Unit\.\s*:\s*([\d\.,]+)/i)
    if (vuMatch) valor_unit = toFloatBr(vuMatch[1])

    let valor_total: number | null = null
    const vtSpan = $(tr).find('.txtTit3 span.valor').first()
    if (vtSpan.length) {
      const vtMatch = vtSpan.text().match(/([\d\.,]+)/)
      if (vtMatch) valor_total = toFloatBr(vtMatch[1])
    }

    itens.push({ codigo, descricao, quantidade, unidade, valor_unit, valor_total })
  })

  return itens
}

function groupItems(itens: ReturnType<typeof extractItems>) {
  const grouped = new Map<string, (typeof itens)[0]>()
  for (const item of itens) {
    if (!item.descricao) continue
    if (!grouped.has(item.descricao)) {
      grouped.set(item.descricao, { ...item })
    } else {
      const g = grouped.get(item.descricao)!
      g.quantidade  = (g.quantidade  ?? 0) + (item.quantidade  ?? 0)
      g.valor_total = (g.valor_total ?? 0) + (item.valor_total ?? 0)
    }
  }
  return Array.from(grouped.values())
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL parameter is missing' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
      },
      signal: AbortSignal.timeout(45_000),
    })

    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 })

    const html = await res.text()
    const $    = cheerio.load(html)

    const { estabelecimento, cnpj } = extractEstabelecimento($)
    const { total_itens, valor_pagar, forma_pagamento } = extractTotals($)
    const itensRaw    = extractItems($)
    const itens       = groupItems(itensRaw)

    return NextResponse.json({
      status:      'success',
      qrcode_data: url,
      nfce_data: {
        estabelecimento,
        cnpj,
        total_itens: total_itens ?? itens.length,
        valor_pagar,
        forma_pagamento,
        itens,
      },
    })
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Timeout: servidor da Fazenda não respondeu.' }, { status: 504 })
    }
    return NextResponse.json({ error: `Erro ao processar: ${err.message}` }, { status: 500 })
  }
}