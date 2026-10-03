# FCS SPY v3, fase 4: módulo Vendedor (moldura, coleta passiva, custo por produto)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No Seller Center, a extensão grava em silêncio as respostas dos painéis da loja enquanto o usuário navega, mostra num painel lateral o que já foi lido e quando, e permite salvar o custo de impressão de cada produto.

**Architecture:** A escuta da v1 vira configurável por regras; uma segunda instância roda em `seller.shopee.com.br` com lista fechada de endpoints e endereço limpo de parâmetros de sessão. O content script do vendedor traduz cada resposta para tipos próprios (funções puras), grava por tipo em `chrome.storage.local` e desenha o painel. O custo por produto é um registro `custo:<itemId>` preenchido pela calculadora.

**Tech Stack:** TypeScript, esbuild, Vitest + jsdom, Shadow DOM.

**Referências:** spec `2026-10-02-fcs-spy-v3-design.md` (Frente 3), mapa `mapa-seller-center.md` (endpoints e campos confirmados).

## Global Constraints

- Comandos em `mini-projetos/fcs-spy/extensao/`.
- Escuta nunca altera, atrasa ou repete requisição; tudo em try/catch.
- **Lista fechada**: no Seller Center só os endpoints da tabela da Task 2 são publicados. Nunca login, pedidos, conta ou carteira.
- **Nunca guardar `SPC_CDS`, `SPC_CDS_VER` nem outro parâmetro de sessão**: o endereço publicado mantém só `start_time`, `end_time`, `period`, `page_num`, `page_size`, `promotion_type`, `channel`.
- Escala: `/api/mydata/` em reais; `/api/pas/` dividido por 100000; afiliados em reais.
- Campo ausente vira `null` e aparece como `sem dado`.
- As amostras reais (`testes/amostras/vendedor/`) ficam fora do git; testes usam `testes/amostras/vendedor-exemplo/`.
- Visual v2 (tokens de `ESTILO_BASE`), texto em português, sem emoji, sem travessão.
- Valores em reais têm U+00A0 entre `R$` e o número; nos testes escrever ` `.
- Arquivos usam CRLF: conferir com `git diff` que cada edição entrou.
- Nunca `git add .`/`-A`. Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; mensagem em arquivo temporário fora do repositório, `git commit -F`.

---

### Task 1: Amostras de exemplo e amostra real fora do git

**Files:**
- Modify: `.gitignore` (da extensão)
- Create: `testes/amostras/vendedor-exemplo/key-metrics.json`, `traffic-sources.json`, `product-performance.json`, `ads-campanhas.json`, `afiliados-diario.json`, `marketing-discount.json`

- [ ] **Step 1:** acrescentar ao `.gitignore` da extensão a linha `testes/amostras/vendedor/` (dados reais da loja).
- [ ] **Step 2:** criar os seis arquivos com exatamente este conteúdo (números inventados, estrutura igual à real):

`key-metrics.json`
```json
{"code":0,"msg":"ok","result":{"paid_gmv":{"value":1250.5,"chain_ratio":0.1,"points":[]},"paid_orders":{"value":40,"chain_ratio":-0.05,"points":[]},"paid_sales_per_order":{"value":31.26,"chain_ratio":0.15,"points":[]},"shop_uv":{"value":900,"chain_ratio":0.2,"points":[]},"product_clicks":{"value":1100,"chain_ratio":0.12,"points":[]},"shop_uv_to_paid_buyers_rate":{"value":0.0444,"chain_ratio":-0.1,"points":[]}}}
```

`traffic-sources.json`
```json
{"code":0,"msg":"ok","result":{"overview":{"total_sales":1250.5,"total_sales_pct_diff":0.1,"product_card":1200,"product_card_pct_diff":0.08,"product_card_ratio":0.96,"live":0,"live_pct_diff":0,"live_ratio":0,"video":0,"video_pct_diff":0,"video_ratio":0,"affiliate":50.5,"affiliate_pct_diff":0.5,"affiliate_ratio":0.04,"paid_ads":300,"paid_ads_pct_diff":0.3,"paid_ads_ratio":0.24}}}
```

`product-performance.json`
```json
{"code":0,"msg":"ok","result":{"total":2,"items":[{"id":11111111111,"name":"Produto 1","product_card_impressions":5000,"product_card_clicks":200,"ctr":0.04,"uv":150,"bounce_rate":0.3,"add_to_cart_units":20,"paid_orders":8,"paid_units":9,"paid_sales":360,"paid_order_conversion_rate":0.0533,"models":[{"id":1,"name":"Vermelho","paid_units":6,"paid_sales":240},{"id":2,"name":"Azul","paid_units":3,"paid_sales":120}]},{"id":22222222222,"name":"Produto 2","product_card_impressions":800,"product_card_clicks":4,"ctr":0.005,"uv":4,"bounce_rate":0.5,"add_to_cart_units":0,"paid_orders":0,"paid_units":0,"paid_sales":0,"paid_order_conversion_rate":0,"models":[]}]}}
```

`ads-campanhas.json`
```json
{"code":0,"msg":"OK","data":{"total":2,"entry_list":[{"title":"Produto 1","type":"product_manual","state":"ongoing","campaign":{"campaign_id":900001,"daily_budget":5000000,"roi_two_target":800000},"manual_product_ads":{"item_id":11111111111},"report":{"cost":2000000,"broad_gmv":18000000,"broad_order":5,"broad_roi":9,"click":80,"impression":3000,"ctr":0.0267,"cpc":25000,"atc":10}},{"title":"Produto 2","type":"product_manual","state":"paused","campaign":{"campaign_id":900002,"daily_budget":2000000,"roi_two_target":0},"manual_product_ads":{"item_id":22222222222},"report":{"cost":500000,"broad_gmv":0,"broad_order":0,"broad_roi":0,"click":60,"impression":2500,"ctr":0.024,"cpc":8333,"atc":0}}]}}
```

`afiliados-diario.json`
```json
{"code":0,"msg":"","data":{"list":[],"total_actual_amount":50.5,"total_order_count":2,"total_seller_commission":5.05,"total_roi":10,"sum_total_buyers":2,"actual_amount_ratio":0.5}}
```

`marketing-discount.json`
```json
{"code":0,"msg":"ok","result":{"key_metrics":{"sales":400,"sales_pct_diff":0.2,"orders":12,"orders_pct_diff":0.1,"units":13,"units_pct_diff":0.1,"buyers":11,"buyers_pct_diff":0.1,"sales_per_buyer":36.36,"sales_per_buyer_pct_diff":0.05},"time_series":[]}}
```

- [ ] **Step 3:** conferir `git status --short testes/amostras` (a pasta `vendedor/` não aparece; `vendedor-exemplo/` aparece). Commit: `.gitignore` e a pasta `vendedor-exemplo/`. Mensagem: `fcs-spy fase 4: amostras de exemplo do Seller Center`.

