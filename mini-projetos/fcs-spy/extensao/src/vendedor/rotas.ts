import type { Regras } from '../page/escuta'

export const MARCA_VENDEDOR = 'fcs-spy-vendedor'
export type TipoVendedor = 'indicadores' | 'origens' | 'produtos' | 'campanhas' | 'afiliados' | 'marketing'

// Lista fechada (mapa-seller-center.md). Qualquer outro endpoint, inclusive login e carteira, é ignorado.
const ROTAS: [RegExp, TipoVendedor][] = [
  [/^\/api\/mydata\/v3\/dashboard\/key-metrics\/$/, 'indicadores'],
  [/^\/api\/mydata\/v1\/dashboard\/traffic-sources\/$/, 'origens'],
  [/^\/api\/mydata\/v4\/product\/performance\/$/, 'produtos'],
  [/^\/api\/pas\/v1\/homepage\/query\/$/, 'campanhas'],
  [/^\/api\/v3\/affiliateplatform\/dashboard\/seller_daily$/, 'afiliados'],
  [/^\/api\/mydata\/marketing\/[a-z-]+\/key-metrics\/$/, 'marketing'],
]
export const TIPOS_VENDEDOR: TipoVendedor[] = ['indicadores', 'origens', 'produtos', 'campanhas', 'afiliados', 'marketing']

const PARAMS_PERMITIDOS = ['start_time', 'end_time', 'period', 'order_type', 'page_num', 'page_size', 'promotion_type', 'channel']
const ORIGEM = /^https:\/\/seller\.shopee\.com\.br(?=\/)/

function caminho(url: string): string | null {
  if (url.startsWith('/')) return url.split('?')[0]
  if (!ORIGEM.test(url)) return null
  return url.replace(ORIGEM, '').split('?')[0]
}

export function rotaVendedor(url: string): TipoVendedor | null {
  const c = caminho(url)
  if (c === null) return null
  for (const [padrao, tipo] of ROTAS) if (padrao.test(c)) return tipo
  return null
}

// Endereço publicado sem parâmetro de sessão (SPC_CDS e afins).
export function limparUrlVendedor(url: string): string {
  const u = new URL(url, 'https://seller.shopee.com.br')
  const limpos = new URLSearchParams()
  for (const p of PARAMS_PERMITIDOS) { const v = u.searchParams.get(p); if (v !== null) limpos.set(p, v) }
  const q = limpos.toString()
  return u.pathname + (q ? `?${q}` : '')
}

// Confere de novo no content script: mensagem forjada na página com rota que não bate com o endereço é ignorada.
export function mensagemValida(m: { rota: string; url: string }): boolean {
  return rotaVendedor(m.url) === m.rota
}

export const REGRAS_VENDEDOR: Regras = {
  marca: MARCA_VENDEDOR,
  rotaDe: rotaVendedor,
  exigeJson: () => true,
  aceitaTexto: () => true,
  limparUrl: limparUrlVendedor,
}
