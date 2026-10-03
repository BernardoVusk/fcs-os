import type { Indicadores, Metrica, OrigemVendas, Canal, ProdutoVendedor, Campanha, Afiliados, FerramentaMarketing } from './tipos'

type Bruto = any
const ESCALA_ADS = 100000
const ID = /^\d+$/

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function ads(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : n / ESCALA_ADS
}
function id(v: unknown): string | null {
  const s = String(v)
  return ID.test(s) ? s : null
}
function inesperado(tipo: string): null {
  console.warn('[FCS SPY] formato inesperado do Seller Center', tipo)
  return null
}

const metrica = (m: Bruto): Metrica => ({ valor: num(m?.value), variacao: num(m?.chain_ratio) })

export function traduzirIndicadores(json: unknown): Indicadores | null {
  const r = (json as Bruto)?.result
  if (!r || typeof r !== 'object') return inesperado('indicadores')
  return {
    vendas: metrica(r.paid_gmv),
    pedidos: metrica(r.paid_orders),
    ticket: metrica(r.paid_sales_per_order),
    visitantes: metrica(r.shop_uv),
    cliquesProduto: metrica(r.product_clicks),
    conversao: metrica(r.shop_uv_to_paid_buyers_rate),
  }
}

const CANAIS: [Canal, string][] = [['card', 'product_card'], ['live', 'live'], ['video', 'video'], ['afiliado', 'affiliate']]

export function traduzirOrigens(json: unknown): OrigemVendas | null {
  const o = (json as Bruto)?.result?.overview
  if (!o || typeof o !== 'object') return inesperado('origens')
  return {
    total: num(o.total_sales),
    canais: CANAIS.map(([canal, k]) => ({ canal, vendas: num(o[k]), proporcao: num(o[`${k}_ratio`]), variacao: num(o[`${k}_pct_diff`]) })),
    viaAnuncio: { vendas: num(o.paid_ads), proporcao: num(o.paid_ads_ratio), variacao: num(o.paid_ads_pct_diff) },
  }
}

export function traduzirProdutos(json: unknown): ProdutoVendedor[] | null {
  const itens = (json as Bruto)?.result?.items
  if (!Array.isArray(itens)) return inesperado('produtos')
  const saida: ProdutoVendedor[] = []
  for (const p of itens) {
    const itemId = id(p?.id)
    if (itemId === null) continue
    saida.push({
      itemId,
      nome: typeof p.name === 'string' ? p.name : '',
      impressoes: num(p.product_card_impressions),
      cliques: num(p.product_card_clicks),
      ctr: num(p.ctr),
      visitantes: num(p.uv),
      rejeicao: num(p.bounce_rate),
      carrinho: num(p.add_to_cart_units),
      pedidos: num(p.paid_orders),
      unidades: num(p.paid_units),
      vendas: num(p.paid_sales),
      conversao: num(p.paid_order_conversion_rate),
      variacoes: Array.isArray(p.models)
        ? p.models.map((m: Bruto) => ({ nome: String(m?.name ?? ''), unidades: num(m?.paid_units), vendas: num(m?.paid_sales) }))
        : [],
    })
  }
  return saida
}

export function traduzirCampanhas(json: unknown): Campanha[] | null {
  const lista = (json as Bruto)?.data?.entry_list
  if (!Array.isArray(lista)) return inesperado('campanhas')
  const saida: Campanha[] = []
  for (const e of lista) {
    const campanhaId = id(e?.campaign?.campaign_id)
    if (campanhaId === null) continue
    const r = e.report ?? {}
    const alvo = ads(e.campaign?.roi_two_target)
    saida.push({
      campanhaId,
      itemId: e.manual_product_ads?.item_id == null ? null : id(e.manual_product_ads.item_id),
      titulo: typeof e.title === 'string' ? e.title : '',
      estado: typeof e.state === 'string' ? e.state : '',
      orcamentoDiario: ads(e.campaign?.daily_budget),
      roasAlvo: alvo === 0 ? null : alvo,
      gasto: ads(r.cost),
      receita: ads(r.broad_gmv),
      pedidos: num(r.broad_order),
      roas: num(r.broad_roi),
      cliques: num(r.click),
      impressoes: num(r.impression),
      ctr: num(r.ctr),
      cpc: ads(r.cpc),
      carrinho: num(r.atc),
    })
  }
  return saida
}

export function traduzirAfiliados(json: unknown): Afiliados | null {
  const d = (json as Bruto)?.data
  if (!d || typeof d !== 'object') return inesperado('afiliados')
  return {
    vendas: num(d.total_actual_amount),
    pedidos: num(d.total_order_count),
    comissao: num(d.total_seller_commission),
    roi: num(d.total_roi),
    compradores: num(d.sum_total_buyers),
    variacaoVendas: num(d.actual_amount_ratio),
  }
}

export function ferramentaDaUrl(url: string): string | null {
  const m = url.match(/\/api\/mydata\/marketing\/([a-z-]+)\/key-metrics\//)
  return m ? m[1] : null
}

export function traduzirMarketing(json: unknown, ferramenta: string): FerramentaMarketing | null {
  const k = (json as Bruto)?.result?.key_metrics
  if (!k || typeof k !== 'object') return inesperado('marketing')
  return { ferramenta, vendas: num(k.sales), pedidos: num(k.orders), unidades: num(k.units), compradores: num(k.buyers), variacaoVendas: num(k.sales_pct_diff) }
}