---

### Task 2: Escuta configurável e regras do vendedor

**Files:**
- Modify: `src/page/escuta.ts`, `src/content/ponte.ts`
- Create: `src/vendedor/rotas.ts`, `src/page/entrada-vendedor.ts`
- Test: `testes/escuta.test.ts`, `testes/ponte.test.ts`, `testes/rotas-vendedor.test.ts` (novo)

**Interfaces:**
- Produces:
  - `type Regras = { marca: string; rotaDe(url: string): string | null; exigeJson(rota: string): boolean; aceitaTexto(rota: string, texto: string): boolean; limparUrl?(url: string): string }`
  - `REGRAS_COMPRADOR: Regras` (comportamento atual: `exigeJson` só para `cards`, `aceitaTexto` = `rota !== 'cards' || temCards(texto)`, sem `limparUrl`)
  - `instalarEscuta(w, regras = REGRAS_COMPRADOR)`; `MensagemEscuta = { marca: string; rota: string; url: string; corpo: unknown }`. `Rota` (`'produto' | 'cards'`) continua exportado.
  - `ouvirEscuta(w, aoReceber, filtro = { marca: MARCA, rotas: ['produto', 'cards'] })`
  - em `src/vendedor/rotas.ts`: `MARCA_VENDEDOR = 'fcs-spy-vendedor'`; `type TipoVendedor = 'indicadores' | 'origens' | 'produtos' | 'campanhas' | 'afiliados' | 'marketing'`; `TIPOS_VENDEDOR: TipoVendedor[]`; `rotaVendedor(url): TipoVendedor | null`; `limparUrlVendedor(url): string`; `REGRAS_VENDEDOR: Regras`.

- [ ] **Step 1: Testes que falham**

`testes/rotas-vendedor.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { rotaVendedor, limparUrlVendedor, TIPOS_VENDEDOR } from '../src/vendedor/rotas'

const S = 'https://seller.shopee.com.br'

describe('rotaVendedor', () => {
  it('lista fechada', () => {
    expect(rotaVendedor(`${S}/api/mydata/v3/dashboard/key-metrics/?SPC_CDS=x`)).toBe('indicadores')
    expect(rotaVendedor(`${S}/api/mydata/v1/dashboard/traffic-sources/?a=1`)).toBe('origens')
    expect(rotaVendedor(`${S}/api/mydata/v4/product/performance/?a=1`)).toBe('produtos')
    expect(rotaVendedor(`${S}/api/pas/v1/homepage/query/?a=1`)).toBe('campanhas')
    expect(rotaVendedor(`${S}/api/v3/affiliateplatform/dashboard/seller_daily?a=1`)).toBe('afiliados')
    expect(rotaVendedor(`${S}/api/mydata/marketing/new-discount/key-metrics/?a=1`)).toBe('marketing')
    expect(rotaVendedor('/api/mydata/v4/product/performance/?a=1')).toBe('produtos')
  })
  it('fora da lista não passa', () => {
    expect(rotaVendedor(`${S}/api/mydata/v1/dashboard/traffic-sources/product-contribution/?a=1`)).toBeNull()
    expect(rotaVendedor(`${S}/api/v2/login/`)).toBeNull()
    expect(rotaVendedor(`${S}/api/pas/v1/wallet/get/`)).toBeNull()
    expect(rotaVendedor('https://outro.com/api/mydata/v4/product/performance/')).toBeNull()
  })
  it('seis tipos', () => expect(TIPOS_VENDEDOR).toHaveLength(6))
})

describe('limparUrlVendedor', () => {
  it('tira parâmetros de sessão e mantém os de período e página', () => {
    const u = limparUrlVendedor(`${S}/api/mydata/v4/product/performance/?SPC_CDS=abc&SPC_CDS_VER=2&start_time=10&end_time=20&period=real_time&page_num=2&page_size=10&keyword=x`)
    expect(u).toBe('/api/mydata/v4/product/performance/?start_time=10&end_time=20&period=real_time&page_num=2&page_size=10')
  })
})
```

Em `testes/escuta.test.ts` acrescentar:
```ts
import { REGRAS_VENDEDOR, MARCA_VENDEDOR } from '../src/vendedor/rotas'

describe('instalarEscuta com regras do vendedor', () => {
  it('publica rota da lista com endereço limpo e marca do vendedor', async () => {
    const postMessage = vi.fn()
    class XHRVendedor extends XHRFalso {}
    const w = { postMessage, location: { origin: 'https://seller.shopee.com.br' }, XMLHttpRequest: XHRVendedor,
      fetch: vi.fn(async () => new Response('{"result":{}}', { headers: { 'content-type': 'application/json' } })) }
    instalarEscuta(w as unknown as Parameters<typeof instalarEscuta>[0], REGRAS_VENDEDOR)
    await (w as unknown as { fetch: typeof fetch }).fetch('https://seller.shopee.com.br/api/mydata/v3/dashboard/key-metrics/?SPC_CDS=abc&start_time=1')
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA_VENDEDOR, rota: 'indicadores', url: '/api/mydata/v3/dashboard/key-metrics/?start_time=1', corpo: { result: {} } },
      'https://seller.shopee.com.br',
    )
  })
  it('login nunca é publicado', async () => {
    const postMessage = vi.fn()
    class XHRVendedor2 extends XHRFalso {}
    const w = { postMessage, location: { origin: 'https://seller.shopee.com.br' }, XMLHttpRequest: XHRVendedor2,
      fetch: vi.fn(async () => new Response('{"token":"x"}', { headers: { 'content-type': 'application/json' } })) }
    instalarEscuta(w as unknown as Parameters<typeof instalarEscuta>[0], REGRAS_VENDEDOR)
    await (w as unknown as { fetch: typeof fetch }).fetch('https://seller.shopee.com.br/api/v2/login/')
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
})
```

Em `testes/ponte.test.ts` acrescentar:
```ts
  it('filtro do vendedor aceita a marca e os tipos dele', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido, { marca: 'fcs-spy-vendedor', rotas: ['produtos'] })
    enviar({ marca: 'fcs-spy-vendedor', rota: 'produtos', url: 'u', corpo: {} })
    enviar({ marca: 'fcs-spy', rota: 'cards', url: 'u', corpo: {} })
    expect(recebido).toHaveBeenCalledOnce()
    parar()
  })
```

- [ ] **Step 2: Rodar e ver falhar** (`npx vitest run testes/rotas-vendedor.test.ts testes/escuta.test.ts testes/ponte.test.ts`).

- [ ] **Step 3: Implementar**

