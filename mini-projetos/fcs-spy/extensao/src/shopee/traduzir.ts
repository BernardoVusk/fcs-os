import type { Anuncio, Variacoes } from '../nucleo/tipos'

// Único arquivo que conhece o formato da Shopee. Mapa de campos na spec.
const ESCALA_PRECO = 100000

type Bruto = any

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Sinal de ads ainda não confirmado com amostra de anúncio pago:
// só afirma quando o tracking diz true, senão fica null.
function adsDe(tracking: unknown): boolean | null {
  if (typeof tracking !== 'string' || tracking === '') return null
  try {
    return JSON.parse(tracking).is_ads === true ? true : null
  } catch {
    return null
  }
}

export function traduzirCard(item: unknown): Anuncio | null {
  const i = item as Bruto
  const d = i?.item_data
  const a = i?.item_card_displayed_asset
  if (!d || d.itemid == null || d.shopid == null) return null
  const precoBruto = num(d.item_card_display_price?.price)
  if (precoBruto === null) return null
  const vendas = d.item_card_display_sold_count ?? {}
  const ctime = num(d.ctime)
  const flag = a?.seller_flag?.name
  return {
    itemId: String(d.itemid),
    shopId: String(d.shopid),
    titulo: typeof a?.name === 'string' ? a.name : '',
    loja: typeof d.shop_data?.shop_name === 'string' ? d.shop_data.shop_name : null,
    preco: precoBruto / ESCALA_PRECO,
    vendas30d: num(vendas.monthly_sold_count),
    vendasTotal: num(vendas.historical_sold_count),
    criadoEm: ctime === null ? null : new Date(ctime * 1000),
    likes: num(d.liked_count),
    reviews: num(d.item_rating?.rating_count?.[0]),
    nota: num(d.item_rating?.rating_star),
    selos: {
      ads: adsDe(i.search_item_tracking),
      indicado: flag === 'PREFERRED',
      lojaOficial: flag === 'OFFICIAL_SHOP',
    },
  }
}

function traduzirLista(itens: unknown, origem: string): Anuncio[] {
  if (!Array.isArray(itens)) {
    console.warn(`[FCS SPY] formato inesperado em ${origem}: lista de itens ausente`)
    return []
  }
  return itens.map(traduzirCard).filter((a): a is Anuncio => a !== null)
}

export function traduzirBusca(json: unknown): Anuncio[] {
  return traduzirLista((json as Bruto)?.items, 'busca')
}

export function traduzirVitrine(json: unknown): Anuncio[] {
  return traduzirLista((json as Bruto)?.data?.item_cards, 'vitrine')
}

export function traduzirProduto(json: unknown): Variacoes | null {
  const item = (json as Bruto)?.data?.item
  if (!item || item.item_id == null || !Array.isArray(item.models)) {
    console.warn('[FCS SPY] formato inesperado em produto')
    return null
  }
  const opcoes: Variacoes['opcoes'] = []
  for (const m of item.models) {
    const preco = num(m?.price)
    if (preco !== null) opcoes.push({ nome: String(m.name ?? ''), preco: preco / ESCALA_PRECO })
  }
  return { itemId: String(item.item_id), opcoes }
}