`src/page/escuta.ts`: trocar a lógica fixa por regras, sem mudar o comportamento do comprador.
```ts
export type MensagemEscuta = { marca: string; rota: string; url: string; corpo: unknown }

export type Regras = {
  marca: string
  rotaDe(url: string): string | null
  exigeJson(rota: string): boolean
  aceitaTexto(rota: string, texto: string): boolean
  limparUrl?(url: string): string
}

export const REGRAS_COMPRADOR: Regras = {
  marca: MARCA,
  rotaDe,
  exigeJson: rota => rota === 'cards',
  aceitaTexto: (rota, texto) => rota !== 'cards' || temCards(texto),
}
```
Em `instalarEscuta(w, regras: Regras = REGRAS_COMPRADOR)`: usar `regras.rotaDe`; publicar com `marca: regras.marca` e `url: regras.limparUrl ? regras.limparUrl(url) : url`; no fetch, ler o corpo se `rota && (!regras.exigeJson(rota) || json)`; em `publicarTexto`, `if (!regras.aceitaTexto(rota, texto)) return`; no XHR `json`, publicar se `regras.aceitaTexto(rota, JSON.stringify(this.response))`.

`src/content/ponte.ts`:
```ts
import { MARCA, type MensagemEscuta } from '../page/escuta'

export type FiltroEscuta = { marca: string; rotas: string[] }
const FILTRO_COMPRADOR: FiltroEscuta = { marca: MARCA, rotas: ['produto', 'cards'] }

export function ouvirEscuta(w: Window, aoReceber: (m: MensagemEscuta) => void, filtro: FiltroEscuta = FILTRO_COMPRADOR): () => void {
  const ouvinte = (ev: MessageEvent) => {
    if (ev.source !== w) return
    const d = ev.data as Partial<MensagemEscuta> | null
    if (!d || d.marca !== filtro.marca || typeof d.rota !== 'string' || !filtro.rotas.includes(d.rota)) return
    aoReceber(d as MensagemEscuta)
  }
  w.addEventListener('message', ouvinte)
  return () => w.removeEventListener('message', ouvinte)
}
```
Em `src/content/main.ts`, onde `msg.rota` é comparado, nada muda (continua `'produto'`/`'cards'`).

`src/vendedor/rotas.ts`:
```ts
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

const PARAMS_PERMITIDOS = ['start_time', 'end_time', 'period', 'page_num', 'page_size', 'promotion_type', 'channel']
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

export const REGRAS_VENDEDOR: Regras = {
  marca: MARCA_VENDEDOR,
  rotaDe: rotaVendedor,
  exigeJson: () => true,
  aceitaTexto: () => true,
  limparUrl: limparUrlVendedor,
}
```
A ordem dos parâmetros no endereço limpo segue `PARAMS_PERMITIDOS`.

`src/page/entrada-vendedor.ts`:
```ts
import { instalarEscuta } from './escuta'
import { REGRAS_VENDEDOR } from '../vendedor/rotas'

instalarEscuta(window, REGRAS_VENDEDOR)
```

- [ ] **Step 4:** suíte inteira, typecheck. Todos os testes antigos da escuta e da ponte continuam passando sem mudança.
- [ ] **Step 5: Commit** (`fcs-spy fase 4: escuta configurável e lista fechada do Seller Center`).

---

### Task 3: Tradução das respostas do vendedor

**Files:**
- Create: `src/vendedor/tipos.ts`, `src/vendedor/traduzir.ts`
- Test: `testes/traduzir-vendedor.test.ts`

**Interfaces:**
- Produces (em `tipos.ts`):
```ts
export type Metrica = { valor: number | null; variacao: number | null }
export type Indicadores = { vendas: Metrica; pedidos: Metrica; ticket: Metrica; visitantes: Metrica; cliquesProduto: Metrica; conversao: Metrica }
export type Canal = 'card' | 'live' | 'video' | 'afiliado'
export type OrigemVendas = { total: number | null; canais: { canal: Canal; vendas: number | null; proporcao: number | null; variacao: number | null }[]; viaAnuncio: { vendas: number | null; proporcao: number | null; variacao: number | null } }
export type VariacaoVendida = { nome: string; unidades: number | null; vendas: number | null }
export type ProdutoVendedor = { itemId: string; nome: string; impressoes: number | null; cliques: number | null; ctr: number | null; visitantes: number | null; rejeicao: number | null; carrinho: number | null; pedidos: number | null; unidades: number | null; vendas: number | null; conversao: number | null; variacoes: VariacaoVendida[] }
export type Campanha = { campanhaId: string; itemId: string | null; titulo: string; estado: string; orcamentoDiario: number | null; roasAlvo: number | null; gasto: number | null; receita: number | null; pedidos: number | null; roas: number | null; cliques: number | null; impressoes: number | null; ctr: number | null; cpc: number | null; carrinho: number | null }
export type Afiliados = { vendas: number | null; pedidos: number | null; comissao: number | null; roi: number | null; compradores: number | null; variacaoVendas: number | null }
export type FerramentaMarketing = { ferramenta: string; vendas: number | null; pedidos: number | null; unidades: number | null; compradores: number | null; variacaoVendas: number | null }
```
- Produces (em `traduzir.ts`): `traduzirIndicadores(json): Indicadores | null`, `traduzirOrigens(json): OrigemVendas | null`, `traduzirProdutos(json): ProdutoVendedor[] | null`, `traduzirCampanhas(json): Campanha[] | null`, `traduzirAfiliados(json): Afiliados | null`, `traduzirMarketing(json, ferramenta: string): FerramentaMarketing | null`, `ferramentaDaUrl(url: string): string | null`. Formato inesperado devolve `null` com `console.warn('[FCS SPY] formato inesperado do Seller Center', tipo)`.

- [ ] **Step 1: Testes que falham**

`testes/traduzir-vendedor.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import km from './amostras/vendedor-exemplo/key-metrics.json'
import ts from './amostras/vendedor-exemplo/traffic-sources.json'
import pp from './amostras/vendedor-exemplo/product-performance.json'
import ads from './amostras/vendedor-exemplo/ads-campanhas.json'
import af from './amostras/vendedor-exemplo/afiliados-diario.json'
import mk from './amostras/vendedor-exemplo/marketing-discount.json'
import {
  traduzirIndicadores, traduzirOrigens, traduzirProdutos, traduzirCampanhas,
  traduzirAfiliados, traduzirMarketing, ferramentaDaUrl,
} from '../src/vendedor/traduzir'

describe('traduzirIndicadores', () => {
  it('valores em reais e variação', () => {
    const i = traduzirIndicadores(km)!
    expect(i.vendas).toEqual({ valor: 1250.5, variacao: 0.1 })
    expect(i.pedidos).toEqual({ valor: 40, variacao: -0.05 })
    expect(i.ticket.valor).toBe(31.26)
    expect(i.visitantes.valor).toBe(900)
    expect(i.cliquesProduto.valor).toBe(1100)
    expect(i.conversao).toEqual({ valor: 0.0444, variacao: -0.1 })
  })
  it('campo ausente vira null', () => {
    expect(traduzirIndicadores({ result: {} })!.vendas).toEqual({ valor: null, variacao: null })
  })
})

describe('traduzirOrigens', () => {
  it('canais e parte via anúncio separada', () => {
    const o = traduzirOrigens(ts)!
    expect(o.total).toBe(1250.5)
    expect(o.canais.map(c => c.canal)).toEqual(['card', 'live', 'video', 'afiliado'])
    expect(o.canais[0]).toEqual({ canal: 'card', vendas: 1200, proporcao: 0.96, variacao: 0.08 })
    expect(o.viaAnuncio).toEqual({ vendas: 300, proporcao: 0.24, variacao: 0.3 })
  })
})

describe('traduzirProdutos', () => {
  it('funil e variações por produto', () => {
    const p = traduzirProdutos(pp)!
    expect(p).toHaveLength(2)
    expect(p[0]).toEqual({
      itemId: '11111111111', nome: 'Produto 1', impressoes: 5000, cliques: 200, ctr: 0.04, visitantes: 150,
      rejeicao: 0.3, carrinho: 20, pedidos: 8, unidades: 9, vendas: 360, conversao: 0.0533,
      variacoes: [{ nome: 'Vermelho', unidades: 6, vendas: 240 }, { nome: 'Azul', unidades: 3, vendas: 120 }],
    })
  })
  it('id inválido é descartado', () => {
    expect(traduzirProdutos({ result: { items: [{ id: '1"]', name: 'x' }] } })).toEqual([])
  })
})

describe('traduzirCampanhas', () => {
  it('dinheiro e ROAS alvo divididos por 100000', () => {
    const c = traduzirCampanhas(ads)!
    expect(c[0]).toEqual({
      campanhaId: '900001', itemId: '11111111111', titulo: 'Produto 1', estado: 'ongoing',
      orcamentoDiario: 50, roasAlvo: 8, gasto: 20, receita: 180, pedidos: 5, roas: 9,
      cliques: 80, impressoes: 3000, ctr: 0.0267, cpc: 0.25, carrinho: 10,
    })
    expect(c[1].estado).toBe('paused')
    expect(c[1].roasAlvo).toBeNull() // roi_two_target 0 = sem alvo
  })
})

describe('traduzirAfiliados e traduzirMarketing', () => {
  it('afiliados em reais', () => {
    expect(traduzirAfiliados(af)).toEqual({ vendas: 50.5, pedidos: 2, comissao: 5.05, roi: 10, compradores: 2, variacaoVendas: 0.5 })
  })
  it('ferramenta de marketing', () => {
    expect(traduzirMarketing(mk, 'new-discount')).toEqual({ ferramenta: 'new-discount', vendas: 400, pedidos: 12, unidades: 13, compradores: 11, variacaoVendas: 0.2 })
    expect(ferramentaDaUrl('/api/mydata/marketing/new-discount/key-metrics/?start_time=1')).toBe('new-discount')
    expect(ferramentaDaUrl('/api/outra')).toBeNull()
  })
})

describe('formato inesperado', () => {
  it('null com aviso', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirProdutos({})).toBeNull()
    expect(traduzirCampanhas(null)).toBeNull()
    expect(aviso.mock.calls[0][0]).toContain('[FCS SPY]')
    aviso.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** `src/vendedor/tipos.ts` (tipos acima) e `src/vendedor/traduzir.ts`:
```ts
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
```
O cpc da amostra é 25000 → 0,25. `ctr` e `roas` não são divididos.

- [ ] **Step 4:** suíte e typecheck. Rodar também, uma vez, um script descartável que aplica as seis funções à amostra real local (`testes/amostras/vendedor/seller-center-2026-10-02.json`, campo `amostras.<nome>.corpo`) e confirma que nenhuma devolve `null`; colar a saída no relatório. Não commitar o script.
- [ ] **Step 5: Commit** (`fcs-spy fase 4: tradução das respostas do Seller Center`).

---

### Task 4: Coleta gravada por tipo

**Files:**
- Create: `src/vendedor/coleta.ts`
- Test: `testes/coleta.test.ts`

**Interfaces:**
- Consumes: tipos da Task 3, `TipoVendedor`, `Area`, `areaEmMemoria`.
- Produces:
```ts
export type Periodo = { inicio: number | null; fim: number | null; tipo: string | null }
export type Coleta<T> = { lidoEm: number; periodo: Periodo; dados: T }
export type Coletas = {
  indicadores?: Coleta<Indicadores>; origens?: Coleta<OrigemVendas>; produtos?: Coleta<ProdutoVendedor[]>
  campanhas?: Coleta<Campanha[]>; afiliados?: Coleta<Afiliados>; marketing?: Record<string, Coleta<FerramentaMarketing>>
}
export const CHAVE_VENDEDOR = 'vendedor'
export function periodoDaUrl(url: string): Periodo
export function mesmoPeriodo(a: Periodo, b: Periodo): boolean
export function juntarProdutos(antes: Coleta<ProdutoVendedor[]> | undefined, nova: Coleta<ProdutoVendedor[]>): Coleta<ProdutoVendedor[]>
export async function gravarColeta(tipo: TipoVendedor, url: string, json: unknown, agora: number, area?: Area): Promise<boolean>
export async function lerColetas(area?: Area): Promise<Coletas>
```

- [ ] **Step 1: Testes que falham** (`testes/coleta.test.ts`):
```ts
import { describe, it, expect } from 'vitest'
import { periodoDaUrl, mesmoPeriodo, juntarProdutos, gravarColeta, lerColetas, CHAVE_VENDEDOR } from '../src/vendedor/coleta'
import { areaEmMemoria } from './area-memoria'
import km from './amostras/vendedor-exemplo/key-metrics.json'
import pp from './amostras/vendedor-exemplo/product-performance.json'
import mk from './amostras/vendedor-exemplo/marketing-discount.json'

const URL_KM = '/api/mydata/v3/dashboard/key-metrics/?start_time=100&end_time=200&period=past7days'
const URL_PP = (p: number) => `/api/mydata/v4/product/performance/?start_time=100&end_time=200&period=past7days&page_num=${p}`

describe('periodoDaUrl', () => {
  it('lê início, fim e tipo', () => {
    expect(periodoDaUrl(URL_KM)).toEqual({ inicio: 100, fim: 200, tipo: 'past7days' })
    expect(periodoDaUrl('/api/x')).toEqual({ inicio: null, fim: null, tipo: null })
  })
  it('mesmo período', () => {
    expect(mesmoPeriodo(periodoDaUrl(URL_KM), periodoDaUrl(URL_PP(2)))).toBe(true)
    expect(mesmoPeriodo(periodoDaUrl(URL_KM), { inicio: 100, fim: 300, tipo: 'past7days' })).toBe(false)
  })
})

describe('gravarColeta e lerColetas', () => {
  it('grava indicadores com período e hora da leitura', async () => {
    const area = areaEmMemoria()
    expect(await gravarColeta('indicadores', URL_KM, km, 1000, area)).toBe(true)
    const c = await lerColetas(area)
    expect(c.indicadores?.lidoEm).toBe(1000)
    expect(c.indicadores?.periodo.tipo).toBe('past7days')
    expect(c.indicadores?.dados.vendas.valor).toBe(1250.5)
  })
  it('páginas de produtos do mesmo período se juntam; período novo substitui', async () => {
    const area = areaEmMemoria()
    await gravarColeta('produtos', URL_PP(1), pp, 1000, area)
    const outra = { result: { items: [{ id: 33333333333, name: 'Produto 3', paid_orders: 1 }, { id: 11111111111, name: 'Produto 1', paid_orders: 9 }] } }
    await gravarColeta('produtos', URL_PP(2), outra, 2000, area)
    let c = await lerColetas(area)
    expect(c.produtos?.dados.map(p => p.itemId)).toEqual(['11111111111', '22222222222', '33333333333'])
    expect(c.produtos?.dados[0].pedidos).toBe(9)
    expect(c.produtos?.lidoEm).toBe(2000)
    await gravarColeta('produtos', '/api/mydata/v4/product/performance/?start_time=500&end_time=600&period=past30days', outra, 3000, area)
    c = await lerColetas(area)
    expect(c.produtos?.dados).toHaveLength(2)
  })
  it('marketing guardado por ferramenta', async () => {
    const area = areaEmMemoria()
    await gravarColeta('marketing', '/api/mydata/marketing/new-discount/key-metrics/?start_time=1', mk, 1000, area)
    const c = await lerColetas(area)
    expect(c.marketing?.['new-discount'].dados.vendas).toBe(400)
  })
  it('resposta com formato inesperado não grava', async () => {
    const area = areaEmMemoria()
    expect(await gravarColeta('produtos', URL_PP(1), {}, 1000, area)).toBe(false)
    expect(area.dados[CHAVE_VENDEDOR]).toBeUndefined()
  })
  it('tudo numa chave só', async () => {
    const area = areaEmMemoria()
    await gravarColeta('indicadores', URL_KM, km, 1000, area)
    expect(Object.keys(area.dados)).toEqual([CHAVE_VENDEDOR])
  })
})
```
(Silenciar `console.warn` no teste de formato inesperado com `vi.spyOn`, importando `vi`.)

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** `src/vendedor/coleta.ts`:
```ts
import type { TipoVendedor } from './rotas'
import type { Indicadores, OrigemVendas, ProdutoVendedor, Campanha, Afiliados, FerramentaMarketing } from './tipos'
import { traduzirIndicadores, traduzirOrigens, traduzirProdutos, traduzirCampanhas, traduzirAfiliados, traduzirMarketing, ferramentaDaUrl } from './traduzir'
import { areaLocal, type Area } from '../dados/area'

export type Periodo = { inicio: number | null; fim: number | null; tipo: string | null }
export type Coleta<T> = { lidoEm: number; periodo: Periodo; dados: T }
export type Coletas = {
  indicadores?: Coleta<Indicadores>
  origens?: Coleta<OrigemVendas>
  produtos?: Coleta<ProdutoVendedor[]>
  campanhas?: Coleta<Campanha[]>
  afiliados?: Coleta<Afiliados>
  marketing?: Record<string, Coleta<FerramentaMarketing>>
}

export const CHAVE_VENDEDOR = 'vendedor'

const inteiroOuNull = (v: string | null) => (v !== null && /^\d+$/.test(v) ? Number(v) : null)

export function periodoDaUrl(url: string): Periodo {
  const u = new URL(url, 'https://seller.shopee.com.br')
  return { inicio: inteiroOuNull(u.searchParams.get('start_time')), fim: inteiroOuNull(u.searchParams.get('end_time')), tipo: u.searchParams.get('period') }
}

export function mesmoPeriodo(a: Periodo, b: Periodo): boolean {
  return a.inicio === b.inicio && a.fim === b.fim && a.tipo === b.tipo
}

// Cada página da Performance do Produto traz 10 itens: juntamos as páginas do mesmo período.
export function juntarProdutos(antes: Coleta<ProdutoVendedor[]> | undefined, nova: Coleta<ProdutoVendedor[]>): Coleta<ProdutoVendedor[]> {
  if (!antes || !mesmoPeriodo(antes.periodo, nova.periodo)) return nova
  const porId = new Map(antes.dados.map(p => [p.itemId, p]))
  for (const p of nova.dados) porId.set(p.itemId, p)
  return { ...nova, dados: [...porId.values()] }
}

export async function lerColetas(area: Area = areaLocal()): Promise<Coletas> {
  const v = (await area.get(CHAVE_VENDEDOR))[CHAVE_VENDEDOR]
  return v && typeof v === 'object' ? (v as Coletas) : {}
}

export async function gravarColeta(tipo: TipoVendedor, url: string, json: unknown, agora: number, area: Area = areaLocal()): Promise<boolean> {
  const periodo = periodoDaUrl(url)
  const atual = await lerColetas(area)
  const nova = <T>(dados: T): Coleta<T> => ({ lidoEm: agora, periodo, dados })
  switch (tipo) {
    case 'indicadores': { const d = traduzirIndicadores(json); if (!d) return false; atual.indicadores = nova(d); break }
    case 'origens': { const d = traduzirOrigens(json); if (!d) return false; atual.origens = nova(d); break }
    case 'produtos': { const d = traduzirProdutos(json); if (!d) return false; atual.produtos = juntarProdutos(atual.produtos, nova(d)); break }
    case 'campanhas': { const d = traduzirCampanhas(json); if (!d) return false; atual.campanhas = nova(d); break }
    case 'afiliados': { const d = traduzirAfiliados(json); if (!d) return false; atual.afiliados = nova(d); break }
    case 'marketing': {
      const ferramenta = ferramentaDaUrl(url)
      const d = ferramenta ? traduzirMarketing(json, ferramenta) : null
      if (!ferramenta || !d) return false
      atual.marketing = { ...(atual.marketing ?? {}), [ferramenta]: nova(d) }
      break
    }
  }
  await area.set({ [CHAVE_VENDEDOR]: atual })
  return true
}
```

- [ ] **Step 4:** suíte e typecheck.
- [ ] **Step 5: Commit** (`fcs-spy fase 4: coleta do Seller Center gravada por tipo`).

---

### Task 5: Custo por produto

**Files:**
- Create: `src/dados/custos.ts`
- Modify: `src/ui/painel.ts`, `src/content/main.ts`
- Test: `testes/custos.test.ts` (novo), `testes/painel.test.ts`

**Interfaces:**
- Produces: `type CustoProduto = { gramas: number; horas: number; minutos: number }`; `lerCusto(itemId: string, area?): Promise<CustoProduto | null>`; `salvarCusto(itemId: string, c: CustoProduto, area?): Promise<void>`; `lerCustos(itemIds: string[], area?): Promise<Map<string, CustoProduto>>`. Chave `custo:<itemId>`. `DadosPainel` ganha `custoSalvo?: CustoProduto | null` e `aoSalvarCusto?: (c: CustoProduto) => void`.

- [ ] **Step 1: Testes que falham**

`testes/custos.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { lerCusto, salvarCusto, lerCustos } from '../src/dados/custos'
import { areaEmMemoria } from './area-memoria'

describe('custo por produto', () => {
  it('ida e volta', async () => {
    const area = areaEmMemoria()
    await salvarCusto('111', { gramas: 30, horas: 4, minutos: 10 }, area)
    expect(await lerCusto('111', area)).toEqual({ gramas: 30, horas: 4, minutos: 10 })
    expect(area.dados['custo:111']).toBeDefined()
  })
  it('sem custo é null', async () => expect(await lerCusto('999', areaEmMemoria())).toBeNull())
  it('valor salvo estragado é ignorado', async () => {
    expect(await lerCusto('1', areaEmMemoria({ 'custo:1': { gramas: 'x' } }))).toBeNull()
  })
  it('vários de uma vez', async () => {
    const area = areaEmMemoria({ 'custo:1': { gramas: 10, horas: 1, minutos: 0 } })
    const m = await lerCustos(['1', '2'], area)
    expect([...m.keys()]).toEqual(['1'])
  })
})
```

`testes/painel.test.ts`, acrescentar ao `describe('montarPainel')`:
```ts
  it('custo salvo preenche os campos', () => {
    const r = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null, custoSalvo: { gramas: 48, horas: 2, minutos: 5 } }).shadowRoot!
    expect(r.querySelector<HTMLInputElement>('input[name="gramas"]')!.value).toBe('48')
    expect(r.querySelector<HTMLInputElement>('input[name="horas"]')!.value).toBe('2')
    expect(r.querySelector<HTMLInputElement>('input[name="minutos"]')!.value).toBe('5')
  })
  it('salvar custo manda os números digitados', () => {
    const aoSalvarCusto = vi.fn()
    const r = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null, aoSalvarCusto }).shadowRoot!
    preencher(r, 'gramas', '30,5')
    preencher(r, 'horas', '4')
    r.querySelector<HTMLButtonElement>('button.salvar-custo')!.click()
    expect(aoSalvarCusto).toHaveBeenCalledWith({ gramas: 30.5, horas: 4, minutos: 0 })
    expect(r.querySelector('.status-custo')!.textContent).toBe('Custo salvo para este produto')
  })
  it('sem callback, sem botão de salvar custo', () => {
    const r = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    expect(r.querySelector('button.salvar-custo')).toBeNull()
  })
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

`src/dados/custos.ts`:
```ts
import { areaLocal, type Area } from './area'

export type CustoProduto = { gramas: number; horas: number; minutos: number }

const chave = (itemId: string) => `custo:${itemId}`
const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0

function valido(v: unknown): CustoProduto | null {
  const c = v as Partial<CustoProduto> | null
  return c && ok(c.gramas) && ok(c.horas) && ok(c.minutos) ? { gramas: c.gramas!, horas: c.horas!, minutos: c.minutos! } : null
}

export async function lerCusto(itemId: string, area: Area = areaLocal()): Promise<CustoProduto | null> {
  return valido((await area.get(chave(itemId)))[chave(itemId)])
}

export async function salvarCusto(itemId: string, c: CustoProduto, area: Area = areaLocal()): Promise<void> {
  await area.set({ [chave(itemId)]: { gramas: c.gramas, horas: c.horas, minutos: c.minutos } })
}

export async function lerCustos(itemIds: string[], area: Area = areaLocal()): Promise<Map<string, CustoProduto>> {
  const salvo = await area.get(itemIds.map(chave))
  const m = new Map<string, CustoProduto>()
  for (const id of itemIds) { const c = valido(salvo[chave(id)]); if (c) m.set(id, c) }
  return m
}
```

`src/ui/painel.ts`:
- importar `type CustoProduto` de `../dados/custos`; em `DadosPainel` acrescentar `custoSalvo?: CustoProduto | null` e `aoSalvarCusto?: (c: CustoProduto) => void`.
- valores iniciais: `gramas` = `d.custoSalvo ? paraCampo(d.custoSalvo.gramas) : '0'`, idem `horas` e `minutos`.
- depois da linha do Shopee Ads e antes do resultado, se `d.aoSalvarCusto` existir: um `button` com classe `salvar-custo` e texto `Salvar custo deste produto`, e um `span.status-custo` vazio. No clique: `d.aoSalvarCusto({ gramas: lerNumero(gramas.value) ?? 0, horas: lerNumero(horas.value) ?? 0, minutos: lerNumero(minutos.value) ?? 0 })` e o status vira `Custo salvo para este produto`.
- CSS: `.salvar-custo { justify-self: start; background: var(--superficie); color: var(--texto); border: 1px solid var(--linha); border-radius: 999px; padding: 6px 12px; text-transform: none; font-weight: 600; } .status-custo { color: var(--suave); font-size: 11px; }`.

`src/content/main.ts`, em `desenharPainel`: importar `lerCusto`, `salvarCusto`; ler `const custoSalvo = await lerCusto(id.itemId, area).catch(() => null)` junto com a leitura e passar `custoSalvo` e `aoSalvarCusto: c => { salvarCusto(id.itemId, c, area).catch(e => console.warn('[FCS SPY] custo', e)) }` para `montarPainel`.

- [ ] **Step 4:** suíte, typecheck, build.
- [ ] **Step 5: Commit** (`fcs-spy fase 4: custo de impressão salvo por produto`).

---

### Task 6: Painel Vendedor (moldura e aba Coleta)

**Files:**
- Create: `src/vendedor/painel-vendedor.ts`, `src/vendedor/main.ts`
- Modify: `manifest.json`, `build.mjs`
- Test: `testes/painel-vendedor.test.ts`

**Interfaces:**
- Consumes: `Coletas`, `lerColetas`, `gravarColeta`, `CHAVE_VENDEDOR`, `MARCA_VENDEDOR`, `TIPOS_VENDEDOR`, `ouvirEscuta`, `ESTILO_BASE`, `icone`, `marcaFcs`.
- Produces: `ATRIBUTO_VENDEDOR = 'data-fcs-spy-vendedor'`; `textoLidoHa(lidoEm: number, agora: number): string`; `FONTES: { tipo, nome, onde, link }[]`; `montarPainelVendedor(coletas: Coletas, agora: number): HTMLElement`; `montarBotaoVendedor(aoAlternar: () => void): HTMLElement`.

- [ ] **Step 1: Testes que falham** (`testes/painel-vendedor.test.ts`, jsdom):
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarPainelVendedor, montarBotaoVendedor, textoLidoHa, FONTES, ATRIBUTO_VENDEDOR } from '../src/vendedor/painel-vendedor'

const MIN = 60_000

describe('textoLidoHa', () => {
  it('faixas de tempo', () => {
    expect(textoLidoHa(0, 30_000)).toBe('lido agora há pouco')
    expect(textoLidoHa(0, 12 * MIN)).toBe('lido há 12 min')
    expect(textoLidoHa(0, 3 * 60 * MIN)).toBe('lido há 3 h')
    expect(textoLidoHa(0, 2 * 24 * 60 * MIN)).toBe('lido há 2 dias')
    expect(textoLidoHa(0, 24 * 60 * MIN)).toBe('lido há 1 dia')
  })
})

describe('montarPainelVendedor', () => {
  it('uma linha por fonte, com estado de leitura', () => {
    const coletas = { indicadores: { lidoEm: 0, periodo: { inicio: null, fim: null, tipo: 'past7days' }, dados: {} as never } }
    const host = montarPainelVendedor(coletas, 12 * MIN)
    expect(host.hasAttribute(ATRIBUTO_VENDEDOR)).toBe(true)
    const linhas = [...host.shadowRoot!.querySelectorAll('.fonte')]
    expect(linhas).toHaveLength(FONTES.length)
    expect(linhas[0].textContent).toContain('lido há 12 min')
    expect(linhas[1].textContent).toContain('ainda não lido')
    expect(linhas[1].querySelector('a')!.getAttribute('href')).toBe(FONTES[1].link)
  })
  it('marketing conta as ferramentas lidas', () => {
    const coleta = { lidoEm: 0, periodo: { inicio: null, fim: null, tipo: null }, dados: {} as never }
    const host = montarPainelVendedor({ marketing: { 'new-discount': coleta, voucher: coleta } }, MIN)
    const mk = [...host.shadowRoot!.querySelectorAll('.fonte')].find(l => l.textContent!.includes('Marketing'))!
    expect(mk.textContent).toContain('2 ferramentas')
  })
  it('texto sem emoji e sem travessão', () => {
    const t = montarPainelVendedor({}, 0).shadowRoot!.textContent!
    expect(t).not.toMatch(/[–—]/)
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('montarBotaoVendedor', () => {
  it('chama ao clicar e tem nome acessível', () => {
    const aoAlternar = vi.fn()
    const b = montarBotaoVendedor(aoAlternar)
    const botao = b.shadowRoot!.querySelector('button')!
    expect(botao.getAttribute('aria-label')).toBe('Abrir FCS SPY Vendedor')
    botao.click()
    expect(aoAlternar).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

`src/vendedor/painel-vendedor.ts`:
```ts
import type { Coletas } from './coleta'
import { ESTILO_BASE } from '../ui/estilo'
import { icone, marcaFcs } from '../ui/icones'

export const ATRIBUTO_VENDEDOR = 'data-fcs-spy-vendedor'

type Fonte = { tipo: keyof Coletas; nome: string; onde: string; link: string }
export const FONTES: Fonte[] = [
  { tipo: 'indicadores', nome: 'Indicadores do período', onde: 'Dados > Informações Gerenciais > Visão Geral', link: '/datacenter/overview' },
  { tipo: 'origens', nome: 'De onde vêm as vendas', onde: 'Dados > Informações Gerenciais > Visão Geral', link: '/datacenter/overview' },
  { tipo: 'produtos', nome: 'Funil por produto', onde: 'Informações Gerenciais > Produto > Performance do Produto', link: '/datacenter/product/performance' },
  { tipo: 'campanhas', nome: 'Campanhas de Shopee Ads', onde: 'Central de Marketing > Shopee Ads', link: '/portal/marketing/pas/index' },
  { tipo: 'afiliados', nome: 'Afiliados', onde: 'Afiliados do Vendedor > Principais Indicadores', link: '/portal/web-seller-affiliate/dashboard' },
  { tipo: 'marketing', nome: 'Marketing (descontos, cupons)', onde: 'Informações Gerenciais > Marketing', link: '/datacenter/marketing/discount' },
]

const MIN = 60_000
export function textoLidoHa(lidoEm: number, agora: number): string {
  const min = Math.floor((agora - lidoEm) / MIN)
  if (min < 1) return 'lido agora há pouco'
  if (min < 60) return `lido há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `lido há ${h} h`
  const dias = Math.floor(h / 24)
  return `lido há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

const ESTILO_VENDEDOR = `
.painel { background: var(--fundo); border: 1px solid var(--linha); border-radius: 18px; box-shadow: var(--sombra); padding: 16px; display: grid; gap: 14px; font-size: 12px; color: var(--texto); max-height: calc(100vh - 24px); overflow: auto; }
.topo { display: flex; justify-content: space-between; align-items: center; }
.explica { color: var(--suave); }
.fonte { display: grid; gap: 4px; background: var(--superficie); border-radius: var(--raio); padding: 10px 12px; }
.fonte .linha b { font-weight: 700; }
.estado { font-size: 11px; color: var(--suave); }
.estado.lido { color: var(--cor-ok, #15803D); }
.fonte a { color: var(--texto); font-size: 11px; }
`

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texto !== undefined) e.textContent = texto
  return e
}

function estadoDe(f: Fonte, coletas: Coletas, agora: number): { lido: boolean; texto: string } {
  if (f.tipo === 'marketing') {
    const m = coletas.marketing ?? {}
    const lidas = Object.values(m)
    if (!lidas.length) return { lido: false, texto: 'ainda não lido' }
    const ultima = Math.max(...lidas.map(c => c.lidoEm))
    return { lido: true, texto: `${lidas.length} ${lidas.length === 1 ? 'ferramenta' : 'ferramentas'}, ${textoLidoHa(ultima, agora)}` }
  }
  const c = coletas[f.tipo] as { lidoEm: number } | undefined
  return c ? { lido: true, texto: textoLidoHa(c.lidoEm, agora) } : { lido: false, texto: 'ainda não lido' }
}

export function montarPainelVendedor(coletas: Coletas, agora: number): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_VENDEDOR, '')
  host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483646;width:420px'
  const raiz = host.attachShadow({ mode: 'open' })
  const estilo = el('style', '')
  estilo.textContent = ESTILO_BASE + ESTILO_VENDEDOR
  const painel = el('div', 'painel')
  const topo = el('div', 'topo')
  topo.append(marcaFcs('FCS SPY Vendedor'))
  painel.append(topo, el('p', 'explica', 'Os números são lidos enquanto você navega pelas páginas abaixo. Abra cada uma no período que quer analisar.'))
  for (const f of FONTES) {
    const est = estadoDe(f, coletas, agora)
    const caixa = el('div', 'fonte')
    const linha = el('div', 'linha')
    linha.append(el('b', '', f.nome))
    caixa.append(linha, el('span', est.lido ? 'estado lido' : 'estado', est.texto))
    const a = el('a', '', `Abrir: ${f.onde}`)
    a.setAttribute('href', f.link)
    caixa.append(a)
    painel.append(caixa)
  }
  raiz.append(estilo, painel)
  return host
}

export function montarBotaoVendedor(aoAlternar: () => void): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-fcs-spy-vendedor-botao', '')
  host.style.cssText = 'position:fixed;bottom:84px;right:16px;z-index:2147483647'
  const raiz = host.attachShadow({ mode: 'open' })
  const estilo = document.createElement('style')
  estilo.textContent = ESTILO_BASE + '.abrir { width: 44px; height: 44px; border-radius: 14px; background: var(--preto); border: 0; display: grid; place-items: center; cursor: pointer; box-shadow: var(--sombra); } .abrir i { width: 14px; height: 14px; border-radius: 3px; background: var(--ciano); }'
  const botao = document.createElement('button')
  botao.type = 'button'
  botao.className = 'abrir'
  botao.setAttribute('aria-label', 'Abrir FCS SPY Vendedor')
  botao.title = 'FCS SPY Vendedor'
  botao.append(document.createElement('i'))
  botao.addEventListener('click', () => aoAlternar())
  raiz.append(estilo, botao)
  return host
}
```
(`icone` não é usado aqui; não importar se o typecheck reclamar de import sem uso.)

`src/vendedor/main.ts`:
```ts
import { ouvirEscuta } from '../content/ponte'
import { MARCA_VENDEDOR, TIPOS_VENDEDOR, type TipoVendedor } from './rotas'
import { gravarColeta, lerColetas, CHAVE_VENDEDOR } from './coleta'
import { montarPainelVendedor, montarBotaoVendedor, ATRIBUTO_VENDEDOR } from './painel-vendedor'
import { areaLocal } from '../dados/area'

function iniciar(): void {
  const area = areaLocal()
  let aberto = false

  // Logo no início, para não perder a primeira resposta da página.
  ouvirEscuta(window, msg => {
    gravarColeta(msg.rota as TipoVendedor, msg.url, msg.corpo, Date.now(), area)
      .catch(e => console.warn('[FCS SPY] coleta', e))
  }, { marca: MARCA_VENDEDOR, rotas: TIPOS_VENDEDOR })

  async function desenhar() {
    document.querySelector(`[${ATRIBUTO_VENDEDOR}]`)?.remove()
    if (!aberto) return
    const coletas = await lerColetas(area)
    if (!aberto) return
    document.body.append(montarPainelVendedor(coletas, Date.now()))
  }

  function montarBotao() {
    if (!document.body) return
    document.body.append(montarBotaoVendedor(() => {
      aberto = !aberto
      desenhar().catch(e => console.warn('[FCS SPY] painel vendedor', e))
    }))
  }

  chrome.storage.onChanged.addListener((mudancas, nome) => {
    if (nome === 'local' && mudancas[CHAVE_VENDEDOR] && aberto) desenhar().catch(e => console.warn('[FCS SPY] painel vendedor', e))
  })

  if (document.body) montarBotao()
  else document.addEventListener('DOMContentLoaded', montarBotao, { once: true })
}

iniciar()
```

`manifest.json`, acrescentar ao fim de `content_scripts`:
```json
    {
      "matches": ["https://seller.shopee.com.br/*"],
      "js": ["escuta-vendedor.js"],
      "run_at": "document_start",
      "world": "MAIN"
    },
    {
      "matches": ["https://seller.shopee.com.br/*"],
      "js": ["vendedor.js"],
      "run_at": "document_start"
    }
```

`build.mjs`, em `entryPoints` da extensão: `'escuta-vendedor': 'src/page/entrada-vendedor.ts', vendedor: 'src/vendedor/main.ts',`.

- [ ] **Step 4:** suíte, typecheck, build; conferir `ls dist` (inclui `escuta-vendedor.js` e `vendedor.js`) e que `dist/escuta-vendedor.js` não contém `attachShadow` nem `chrome.storage` (mesmo check do bundle da escuta).
- [ ] **Step 5: Commit** (`fcs-spy fase 4: painel Vendedor com estado da coleta`).

---

### Task 7: Checagem manual da fase 4

**Files:**
- Modify: `mini-projetos/fcs-spy/docs/checagem-manual.md`

- [ ] **Step 1:** acrescentar, antes de "## Pendências conhecidas":
```markdown
## Vendedor (fase 4)

Recarregar a extensão em `chrome://extensions` e abrir o Seller Center logado.

- [ ] Botão preto com miolo ciano no canto inferior direito; clicar abre o painel "FCS SPY Vendedor"
- [ ] Antes de navegar: as seis fontes mostram "ainda não lido" com o link da página certa
- [ ] Abrir Informações Gerenciais > Visão Geral: "Indicadores do período" e "De onde vêm as vendas" passam a "lido agora há pouco"
- [ ] Abrir Produto > Performance do Produto e passar para a página 2: "Funil por produto" lido
- [ ] Abrir Shopee Ads: "Campanhas de Shopee Ads" lido
- [ ] Abrir Afiliados > Principais Indicadores: "Afiliados" lido
- [ ] Abrir Informações Gerenciais > Marketing: "Marketing" com 1 ferramenta
- [ ] O painel atualiza sozinho enquanto está aberto
- [ ] Nenhuma verificação de robô nova no Seller Center
- [ ] Console sem erro vermelho vindo da extensão

## Custo por produto (fase 4)

- [ ] Na página de um produto da FCS, preencher gramas e horas na calculadora e clicar "Salvar custo deste produto": aparece "Custo salvo para este produto"
- [ ] Recarregar a página do produto: gramas e horas voltam preenchidos
```
- [ ] **Step 2:** commit só esse arquivo (`fcs-spy fase 4: checagem do módulo Vendedor`).
