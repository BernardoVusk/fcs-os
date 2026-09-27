# FCS SPY v1: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensão de Chrome que injeta métricas de venda e faturamento nos cards da busca da Shopee, ordena os resultados, guarda histórico por anúncio e calcula o lucro de imprimir o produto em 3D.

**Architecture:** Um script no contexto da página (`world: "MAIN"`) envolve `fetch` e `XMLHttpRequest` e publica por `postMessage` o JSON das respostas de busca, vitrine e produto. O content script traduz esse JSON para o tipo `Anuncio`, calcula métricas, grava histórico em `chrome.storage.local` e desenha cards e painéis em Shadow DOM. Toda regra de negócio fica em funções puras testadas com amostras reais.

**Tech Stack:** Chrome Manifest V3, TypeScript, esbuild (bundle IIFE), Vitest, jsdom.

**Spec:** `mini-projetos/fcs-spy/docs/2026-09-27-fcs-spy-design.md`

## Global Constraints

- Todos os comandos rodam em `mini-projetos/fcs-spy/extensao/` (caminho relativo à raiz do repositório `Fcs OS`).
- A extensão nunca faz requisição à Shopee. Só escuta respostas que a página já recebeu.
- A escuta nunca altera nem atrasa a resposta original. Todo código da escuta fica dentro de try/catch.
- Campo ausente vira `null` e aparece como `sem dado`, nunca como zero.
- Preço da Shopee vem multiplicado por 100000.
- Histórico e configurações ficam em `chrome.storage.local`. Proibido IndexedDB e `localStorage` no content script (pertencem à origem da Shopee).
- Visual: fundo `#0A0A0A`, cards `#141414`, borda `#1F1F1F`, destaque `#00D8FF`, texto `#FFFFFF`, border-radius 0 a 4px, sem sombra.
- Texto de interface em português, sem emoji, sem travessão.
- Log de erro sempre com o prefixo `[FCS SPY]`.
- Nunca commitar arquivo `.har` (já está no `.gitignore` da raiz).
- Commits terminam com a linha de atribuição definida na sessão.

## Mapa de arquivos

```
extensao/
  package.json            scripts e dependências
  tsconfig.json
  vitest.config.ts
  build.mjs               esbuild, gera dist/
  manifest.json
  .gitignore              dist/
  src/
    nucleo/tipos.ts       Anuncio, Variacoes, Config, Leitura, Tendencia
    nucleo/formato.ts     reais, inteiro, pct, SEM_DADO
    nucleo/metricas.ts    taxaShopee, calcularMetricas
    nucleo/calculadora.ts calcular (custo de impressão e lucro)
    shopee/url.ts         idDaUrl, seletorDoLink
    shopee/traduzir.ts    traduzirCard, traduzirBusca, traduzirVitrine, traduzirProduto
    dados/area.ts         tipo Area, areaLocal
    dados/config.ts       CONFIG_PADRAO, mesclar, lerConfig, salvarConfig
    dados/historico.ts    dataLocal, leituraDe, registrar, anterior, comparar, gravarLeituras, ultimaLeitura
    page/escuta.ts        rotaDe, instalarEscuta
    page/entrada.ts       chama instalarEscuta(window)
    content/ponte.ts      ouvirEscuta
    content/main.ts       orquestra tudo na página
    ui/estilo.ts          ESTILO_BASE
    ui/card.ts            montarCard, linkDoProduto, containerDoCard, anexarCard, textoHistorico
    ui/ordenar.ts         CRITERIOS, ordenar, reordenarNaPagina
    ui/barra.ts           montarBarra, aplicarLigado, instalarEstiloGlobal
    ui/painel.ts          montarPainel, textoLeitura
    opcoes/opcoes.ts      CAMPOS, paraTela, daTela, iniciarTela
    opcoes/entrada.ts     chama iniciarTela(document)
    opcoes/opcoes.html
    licenca/licenca.ts    licencaValida (sempre true na v1)
  testes/
    amostras/             respostas reais limpas (já existem)
    area-memoria.ts       Area falsa em memória
    fabrica.ts            anuncio() de teste
    *.test.ts
```

---

### Task 1: Base do projeto, tipos e formatação

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/nucleo/tipos.ts`, `src/nucleo/formato.ts`, `src/dados/area.ts`
- Create: `testes/area-memoria.ts`, `testes/formato.test.ts`

**Interfaces:**
- Produces: tipos `Anuncio`, `Selos`, `Variacoes`, `Config`, `Leitura`, `Tendencia`; `reais(v: number | null): string`, `inteiro(v: number | null): string`, `pct(v: number | null): string`, `SEM_DADO`; tipo `Area`, `areaLocal(): Area`; `areaEmMemoria(inicial?): Area & { dados }` (só testes).

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "fcs-spy",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Instalar dependências**

Run: `npm install -D typescript esbuild vitest jsdom @types/chrome`
Expected: `added N packages`, sem erro.

- [ ] **Step 3: Criar `tsconfig.json`, `vitest.config.ts` e `.gitignore`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"]
  },
  "include": ["src", "testes"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['testes/**/*.test.ts'] },
})
```

`.gitignore`:
```
dist/
```

- [ ] **Step 4: Criar `src/nucleo/tipos.ts`**

```ts
export type Selos = {
  ads: boolean | null
  indicado: boolean
  lojaOficial: boolean
}

export type Anuncio = {
  itemId: string
  shopId: string
  titulo: string
  loja: string | null
  preco: number
  vendas30d: number | null
  vendasTotal: number | null
  criadoEm: Date | null
  likes: number | null
  reviews: number | null
  nota: number | null
  selos: Selos
}

export type Variacoes = {
  itemId: string
  opcoes: { nome: string; preco: number }[]
}

// Percentuais guardados como fração: 0.2 = 20%.
export type Config = {
  comissaoPct: number
  taxaFixa: number
  margens: number[]
  impostoPct: number
  filamentoKg: number
  perdaPct: number
  potenciaW: number
  kwh: number
  desgasteHora: number
  maoDeObraHora: number
  embalagem: number
}

export type Leitura = {
  itemId: string
  data: string // AAAA-MM-DD local
  preco: number
  vendas30d: number | null
  vendasTotal: number | null
}

export type Tendencia = {
  dias: number
  difVendas30d: number | null
  difPreco: number
  seta: 'sobe' | 'cai' | 'estavel' | null
}
```

- [ ] **Step 5: Criar `src/dados/area.ts` e `testes/area-memoria.ts`**

`src/dados/area.ts`:
```ts
export type Area = {
  get(chaves: string | string[]): Promise<Record<string, unknown>>
  set(itens: Record<string, unknown>): Promise<void>
}

export function areaLocal(): Area {
  return chrome.storage.local as unknown as Area
}
```

`testes/area-memoria.ts`:
```ts
import type { Area } from '../src/dados/area'

export function areaEmMemoria(inicial: Record<string, unknown> = {}): Area & { dados: Record<string, unknown> } {
  const dados: Record<string, unknown> = structuredClone(inicial)
  return {
    dados,
    async get(chaves) {
      const lista = Array.isArray(chaves) ? chaves : [chaves]
      return Object.fromEntries(lista.filter(c => c in dados).map(c => [c, structuredClone(dados[c])]))
    },
    async set(itens) {
      Object.assign(dados, structuredClone(itens))
    },
  }
}
```

- [ ] **Step 6: Escrever o teste de formatação**

`testes/formato.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reais, inteiro, pct, SEM_DADO } from '../src/nucleo/formato'

describe('formato', () => {
  it('reais em pt-BR', () => {
    expect(reais(11394.9)).toBe('R$ 11.394,90')
  })
  it('inteiro com separador de milhar', () => {
    expect(inteiro(1151)).toBe('1.151')
  })
  it('pct com uma casa, sem ,0 no inteiro', () => {
    expect(pct(0.161)).toBe('16,1%')
    expect(pct(0.1)).toBe('10%')
  })
  it('null vira sem dado', () => {
    expect(reais(null)).toBe(SEM_DADO)
    expect(inteiro(null)).toBe(SEM_DADO)
    expect(pct(null)).toBe(SEM_DADO)
    expect(SEM_DADO).toBe('sem dado')
  })
})
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run testes/formato.test.ts`
Expected: FAIL, `Failed to resolve import "../src/nucleo/formato"`.

- [ ] **Step 8: Implementar `src/nucleo/formato.ts`**

```ts
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const INTEIRO = new Intl.NumberFormat('pt-BR')

export const SEM_DADO = 'sem dado'

export function reais(v: number | null): string {
  return v === null ? SEM_DADO : BRL.format(v)
}

export function inteiro(v: number | null): string {
  return v === null ? SEM_DADO : INTEIRO.format(v)
}

export function pct(v: number | null): string {
  if (v === null) return SEM_DADO
  return `${(v * 100).toFixed(1).replace('.', ',').replace(/,0$/, '')}%`
}
```

- [ ] **Step 9: Rodar testes e typecheck**

Run: `npx vitest run testes/formato.test.ts && npm run typecheck`
Expected: 4 testes PASS, `tsc` sem erro.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src testes/area-memoria.ts testes/formato.test.ts
git commit -m "fcs-spy: base do projeto, tipos e formatação"
```

---

### Task 2: Tradução das respostas da Shopee e leitura de URL

**Files:**
- Create: `src/shopee/url.ts`, `src/shopee/traduzir.ts`
- Test: `testes/url.test.ts`, `testes/traduzir.test.ts`

**Interfaces:**
- Consumes: `Anuncio`, `Variacoes` de `src/nucleo/tipos.ts`.
- Produces: `idDaUrl(url: string): IdProduto | null`, `seletorDoLink(id: IdProduto): string`, tipo `IdProduto = { shopId: string; itemId: string }`; `traduzirCard(item: unknown): Anuncio | null`, `traduzirBusca(json: unknown): Anuncio[]`, `traduzirVitrine(json: unknown): Anuncio[]`, `traduzirProduto(json: unknown): Variacoes | null`.

- [ ] **Step 1: Escrever o teste de URL**

`testes/url.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { idDaUrl, seletorDoLink } from '../src/shopee/url'

describe('idDaUrl', () => {
  it('lê o padrão -i.shop.item da captura', () => {
    const url = 'https://shopee.com.br/F%C3%B3rmula-1-Miniatura-i.1762381981.58207314279?extraParams=x'
    expect(idDaUrl(url)).toEqual({ shopId: '1762381981', itemId: '58207314279' })
  })
  it('lê o padrão /product/shop/item', () => {
    expect(idDaUrl('https://shopee.com.br/product/12/34')).toEqual({ shopId: '12', itemId: '34' })
  })
  it('busca não é produto', () => {
    expect(idDaUrl('https://shopee.com.br/search?keyword=miniatura%20f1')).toBeNull()
  })
})

describe('seletorDoLink', () => {
  it('cobre os dois padrões', () => {
    expect(seletorDoLink({ shopId: '2', itemId: '1' })).toBe('a[href*="-i.2.1"], a[href*="/product/2/1"]')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/url.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/shopee/url.ts`**

```ts
export type IdProduto = { shopId: string; itemId: string }

const PADROES = [/-i\.(\d+)\.(\d+)/, /\/product\/(\d+)\/(\d+)/]

export function idDaUrl(url: string): IdProduto | null {
  for (const padrao of PADROES) {
    const m = url.match(padrao)
    if (m) return { shopId: m[1], itemId: m[2] }
  }
  return null
}

// Casa por prefixo. Quem usa confirma o id exato com idDaUrl.
export function seletorDoLink(id: IdProduto): string {
  return `a[href*="-i.${id.shopId}.${id.itemId}"], a[href*="/product/${id.shopId}/${id.itemId}"]`
}
```

- [ ] **Step 4: Escrever o teste de tradução**

`testes/traduzir.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import busca from './amostras/busca-miniatura-f1.json'
import vitrine from './amostras/hot-sales-miniatura-f1.json'
import produto from './amostras/pdp-miniatura-f1.json'
import { traduzirBusca, traduzirVitrine, traduzirProduto, traduzirCard } from '../src/shopee/traduzir'

describe('traduzirBusca com amostra real', () => {
  const anuncios = traduzirBusca(busca)

  it('traduz os 60 itens', () => {
    expect(anuncios).toHaveLength(60)
  })

  it('primeiro item com todos os campos', () => {
    expect(anuncios[0]).toEqual(expect.objectContaining({
      itemId: '58207314279',
      shopId: '1762381981',
      loja: 'Importadora Zenit',
      preco: 17.9,
      vendas30d: 196,
      vendasTotal: 1596,
      criadoEm: new Date(1774034515 * 1000),
      likes: 2545,
      reviews: 965,
      nota: 4.923316062176166,
      selos: { ads: null, indicado: true, lojaOficial: false },
    }))
    expect(anuncios[0].titulo).toContain('Miniatura F1 12cm')
  })

  it('segundo item', () => {
    expect(anuncios[1]).toEqual(expect.objectContaining({
      itemId: '58211960177', preco: 19.7, vendas30d: 1345, vendasTotal: 2572, reviews: 1459,
    }))
  })

  it('selos de vendedor', () => {
    expect(anuncios.filter(a => a.selos.indicado)).toHaveLength(34)
    const oficial = anuncios.find(a => a.itemId === '52562334012')!
    expect(oficial.selos).toEqual({ ads: null, indicado: false, lojaOficial: true })
  })
})

describe('traduzirCard', () => {
  it('ads true quando o tracking diz is_ads', () => {
    const item = { ...busca.items[0], search_item_tracking: JSON.stringify({ is_ads: true }) }
    expect(traduzirCard(item)!.selos.ads).toBe(true)
  })
  it('sem preço não vira anúncio', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.item_card_display_price = null
    expect(traduzirCard(item)).toBeNull()
  })
  it('campo ausente vira null', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.item_card_display_sold_count = null
    item.item_data.ctime = undefined
    const a = traduzirCard(item)!
    expect(a.vendas30d).toBeNull()
    expect(a.vendasTotal).toBeNull()
    expect(a.criadoEm).toBeNull()
  })
})

describe('formato inesperado', () => {
  it('devolve lista vazia e avisa no console', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirBusca({})).toEqual([])
    expect(traduzirBusca(null)).toEqual([])
    expect(aviso.mock.calls[0][0]).toContain('[FCS SPY]')
    aviso.mockRestore()
  })
})

describe('traduzirVitrine com amostra real', () => {
  it('traduz os 8 cards', () => {
    const anuncios = traduzirVitrine(vitrine)
    expect(anuncios).toHaveLength(8)
    expect(anuncios[0]).toEqual(expect.objectContaining({ itemId: '58213016622', vendas30d: 8, preco: 23.9 }))
  })
})

describe('traduzirProduto com amostra real', () => {
  it('lê as 5 variações com preço', () => {
    const v = traduzirProduto(produto)!
    expect(v.itemId).toBe('58207314279')
    expect(v.opcoes).toHaveLength(5)
    expect(v.opcoes).toContainEqual({ nome: 'Vermelho', preco: 29.9 })
    expect(v.opcoes).toContainEqual({ nome: 'Kit com 4', preco: 54.9 })
  })
  it('formato inesperado devolve null', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirProduto({ data: {} })).toBeNull()
    aviso.mockRestore()
  })
})
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx vitest run testes/traduzir.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 6: Implementar `src/shopee/traduzir.ts`**

```ts
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
```

- [ ] **Step 7: Rodar testes e typecheck**

Run: `npx vitest run testes/url.test.ts testes/traduzir.test.ts && npm run typecheck`
Expected: todos PASS, `tsc` sem erro.

- [ ] **Step 8: Commit**

```bash
git add src/shopee testes/url.test.ts testes/traduzir.test.ts
git commit -m "fcs-spy: tradução das respostas da Shopee"
```

---

### Task 3: Configurações

**Files:**
- Create: `src/dados/config.ts`
- Test: `testes/config.test.ts`

**Interfaces:**
- Consumes: `Config` de tipos, `Area`/`areaLocal` de `src/dados/area.ts`, `areaEmMemoria` de `testes/area-memoria.ts`.
- Produces: `CHAVE_CONFIG = 'config'`, `CONFIG_PADRAO: Config`, `mesclar(salvo: unknown): Config`, `lerConfig(area?: Area): Promise<Config>`, `salvarConfig(c: Config, area?: Area): Promise<void>`.

- [ ] **Step 1: Escrever o teste**

`testes/config.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CONFIG_PADRAO, CHAVE_CONFIG, mesclar, lerConfig, salvarConfig } from '../src/dados/config'
import { areaEmMemoria } from './area-memoria'

describe('CONFIG_PADRAO', () => {
  it('comissão 20% + R$ 4 e margens 10, 15, 20', () => {
    expect(CONFIG_PADRAO.comissaoPct).toBe(0.2)
    expect(CONFIG_PADRAO.taxaFixa).toBe(4)
    expect(CONFIG_PADRAO.margens).toEqual([0.1, 0.15, 0.2])
  })
})

describe('mesclar', () => {
  it('nada salvo devolve o padrão', () => {
    expect(mesclar(undefined)).toEqual(CONFIG_PADRAO)
  })
  it('aproveita número válido e descarta lixo', () => {
    const c = mesclar({ comissaoPct: 0.18, taxaFixa: 'x', margens: [], kwh: Number.NaN })
    expect(c.comissaoPct).toBe(0.18)
    expect(c.taxaFixa).toBe(4)
    expect(c.margens).toEqual([0.1, 0.15, 0.2])
    expect(c.kwh).toBe(CONFIG_PADRAO.kwh)
  })
  it('não compartilha o array de margens com o padrão', () => {
    const c = mesclar(undefined)
    c.margens.push(0.5)
    expect(CONFIG_PADRAO.margens).toHaveLength(3)
  })
})

describe('lerConfig e salvarConfig', () => {
  it('lê o que foi salvo, completando com padrão', async () => {
    const area = areaEmMemoria({ [CHAVE_CONFIG]: { kwh: 1.1 } })
    const c = await lerConfig(area)
    expect(c.kwh).toBe(1.1)
    expect(c.comissaoPct).toBe(0.2)
  })
  it('ida e volta', async () => {
    const area = areaEmMemoria()
    await salvarConfig({ ...CONFIG_PADRAO, embalagem: 2.5 }, area)
    expect((await lerConfig(area)).embalagem).toBe(2.5)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/config.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/dados/config.ts`**

```ts
import type { Config } from '../nucleo/tipos'
import { areaLocal, type Area } from './area'

export const CHAVE_CONFIG = 'config'

// Ponto de partida. Comissão veio do Ziem Spy (20% + R$ 4).
// Custos de impressão são padrões a ajustar na tela de opções.
export const CONFIG_PADRAO: Config = {
  comissaoPct: 0.2,
  taxaFixa: 4,
  margens: [0.1, 0.15, 0.2],
  impostoPct: 0.04,
  filamentoKg: 120,
  perdaPct: 0.1,
  potenciaW: 150,
  kwh: 0.95,
  desgasteHora: 0.5,
  maoDeObraHora: 20,
  embalagem: 1.5,
}

export function mesclar(salvo: unknown): Config {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Record<string, unknown>
  const c: Config = { ...CONFIG_PADRAO, margens: [...CONFIG_PADRAO.margens] }
  for (const k of Object.keys(CONFIG_PADRAO) as (keyof Config)[]) {
    const v = s[k]
    if (k === 'margens') {
      if (Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number' && Number.isFinite(n))) {
        c.margens = [...v]
      }
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      c[k] = v
    }
  }
  return c
}

export async function lerConfig(area: Area = areaLocal()): Promise<Config> {
  const salvo = await area.get(CHAVE_CONFIG)
  return mesclar(salvo[CHAVE_CONFIG])
}

export async function salvarConfig(c: Config, area: Area = areaLocal()): Promise<void> {
  await area.set({ [CHAVE_CONFIG]: c })
}
```

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run testes/config.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/dados/config.ts testes/config.test.ts
git commit -m "fcs-spy: configurações com padrão e mescla"
```

---

### Task 4: Métricas do card

**Files:**
- Create: `src/nucleo/metricas.ts`, `testes/fabrica.ts`
- Test: `testes/metricas.test.ts`

**Interfaces:**
- Consumes: `Anuncio`, `Config`; `CONFIG_PADRAO`.
- Produces: `taxaShopee(preco: number, c: Pick<Config, 'comissaoPct' | 'taxaFixa'>): number`; tipo `Metricas = { diasNoAr: number | null; recebe: number; faturamento30d: number | null; faturamentoTotal: number | null; mediaDiaria: number | null; custoAlvo: { margem: number; valor: number }[] }`; `calcularMetricas(a: Anuncio, c: Config, hoje: Date): Metricas`; `anuncio(parcial?: Partial<Anuncio>): Anuncio` (fábrica de teste).

- [ ] **Step 1: Criar a fábrica de teste `testes/fabrica.ts`**

Valores do primeiro card do print do Ziem Spy.

```ts
import type { Anuncio } from '../src/nucleo/tipos'

export function anuncio(parcial: Partial<Anuncio> = {}): Anuncio {
  return {
    itemId: '1',
    shopId: '2',
    titulo: 'Par de Manopla Punho de Bike',
    loja: 'Loja Teste',
    preco: 9.9,
    vendas30d: 1151,
    vendasTotal: 4595,
    criadoEm: new Date('2025-09-02T12:00:00Z'),
    likes: 1031,
    reviews: 2354,
    nota: 4.9,
    selos: { ads: null, indicado: false, lojaOficial: false },
    ...parcial,
  }
}
```

- [ ] **Step 2: Escrever o teste**

`testes/metricas.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calcularMetricas, taxaShopee } from '../src/nucleo/metricas'
import { CONFIG_PADRAO } from '../src/dados/config'
import { anuncio } from './fabrica'

const hoje = new Date('2026-09-27T12:00:00Z')

describe('conferência com o print do Ziem Spy', () => {
  const m = calcularMetricas(anuncio(), CONFIG_PADRAO, hoje)

  it('dias no ar', () => expect(m.diasNoAr).toBe(390))
  it('recebe', () => expect(m.recebe).toBeCloseTo(3.92, 2))
  it('faturamento 30D', () => expect(m.faturamento30d).toBeCloseTo(11394.9, 2))
  it('faturamento total', () => expect(m.faturamentoTotal).toBeCloseTo(45490.5, 2))
  it('média diária', () => expect(m.mediaDiaria).toBeCloseTo(379.83, 2))
  it('custo alvo 10, 15, 20', () => {
    expect(m.custoAlvo.map(c => c.margem)).toEqual([0.1, 0.15, 0.2])
    expect(m.custoAlvo[0].valor).toBeCloseTo(2.93, 2)
    expect(m.custoAlvo[1].valor).toBeCloseTo(2.435, 3)
    expect(m.custoAlvo[2].valor).toBeCloseTo(1.94, 2)
  })
  it('outros cards do print', () => {
    expect(calcularMetricas(anuncio({ preco: 15.83 }), CONFIG_PADRAO, hoje).recebe).toBeCloseTo(8.66, 2)
    expect(calcularMetricas(anuncio({ preco: 21.99 }), CONFIG_PADRAO, hoje).recebe).toBeCloseTo(13.59, 2)
  })
})

describe('taxaShopee', () => {
  it('preço x comissão + taxa fixa', () => {
    expect(taxaShopee(15.9, { comissaoPct: 0.2, taxaFixa: 4 })).toBeCloseTo(7.18, 2)
  })
})

describe('campos nulos', () => {
  it('sem vendas e sem data, métricas dependentes viram null', () => {
    const m = calcularMetricas(anuncio({ vendas30d: null, vendasTotal: null, criadoEm: null }), CONFIG_PADRAO, hoje)
    expect(m.diasNoAr).toBeNull()
    expect(m.faturamento30d).toBeNull()
    expect(m.faturamentoTotal).toBeNull()
    expect(m.mediaDiaria).toBeNull()
    expect(m.recebe).toBeCloseTo(3.92, 2)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run testes/metricas.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 4: Implementar `src/nucleo/metricas.ts`**

```ts
import type { Anuncio, Config } from './tipos'

const DIA_MS = 86_400_000

export type Metricas = {
  diasNoAr: number | null
  recebe: number
  faturamento30d: number | null
  faturamentoTotal: number | null
  mediaDiaria: number | null
  custoAlvo: { margem: number; valor: number }[]
}

export function taxaShopee(preco: number, c: Pick<Config, 'comissaoPct' | 'taxaFixa'>): number {
  return preco * c.comissaoPct + c.taxaFixa
}

// Faturamento usa o menor preço atual para todo o período: é estimativa.
export function calcularMetricas(a: Anuncio, c: Config, hoje: Date): Metricas {
  const recebe = a.preco - taxaShopee(a.preco, c)
  const faturamento30d = a.vendas30d === null ? null : a.vendas30d * a.preco
  return {
    diasNoAr: a.criadoEm === null ? null : Math.floor((hoje.getTime() - a.criadoEm.getTime()) / DIA_MS),
    recebe,
    faturamento30d,
    faturamentoTotal: a.vendasTotal === null ? null : a.vendasTotal * a.preco,
    mediaDiaria: faturamento30d === null ? null : faturamento30d / 30,
    custoAlvo: c.margens.map(margem => ({ margem, valor: recebe - margem * a.preco })),
  }
}
```

- [ ] **Step 5: Rodar testes e typecheck**

Run: `npx vitest run testes/metricas.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/nucleo/metricas.ts testes/fabrica.ts testes/metricas.test.ts
git commit -m "fcs-spy: métricas do card conferidas com o Ziem"
```

---

### Task 5: Calculadora 3D

**Files:**
- Create: `src/nucleo/calculadora.ts`
- Test: `testes/calculadora.test.ts`

**Interfaces:**
- Consumes: `Config`, `taxaShopee` de `src/nucleo/metricas.ts`, `CONFIG_PADRAO`.
- Produces: tipo `EntradaCalculo = { preco: number; gramas: number; horas: number; minutosAcabamento: number; ads: boolean; roas: number }`; tipo `ResultadoCalculo = { filamento: number; energia: number; desgaste: number; acabamento: number; custoProducao: number; taxa: number; imposto: number; ads: number; lucro: number; margem: number; roasMinimo: number | null }`; `calcular(e: EntradaCalculo, c: Config): ResultadoCalculo`.

- [ ] **Step 1: Escrever o teste**

`testes/calculadora.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calcular } from '../src/nucleo/calculadora'
import { CONFIG_PADRAO } from '../src/dados/config'
import type { Config } from '../src/nucleo/tipos'

describe('conferência com a calculadora do Ziem Spy', () => {
  // 48 g a R$ 100/kg = 4,80 de produção, + 0,20 de embalagem = 5,00
  const cfg: Config = {
    ...CONFIG_PADRAO,
    filamentoKg: 100, perdaPct: 0, potenciaW: 0, kwh: 0,
    desgasteHora: 0, maoDeObraHora: 0, embalagem: 0.2, impostoPct: 0.04,
  }
  const r = calcular({ preco: 15.9, gramas: 48, horas: 0, minutosAcabamento: 0, ads: true, roas: 30 }, cfg)

  it('custo de produção', () => expect(r.custoProducao).toBeCloseTo(5.0, 2))
  it('taxa Shopee', () => expect(r.taxa).toBeCloseTo(7.18, 2))
  it('imposto', () => expect(r.imposto).toBeCloseTo(0.64, 2))
  it('ads', () => expect(r.ads).toBeCloseTo(0.53, 2))
  it('lucro', () => expect(r.lucro).toBeCloseTo(2.55, 2))
  it('margem', () => expect(r.margem).toBeCloseTo(0.161, 3))
  it('ROAS mínimo', () => expect(r.roasMinimo).toBeCloseTo(5.16, 2))
})

describe('componentes do custo de impressão', () => {
  const cfg: Config = {
    ...CONFIG_PADRAO,
    filamentoKg: 120, perdaPct: 0.1, potenciaW: 200, kwh: 1,
    desgasteHora: 0.5, maoDeObraHora: 20, embalagem: 1,
  }
  const r = calcular({ preco: 100, gramas: 100, horas: 5, minutosAcabamento: 30, ads: false, roas: 0 }, cfg)

  it('filamento com perda', () => expect(r.filamento).toBeCloseTo(13.2, 4))
  it('energia', () => expect(r.energia).toBeCloseTo(1.0, 4))
  it('desgaste', () => expect(r.desgaste).toBeCloseTo(2.5, 4))
  it('acabamento', () => expect(r.acabamento).toBeCloseTo(10, 4))
  it('soma com embalagem', () => expect(r.custoProducao).toBeCloseTo(27.7, 4))
  it('ads desligado custa zero', () => expect(r.ads).toBe(0))
})

describe('conta que não fecha', () => {
  it('ROAS mínimo null quando dá prejuízo mesmo sem ads', () => {
    const r = calcular({ preco: 5, gramas: 10, horas: 1, minutosAcabamento: 0, ads: false, roas: 0 }, CONFIG_PADRAO)
    expect(r.roasMinimo).toBeNull()
    expect(r.lucro).toBeLessThan(0)
  })
  it('preço zero não divide por zero', () => {
    const r = calcular({ preco: 0, gramas: 0, horas: 0, minutosAcabamento: 0, ads: true, roas: 10 }, CONFIG_PADRAO)
    expect(r.margem).toBe(0)
    expect(r.roasMinimo).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/calculadora.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/nucleo/calculadora.ts`**

```ts
import type { Config } from './tipos'
import { taxaShopee } from './metricas'

export type EntradaCalculo = {
  preco: number
  gramas: number
  horas: number
  minutosAcabamento: number
  ads: boolean
  roas: number
}

export type ResultadoCalculo = {
  filamento: number
  energia: number
  desgaste: number
  acabamento: number
  custoProducao: number
  taxa: number
  imposto: number
  ads: number
  lucro: number
  margem: number
  roasMinimo: number | null
}

export function calcular(e: EntradaCalculo, c: Config): ResultadoCalculo {
  const filamento = e.gramas * (c.filamentoKg / 1000) * (1 + c.perdaPct)
  const energia = e.horas * (c.potenciaW / 1000) * c.kwh
  const desgaste = e.horas * c.desgasteHora
  const acabamento = (e.minutosAcabamento / 60) * c.maoDeObraHora
  const custoProducao = filamento + energia + desgaste + acabamento + c.embalagem
  const taxa = taxaShopee(e.preco, c)
  const imposto = e.preco * c.impostoPct
  const ads = e.ads && e.roas > 0 ? e.preco / e.roas : 0
  const lucro = e.preco - taxa - imposto - ads - custoProducao
  const sobraSemAds = e.preco - taxa - imposto - custoProducao
  return {
    filamento, energia, desgaste, acabamento, custoProducao, taxa, imposto, ads, lucro,
    margem: e.preco > 0 ? lucro / e.preco : 0,
    roasMinimo: sobraSemAds > 0 ? e.preco / sobraSemAds : null,
  }
}
```

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run testes/calculadora.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/nucleo/calculadora.ts testes/calculadora.test.ts
git commit -m "fcs-spy: calculadora com custo de impressão 3D"
```

---

### Task 6: Histórico por anúncio

**Files:**
- Create: `src/dados/historico.ts`
- Test: `testes/historico.test.ts`

**Interfaces:**
- Consumes: `Anuncio`, `Leitura`, `Tendencia`; `Area`, `areaLocal`; `areaEmMemoria`, `anuncio` (testes).
- Produces: `MAX_LEITURAS = 90`, `dataLocal(d: Date): string`, `leituraDe(a: Anuncio, agora: Date): Leitura`, `registrar(lista: Leitura[], nova: Leitura): Leitura[]`, `anterior(lista: Leitura[], data: string): Leitura | null`, `comparar(atual: Leitura, ant: Leitura | null): Tendencia | null`, `gravarLeituras(novas: Leitura[], area?: Area): Promise<Map<string, Tendencia | null>>`, `ultimaLeitura(itemId: string, area?: Area): Promise<Leitura | null>`.

- [ ] **Step 1: Escrever o teste**

`testes/historico.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  MAX_LEITURAS, dataLocal, leituraDe, registrar, anterior, comparar, gravarLeituras, ultimaLeitura,
} from '../src/dados/historico'
import type { Leitura } from '../src/nucleo/tipos'
import { areaEmMemoria } from './area-memoria'
import { anuncio } from './fabrica'

const l = (data: string, vendas30d: number | null, preco = 10): Leitura =>
  ({ itemId: '1', data, preco, vendas30d, vendasTotal: 100 })

describe('dataLocal e leituraDe', () => {
  it('data local AAAA-MM-DD', () => {
    expect(dataLocal(new Date(2026, 8, 7, 23, 30))).toBe('2026-09-07')
  })
  it('leitura a partir do anúncio', () => {
    expect(leituraDe(anuncio(), new Date(2026, 8, 27, 10))).toEqual({
      itemId: '1', data: '2026-09-27', preco: 9.9, vendas30d: 1151, vendasTotal: 4595,
    })
  })
})

describe('registrar', () => {
  it('substitui a leitura do mesmo dia', () => {
    const r = registrar([l('2026-09-26', 10), l('2026-09-27', 11)], l('2026-09-27', 15))
    expect(r).toEqual([l('2026-09-26', 10), l('2026-09-27', 15)])
  })
  it('mantém ordem por data', () => {
    const r = registrar([l('2026-09-27', 11)], l('2026-09-20', 5))
    expect(r.map(x => x.data)).toEqual(['2026-09-20', '2026-09-27'])
  })
  it(`guarda no máximo ${MAX_LEITURAS}`, () => {
    let lista: Leitura[] = []
    for (let i = 0; i < 95; i++) lista = registrar(lista, l(dataLocal(new Date(2026, 0, 1 + i)), i))
    expect(lista).toHaveLength(MAX_LEITURAS)
    expect(lista[0].vendas30d).toBe(5)
  })
})

describe('anterior', () => {
  it('mais recente antes da data', () => {
    const lista = [l('2026-09-20', 1), l('2026-09-25', 2), l('2026-09-27', 3)]
    expect(anterior(lista, '2026-09-27')?.data).toBe('2026-09-25')
    expect(anterior(lista, '2026-09-20')).toBeNull()
  })
})

describe('comparar', () => {
  it('sobe', () => {
    expect(comparar(l('2026-09-27', 130, 11), l('2026-09-20', 10, 10)))
      .toEqual({ dias: 7, difVendas30d: 120, difPreco: 1, seta: 'sobe' })
  })
  it('cai', () => expect(comparar(l('2026-09-27', 5), l('2026-09-26', 10))?.seta).toBe('cai'))
  it('estável', () => expect(comparar(l('2026-09-27', 10), l('2026-09-26', 10))?.seta).toBe('estavel'))
  it('sem vendas, seta null', () => {
    expect(comparar(l('2026-09-27', null), l('2026-09-26', 10))).toEqual(
      { dias: 1, difVendas30d: null, difPreco: 0, seta: null })
  })
  it('sem anterior, null', () => expect(comparar(l('2026-09-27', 10), null)).toBeNull())
})

describe('gravarLeituras e ultimaLeitura', () => {
  it('primeira leitura, depois tendência no dia seguinte', async () => {
    const area = areaEmMemoria()
    const t1 = await gravarLeituras([l('2026-09-26', 10)], area)
    expect(t1.get('1')).toBeNull()
    const t2 = await gravarLeituras([l('2026-09-27', 14)], area)
    expect(t2.get('1')).toEqual({ dias: 1, difVendas30d: 4, difPreco: 0, seta: 'sobe' })
    expect(area.dados['h:1']).toHaveLength(2)
    expect((await ultimaLeitura('1', area))?.vendas30d).toBe(14)
  })
  it('mesmo dia de novo substitui e compara com o dia anterior', async () => {
    const area = areaEmMemoria()
    await gravarLeituras([l('2026-09-26', 10)], area)
    await gravarLeituras([l('2026-09-27', 14)], area)
    const t = await gravarLeituras([l('2026-09-27', 20)], area)
    expect(t.get('1')?.difVendas30d).toBe(10)
    expect(area.dados['h:1']).toHaveLength(2)
  })
  it('sem leitura, ultimaLeitura é null', async () => {
    expect(await ultimaLeitura('999', areaEmMemoria())).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/historico.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/dados/historico.ts`**

```ts
import type { Anuncio, Leitura, Tendencia } from '../nucleo/tipos'
import { areaLocal, type Area } from './area'

export const MAX_LEITURAS = 90
const DIA_MS = 86_400_000
const chave = (itemId: string) => `h:${itemId}`

export function dataLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function leituraDe(a: Anuncio, agora: Date): Leitura {
  return { itemId: a.itemId, data: dataLocal(agora), preco: a.preco, vendas30d: a.vendas30d, vendasTotal: a.vendasTotal }
}

export function registrar(lista: Leitura[], nova: Leitura): Leitura[] {
  return [...lista.filter(x => x.data !== nova.data), nova]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-MAX_LEITURAS)
}

export function anterior(lista: Leitura[], data: string): Leitura | null {
  let achada: Leitura | null = null
  for (const x of lista) if (x.data < data && (!achada || x.data > achada.data)) achada = x
  return achada
}

export function comparar(atual: Leitura, ant: Leitura | null): Tendencia | null {
  if (!ant) return null
  const dif = atual.vendas30d !== null && ant.vendas30d !== null ? atual.vendas30d - ant.vendas30d : null
  return {
    dias: Math.round((Date.parse(atual.data) - Date.parse(ant.data)) / DIA_MS),
    difVendas30d: dif,
    difPreco: atual.preco - ant.preco,
    seta: dif === null ? null : dif > 0 ? 'sobe' : dif < 0 ? 'cai' : 'estavel',
  }
}

function listaDe(v: unknown): Leitura[] {
  return Array.isArray(v) ? (v as Leitura[]) : []
}

// Uma resposta de busca vira um get e um set para todos os itens.
export async function gravarLeituras(novas: Leitura[], area: Area = areaLocal()): Promise<Map<string, Tendencia | null>> {
  const salvo = await area.get(novas.map(n => chave(n.itemId)))
  const atualizado: Record<string, Leitura[]> = {}
  const tendencias = new Map<string, Tendencia | null>()
  for (const n of novas) {
    const k = chave(n.itemId)
    const lista = atualizado[k] ?? listaDe(salvo[k])
    tendencias.set(n.itemId, comparar(n, anterior(lista, n.data)))
    atualizado[k] = registrar(lista, n)
  }
  await area.set(atualizado)
  return tendencias
}

export async function ultimaLeitura(itemId: string, area: Area = areaLocal()): Promise<Leitura | null> {
  const k = chave(itemId)
  return listaDe((await area.get(k))[k]).at(-1) ?? null
}
```

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run testes/historico.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/dados/historico.ts testes/historico.test.ts
git commit -m "fcs-spy: histórico por anúncio com tendência"
```

---

### Task 7: Escuta na página e ponte para o content script

**Files:**
- Create: `src/page/escuta.ts`, `src/page/entrada.ts`, `src/content/ponte.ts`
- Test: `testes/escuta.test.ts`, `testes/ponte.test.ts`

**Interfaces:**
- Produces: `MARCA = 'fcs-spy'`, tipo `Rota = 'busca' | 'vitrine' | 'produto'`, tipo `MensagemEscuta = { marca: 'fcs-spy'; rota: Rota; url: string; corpo: unknown }`, `rotaDe(url: string): Rota | null`, `instalarEscuta(w: JanelaEscutavel): void`; `ouvirEscuta(w: Window, aoReceber: (m: MensagemEscuta) => void): () => void`.

- [ ] **Step 1: Escrever o teste da escuta**

`testes/escuta.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { rotaDe, instalarEscuta, MARCA } from '../src/page/escuta'

const BUSCA = 'https://shopee.com.br/api/v4/search/search_items?keyword=miniatura%20f1&limit=60'

class XHRFalso {
  responseType = ''
  responseText = ''
  response: unknown = null
  ouvintes: (() => void)[] = []
  open(_metodo: string, _url: string) {}
  addEventListener(_tipo: string, f: () => void) { this.ouvintes.push(f) }
}

function janelaFalsa(corpo: string) {
  const postMessage = vi.fn()
  // Subclasse nova por teste: instalarEscuta troca o open do protótipo.
  class XHRDoTeste extends XHRFalso {}
  const w = {
    postMessage,
    location: { origin: 'https://shopee.com.br' },
    fetch: vi.fn(async () => new Response(corpo)),
    XMLHttpRequest: XHRDoTeste,
  }
  instalarEscuta(w as unknown as Parameters<typeof instalarEscuta>[0])
  return { w: w as unknown as { fetch: typeof fetch; XMLHttpRequest: typeof XHRFalso }, postMessage }
}

describe('rotaDe', () => {
  it('reconhece as três rotas', () => {
    expect(rotaDe(BUSCA)).toBe('busca')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/hot_sales/get_item_cards?item_id=1')).toBe('vitrine')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/get_pc?item_id=1&shop_id=2')).toBe('produto')
  })
  it('ignora o resto', () => {
    expect(rotaDe('https://shopee.com.br/api/v4/web/subcart')).toBeNull()
  })
})

describe('instalarEscuta: fetch', () => {
  it('publica o JSON da busca e devolve a resposta intacta', async () => {
    const { w, postMessage } = janelaFalsa('{"items":[]}')
    const r = await w.fetch(BUSCA)
    expect(await r.json()).toEqual({ items: [] })
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'busca', url: BUSCA, corpo: { items: [] } },
      'https://shopee.com.br',
    )
  })
  it('não publica rota que não interessa', async () => {
    const { w, postMessage } = janelaFalsa('{}')
    await w.fetch('https://shopee.com.br/api/v4/web/subcart')
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
  it('JSON inválido não quebra nada', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { w, postMessage } = janelaFalsa('<html>')
    const r = await w.fetch(BUSCA)
    expect(await r.text()).toBe('<html>')
    await new Promise(res => setTimeout(res, 10))
    expect(postMessage).not.toHaveBeenCalled()
    aviso.mockRestore()
  })
})

describe('instalarEscuta: XMLHttpRequest', () => {
  it('publica resposta de texto no load', () => {
    const { w, postMessage } = janelaFalsa('{}')
    const x = new w.XMLHttpRequest()
    x.open('GET', BUSCA)
    x.responseText = '{"items":[1]}'
    x.ouvintes.forEach(f => f())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'busca', url: BUSCA, corpo: { items: [1] } },
      'https://shopee.com.br',
    )
  })
  it('publica resposta json no load', () => {
    const { w, postMessage } = janelaFalsa('{}')
    const x = new w.XMLHttpRequest()
    x.open('GET', BUSCA)
    x.responseType = 'json'
    x.response = { items: [2] }
    x.ouvintes.forEach(f => f())
    expect(postMessage.mock.calls[0][0].corpo).toEqual({ items: [2] })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/escuta.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/page/escuta.ts` e `src/page/entrada.ts`**

`src/page/escuta.ts`:
```ts
// Roda no contexto da página (world MAIN). Só observa respostas que a
// Shopee já recebeu. Nunca altera, atrasa ou refaz requisição.

export const MARCA = 'fcs-spy'
export type Rota = 'busca' | 'vitrine' | 'produto'
export type MensagemEscuta = { marca: typeof MARCA; rota: Rota; url: string; corpo: unknown }

const ROTAS: [string, Rota][] = [
  ['/api/v4/search/search_items', 'busca'],
  ['/api/v4/pdp/hot_sales/get_item_cards', 'vitrine'],
  ['/api/v4/pdp/get_pc', 'produto'],
]

export function rotaDe(url: string): Rota | null {
  for (const [trecho, rota] of ROTAS) if (url.includes(trecho)) return rota
  return null
}

type JanelaEscutavel = {
  fetch: typeof fetch
  postMessage: (msg: unknown, origem: string) => void
  location: { origin: string }
  XMLHttpRequest: typeof XMLHttpRequest
}

export function instalarEscuta(w: JanelaEscutavel): void {
  const publicar = (rota: Rota, url: string, corpo: unknown) => {
    const msg: MensagemEscuta = { marca: MARCA, rota, url, corpo }
    w.postMessage(msg, w.location.origin)
  }
  const publicarTexto = (rota: Rota, url: string, texto: string) => {
    try {
      publicar(rota, url, JSON.parse(texto))
    } catch (e) {
      console.warn('[FCS SPY] resposta ilegível', rota, e)
    }
  }

  const fetchOriginal = w.fetch
  w.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const resposta = await fetchOriginal.apply(w, args)
    try {
      const entrada = args[0]
      const url = resposta.url || (typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url)
      const rota = rotaDe(url)
      if (rota) resposta.clone().text().then(t => publicarTexto(rota, url, t), () => {})
    } catch (e) {
      console.warn('[FCS SPY] escuta fetch', e)
    }
    return resposta
  }

  const proto = w.XMLHttpRequest.prototype
  const openOriginal = proto.open as (...a: unknown[]) => void
  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    try {
      const url = String(args[1])
      const rota = rotaDe(url)
      if (rota) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === 'json') publicar(rota, url, this.response)
            else if (this.responseType === '' || this.responseType === 'text') publicarTexto(rota, url, this.responseText)
          } catch (e) {
            console.warn('[FCS SPY] escuta xhr', e)
          }
        })
      }
    } catch (e) {
      console.warn('[FCS SPY] escuta xhr', e)
    }
    return openOriginal.apply(this, args)
  } as typeof proto.open
}
```

`src/page/entrada.ts`:
```ts
import { instalarEscuta } from './escuta'

instalarEscuta(window)
```

- [ ] **Step 4: Rodar o teste da escuta**

Run: `npx vitest run testes/escuta.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste da ponte**

`testes/ponte.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { ouvirEscuta } from '../src/content/ponte'

const enviar = (data: unknown, source: Window | null = window) =>
  window.dispatchEvent(new MessageEvent('message', { data, source }))

describe('ouvirEscuta', () => {
  it('entrega mensagem válida da escuta', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido)
    const msg = { marca: 'fcs-spy', rota: 'busca', url: 'u', corpo: { items: [] } }
    enviar(msg)
    expect(recebido).toHaveBeenCalledWith(msg)
    parar()
  })
  it('ignora outra marca, rota inválida e outra janela', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido)
    enviar({ marca: 'outra', rota: 'busca' })
    enviar({ marca: 'fcs-spy', rota: 'carrinho' })
    enviar(null)
    enviar({ marca: 'fcs-spy', rota: 'busca', url: 'u', corpo: {} }, null)
    expect(recebido).not.toHaveBeenCalled()
    parar()
  })
  it('parar remove o ouvinte', () => {
    const recebido = vi.fn()
    ouvirEscuta(window, recebido)()
    enviar({ marca: 'fcs-spy', rota: 'busca', url: 'u', corpo: {} })
    expect(recebido).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run testes/ponte.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 7: Implementar `src/content/ponte.ts`**

```ts
import { MARCA, type MensagemEscuta, type Rota } from '../page/escuta'

const ROTAS_VALIDAS: Rota[] = ['busca', 'vitrine', 'produto']

export function ouvirEscuta(w: Window, aoReceber: (m: MensagemEscuta) => void): () => void {
  const ouvinte = (ev: MessageEvent) => {
    if (ev.source !== w) return
    const d = ev.data as Partial<MensagemEscuta> | null
    if (!d || d.marca !== MARCA || !ROTAS_VALIDAS.includes(d.rota as Rota)) return
    aoReceber(d as MensagemEscuta)
  }
  w.addEventListener('message', ouvinte)
  return () => w.removeEventListener('message', ouvinte)
}
```

- [ ] **Step 8: Rodar testes e typecheck**

Run: `npx vitest run testes/escuta.test.ts testes/ponte.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 9: Commit**

```bash
git add src/page src/content/ponte.ts testes/escuta.test.ts testes/ponte.test.ts
git commit -m "fcs-spy: escuta das respostas e ponte para o content script"
```

---

### Task 8: Card enriquecido

**Files:**
- Create: `src/ui/estilo.ts`, `src/ui/card.ts`
- Test: `testes/card.test.ts`

**Interfaces:**
- Consumes: `Anuncio`, `Tendencia`; `Metricas`, `calcularMetricas`; `reais`, `inteiro`, `pct`, `SEM_DADO`; `idDaUrl`, `seletorDoLink`; `CONFIG_PADRAO`, `anuncio` (testes).
- Produces: `ESTILO_BASE: string`; `ATRIBUTO_CARD = 'data-fcs-spy-card'`; tipo `EstadoHistorico = Tendencia | null | 'indisponivel'`; tipo `DadosCard = { anuncio: Anuncio; metricas: Metricas; historico: EstadoHistorico }`; `textoHistorico(h: EstadoHistorico): string`; `montarCard(d: DadosCard): HTMLElement`; `linkDoProduto(raiz: ParentNode, a: Pick<Anuncio, 'shopId' | 'itemId'>): HTMLAnchorElement | null`; `containerDoCard(link: HTMLElement): HTMLElement | null`; `anexarCard(container: HTMLElement, card: HTMLElement): void`.

- [ ] **Step 1: Escrever o teste**

`testes/card.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  montarCard, linkDoProduto, containerDoCard, anexarCard, textoHistorico, ATRIBUTO_CARD,
} from '../src/ui/card'
import { calcularMetricas } from '../src/nucleo/metricas'
import { CONFIG_PADRAO } from '../src/dados/config'
import { anuncio } from './fabrica'
import type { Anuncio } from '../src/nucleo/tipos'

const hoje = new Date('2026-09-27T12:00:00Z')
const card = (a: Anuncio, historico: Parameters<typeof textoHistorico>[0] = null) =>
  montarCard({ anuncio: a, metricas: calcularMetricas(a, CONFIG_PADRAO, hoje), historico })
const texto = (host: HTMLElement) => host.shadowRoot!.textContent ?? ''

describe('montarCard', () => {
  it('mostra as métricas conferidas', () => {
    const host = card(anuncio())
    const t = texto(host)
    expect(host.getAttribute(ATRIBUTO_CARD)).toBe('1')
    expect(t).toContain('390 dias no ar')
    expect(t).toContain('recebe R$ 3,92')
    expect(t).toContain('1.151')
    expect(t).toContain('4.595')
    expect(t).toContain('R$ 11.394,90')
    expect(t).toContain('R$ 45.490,50')
    expect(t).toContain('R$ 379,83')
    expect(t).toContain('10% R$ 2,93')
    expect(t).toContain('est.')
    expect(t).toContain('primeira leitura')
    expect(t).toContain('Loja Teste')
  })
  it('campo nulo vira sem dado', () => {
    const t = texto(card(anuncio({ vendas30d: null, criadoEm: null })))
    expect(t).toContain('sem dado')
  })
  it('selos só quando existem', () => {
    expect(texto(card(anuncio()))).not.toContain('Indicado')
    const t = texto(card(anuncio({ selos: { ads: true, indicado: true, lojaOficial: false } })))
    expect(t).toContain('Indicado')
    expect(t).toContain('Ads')
  })
  it('sem travessão e sem emoji', () => {
    const t = texto(card(anuncio()))
    expect(t).not.toMatch(/[–—]/)
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('textoHistorico', () => {
  it('estados', () => {
    expect(textoHistorico(null)).toBe('primeira leitura')
    expect(textoHistorico('indisponivel')).toBe('histórico indisponível')
    expect(textoHistorico({ dias: 7, difVendas30d: 120, difPreco: 0, seta: 'sobe' }))
      .toBe('subindo: +120 vendas 30D em 7 dias')
    expect(textoHistorico({ dias: 1, difVendas30d: -5, difPreco: 0, seta: 'cai' }))
      .toBe('caindo: -5 vendas 30D em 1 dia')
    expect(textoHistorico({ dias: 2, difVendas30d: 0, difPreco: 0, seta: 'estavel' }))
      .toBe('estável: 0 vendas 30D em 2 dias')
    expect(textoHistorico({ dias: 3, difVendas30d: null, difPreco: 0, seta: null }))
      .toBe('sem dado de vendas, última leitura há 3 dias')
  })
})

describe('localizar e anexar', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li id="um"><a href="/Produto-i.2.1?sp_atk=x">p</a></li>
        <li id="dez"><a href="/Outro-i.2.10">q</a></li>
      </ul>`
  })
  it('acha o link exato, não o de id parecido', () => {
    expect(linkDoProduto(document, { shopId: '2', itemId: '1' })?.textContent).toBe('p')
    expect(linkDoProduto(document, { shopId: '2', itemId: '10' })?.textContent).toBe('q')
    expect(linkDoProduto(document, { shopId: '2', itemId: '3' })).toBeNull()
  })
  it('container é o li, e anexar não duplica', () => {
    const container = containerDoCard(linkDoProduto(document, { shopId: '2', itemId: '1' })!)!
    expect(container.id).toBe('um')
    anexarCard(container, card(anuncio()))
    anexarCard(container, card(anuncio()))
    expect(container.querySelectorAll(`[${ATRIBUTO_CARD}]`)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/card.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/ui/estilo.ts`**

```ts
// Identidade FCS: preto, ciano, cantos retos, sem sombra.
export const ESTILO_BASE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Inter, Poppins, system-ui, sans-serif; }
.card, .painel, .barra {
  background: #0A0A0A; color: #FFFFFF; border: 1px solid #1F1F1F;
  border-radius: 2px; font-size: 11px; line-height: 1.4;
}
button {
  background: #00D8FF; color: #0A0A0A; border: 0; border-radius: 2px;
  font-weight: 700; text-transform: uppercase; cursor: pointer; font-size: 10px; padding: 2px 6px;
}
input, select {
  background: #141414; color: #FFFFFF; border: 1px solid #1F1F1F;
  border-radius: 2px; font-size: 11px; padding: 2px 4px;
}
`
```

- [ ] **Step 4: Implementar `src/ui/card.ts`**

```ts
import type { Anuncio, Tendencia } from '../nucleo/tipos'
import type { Metricas } from '../nucleo/metricas'
import { reais, inteiro, pct, SEM_DADO } from '../nucleo/formato'
import { idDaUrl, seletorDoLink } from '../shopee/url'
import { ESTILO_BASE } from './estilo'

export const ATRIBUTO_CARD = 'data-fcs-spy-card'
export type EstadoHistorico = Tendencia | null | 'indisponivel'
export type DadosCard = { anuncio: Anuncio; metricas: Metricas; historico: EstadoHistorico }

const ESTILO_CARD = `
.card { padding: 8px; margin-top: 4px; display: grid; gap: 2px; }
.topo { display: flex; justify-content: space-between; color: #00D8FF; font-weight: 700; text-transform: uppercase; }
.linha { display: flex; gap: 4px; align-items: baseline; }
.rotulo { color: #9A9A9A; }
.valor { margin-left: auto; font-weight: 600; }
.est { color: #00D8FF; opacity: .6; font-size: 9px; }
.alvo, .selos, .loja { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 4px; }
.pilula, .selo { border: 1px solid rgba(0, 216, 255, .3); padding: 0 4px; border-radius: 2px; }
.historico { color: #00D8FF; margin-top: 4px; }
.nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.rodape { color: #6A6A6A; font-size: 9px; margin-top: 4px; }
`

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texto !== undefined) e.textContent = texto
  return e
}

function linha(rotulo: string, valor: string, estimativa = false): HTMLElement {
  const l = el('div', 'linha')
  l.append(el('span', 'rotulo', rotulo), el('span', 'valor', valor))
  if (estimativa) l.append(el('span', 'est', 'est.'))
  return l
}

export function textoHistorico(h: EstadoHistorico): string {
  if (h === 'indisponivel') return 'histórico indisponível'
  if (h === null) return 'primeira leitura'
  const dias = `${h.dias} ${h.dias === 1 ? 'dia' : 'dias'}`
  if (h.difVendas30d === null || h.seta === null) return `sem dado de vendas, última leitura há ${dias}`
  const palavra = { sobe: 'subindo', cai: 'caindo', estavel: 'estável' }[h.seta]
  const sinal = h.difVendas30d > 0 ? '+' : ''
  return `${palavra}: ${sinal}${inteiro(h.difVendas30d)} vendas 30D em ${dias}`
}

export function montarCard(d: DadosCard): HTMLElement {
  const { anuncio: a, metricas: m } = d
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_CARD, a.itemId)
  host.addEventListener('click', ev => ev.stopPropagation())
  const raiz = host.attachShadow({ mode: 'open' })

  const estilo = el('style', '')
  estilo.textContent = ESTILO_BASE + ESTILO_CARD
  const card = el('div', 'card')

  const topo = el('div', 'topo')
  topo.append(
    el('span', '', m.diasNoAr === null ? SEM_DADO : `${m.diasNoAr} dias no ar`),
    el('span', '', `recebe ${reais(m.recebe)}`),
  )
  card.append(
    topo,
    linha('Preço (menor)', reais(a.preco)),
    linha('Vendas 30D', inteiro(a.vendas30d)),
    linha('Vendas total', inteiro(a.vendasTotal)),
    linha('Faturamento 30D', reais(m.faturamento30d), true),
    linha('Faturamento total', reais(m.faturamentoTotal), true),
    linha('Média diária', reais(m.mediaDiaria), true),
  )

  const alvo = el('div', 'alvo')
  alvo.append(el('span', 'rotulo', 'Custo alvo'))
  for (const c of m.custoAlvo) alvo.append(el('span', 'pilula', `${pct(c.margem)} ${reais(c.valor)}`))
  card.append(
    alvo,
    linha('Likes', inteiro(a.likes)),
    linha('Reviews', inteiro(a.reviews)),
    linha('Nota', a.nota === null ? SEM_DADO : a.nota.toFixed(1).replace('.', ',')),
  )

  const nomesSelos = [
    a.selos.indicado ? 'Indicado' : null,
    a.selos.lojaOficial ? 'Loja oficial' : null,
    a.selos.ads ? 'Ads' : null,
  ].filter((s): s is string => s !== null)
  if (nomesSelos.length) {
    const selos = el('div', 'selos')
    for (const s of nomesSelos) selos.append(el('span', 'selo', s))
    card.append(selos)
  }

  card.append(el('div', 'historico', textoHistorico(d.historico)))

  const loja = el('div', 'loja')
  loja.append(el('span', 'nome', a.loja ?? SEM_DADO))
  if (a.loja) {
    const nome = a.loja
    const copiar = el('button', '', 'Copiar')
    copiar.addEventListener('click', ev => {
      ev.preventDefault()
      void navigator.clipboard?.writeText(nome)
    })
    loja.append(copiar)
  }
  card.append(loja, el('div', 'rodape', 'est. = estimativa com o menor preço atual'))

  raiz.append(estilo, card)
  return host
}

export function linkDoProduto(raiz: ParentNode, a: Pick<Anuncio, 'shopId' | 'itemId'>): HTMLAnchorElement | null {
  for (const link of raiz.querySelectorAll<HTMLAnchorElement>(seletorDoLink(a))) {
    const id = idDaUrl(link.getAttribute('href') ?? '')
    if (id && id.itemId === a.itemId && id.shopId === a.shopId) return link
  }
  return null
}

// Hipótese a validar na checagem manual: o card da busca é o <li> que contém o link.
export function containerDoCard(link: HTMLElement): HTMLElement | null {
  return link.closest('li') ?? link.parentElement
}

export function anexarCard(container: HTMLElement, card: HTMLElement): void {
  container.querySelector(`[${ATRIBUTO_CARD}]`)?.remove()
  container.append(card)
}
```

- [ ] **Step 5: Rodar testes e typecheck**

Run: `npx vitest run testes/card.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/ui/estilo.ts src/ui/card.ts testes/card.test.ts
git commit -m "fcs-spy: card enriquecido em Shadow DOM"
```

---

### Task 9: Ordenação e barra flutuante

**Files:**
- Create: `src/ui/ordenar.ts`, `src/ui/barra.ts`
- Test: `testes/ordenar.test.ts`, `testes/barra.test.ts`

**Interfaces:**
- Consumes: `Anuncio`; `ESTILO_BASE`; `anuncio` (testes).
- Produces: tipo `Criterio = 'vendas30d' | 'vendasTotal' | 'faturamento30d' | 'maisNovos' | 'maisAntigos'`; `CRITERIOS: { valor: Criterio; rotulo: string }[]`; `ordenar(lista: Anuncio[], c: Criterio): Anuncio[]`; `reordenarNaPagina(containers: HTMLElement[]): void`; `ATRIBUTO_BARRA = 'data-fcs-spy-barra'`, `ATRIBUTO_DESLIGADO = 'data-fcs-spy-desligado'`; `montarBarra(aoOrdenar: (c: Criterio) => void, aoAlternar: (ligado: boolean) => void): HTMLElement`; `aplicarLigado(doc: Document, ligado: boolean): void`; `instalarEstiloGlobal(doc: Document): void`.

- [ ] **Step 1: Escrever o teste de ordenação**

`testes/ordenar.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { ordenar, reordenarNaPagina, CRITERIOS } from '../src/ui/ordenar'
import { anuncio } from './fabrica'

const lista = [
  anuncio({ itemId: 'a', preco: 10, vendas30d: 5, vendasTotal: 500, criadoEm: new Date('2026-01-01') }),
  anuncio({ itemId: 'b', preco: 100, vendas30d: 2, vendasTotal: null, criadoEm: new Date('2026-06-01') }),
  anuncio({ itemId: 'c', preco: 1, vendas30d: null, vendasTotal: 900, criadoEm: null }),
  anuncio({ itemId: 'd', preco: 10, vendas30d: 50, vendasTotal: 50, criadoEm: new Date('2025-01-01') }),
]
const ids = (c: Parameters<typeof ordenar>[1]) => ordenar(lista, c).map(a => a.itemId)

describe('ordenar', () => {
  it('vendas 30D decrescente, sem dado no fim', () => expect(ids('vendas30d')).toEqual(['d', 'a', 'b', 'c']))
  it('vendas total', () => expect(ids('vendasTotal')).toEqual(['c', 'a', 'd', 'b']))
  it('faturamento 30D', () => expect(ids('faturamento30d')).toEqual(['d', 'b', 'a', 'c']))
  it('mais novos', () => expect(ids('maisNovos')).toEqual(['b', 'a', 'd', 'c']))
  it('mais antigos', () => expect(ids('maisAntigos')).toEqual(['d', 'a', 'b', 'c']))
  it('não altera a lista original', () => {
    ordenar(lista, 'vendas30d')
    expect(lista.map(a => a.itemId)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('cinco critérios com rótulo', () => expect(CRITERIOS).toHaveLength(5))
})

describe('reordenarNaPagina', () => {
  it('move os containers na ordem dada', () => {
    document.body.innerHTML = '<ul><li id="a"></li><li id="b"></li><li id="c"></li></ul>'
    const pega = (id: string) => document.getElementById(id)!
    reordenarNaPagina([pega('c'), pega('a'), pega('b')])
    expect([...document.querySelectorAll('li')].map(li => li.id)).toEqual(['c', 'a', 'b'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/ordenar.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/ui/ordenar.ts`**

```ts
import type { Anuncio } from '../nucleo/tipos'

export type Criterio = 'vendas30d' | 'vendasTotal' | 'faturamento30d' | 'maisNovos' | 'maisAntigos'

export const CRITERIOS: { valor: Criterio; rotulo: string }[] = [
  { valor: 'vendas30d', rotulo: 'Vendas 30D' },
  { valor: 'vendasTotal', rotulo: 'Vendas total' },
  { valor: 'faturamento30d', rotulo: 'Faturamento 30D' },
  { valor: 'maisNovos', rotulo: 'Mais novos' },
  { valor: 'maisAntigos', rotulo: 'Mais antigos' },
]

// Maior chave primeiro. "Mais antigos" usa data negativa para inverter.
function chave(a: Anuncio, c: Criterio): number | null {
  switch (c) {
    case 'vendas30d': return a.vendas30d
    case 'vendasTotal': return a.vendasTotal
    case 'faturamento30d': return a.vendas30d === null ? null : a.vendas30d * a.preco
    case 'maisNovos': return a.criadoEm ? a.criadoEm.getTime() : null
    case 'maisAntigos': return a.criadoEm ? -a.criadoEm.getTime() : null
  }
}

export function ordenar(lista: Anuncio[], c: Criterio): Anuncio[] {
  return [...lista].sort((x, y) => {
    const a = chave(x, c)
    const b = chave(y, c)
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return b - a
  })
}

export function reordenarNaPagina(containers: HTMLElement[]): void {
  for (const el of containers) el.parentElement?.appendChild(el)
}
```

- [ ] **Step 4: Rodar o teste de ordenação**

Run: `npx vitest run testes/ordenar.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste da barra**

`testes/barra.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarBarra, aplicarLigado, instalarEstiloGlobal, ATRIBUTO_BARRA, ATRIBUTO_DESLIGADO } from '../src/ui/barra'

describe('montarBarra', () => {
  it('escolher critério chama aoOrdenar', () => {
    const aoOrdenar = vi.fn()
    const host = montarBarra(aoOrdenar, vi.fn())
    expect(host.hasAttribute(ATRIBUTO_BARRA)).toBe(true)
    const select = host.shadowRoot!.querySelector('select')!
    expect(select.options[0].textContent).toBe('Ordenar os itens desta página')
    select.value = 'faturamento30d'
    select.dispatchEvent(new Event('change'))
    expect(aoOrdenar).toHaveBeenCalledWith('faturamento30d')
  })
  it('botão alterna ligado e desligado', () => {
    const aoAlternar = vi.fn()
    const host = montarBarra(vi.fn(), aoAlternar)
    const botao = host.shadowRoot!.querySelector('button')!
    expect(botao.textContent).toBe('Desligar')
    botao.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(false)
    expect(botao.textContent).toBe('Ligar')
    botao.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(true)
  })
})

describe('aplicarLigado e estilo global', () => {
  it('marca o html quando desligado', () => {
    aplicarLigado(document, false)
    expect(document.documentElement.hasAttribute(ATRIBUTO_DESLIGADO)).toBe(true)
    aplicarLigado(document, true)
    expect(document.documentElement.hasAttribute(ATRIBUTO_DESLIGADO)).toBe(false)
  })
  it('instala o estilo uma vez só', () => {
    instalarEstiloGlobal(document)
    instalarEstiloGlobal(document)
    expect(document.querySelectorAll('#fcs-spy-estilo')).toHaveLength(1)
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run testes/barra.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 7: Implementar `src/ui/barra.ts`**

```ts
import { CRITERIOS, type Criterio } from './ordenar'
import { ESTILO_BASE } from './estilo'

export const ATRIBUTO_BARRA = 'data-fcs-spy-barra'
export const ATRIBUTO_DESLIGADO = 'data-fcs-spy-desligado'

const ESTILO_BARRA = `
.barra { padding: 6px 8px; display: flex; gap: 6px; align-items: center; }
.marca { color: #00D8FF; font-weight: 800; letter-spacing: .08em; }
`

export function montarBarra(aoOrdenar: (c: Criterio) => void, aoAlternar: (ligado: boolean) => void): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_BARRA, '')
  host.style.cssText = 'position:fixed;top:120px;right:12px;z-index:2147483647'
  const raiz = host.attachShadow({ mode: 'open' })

  const estilo = document.createElement('style')
  estilo.textContent = ESTILO_BASE + ESTILO_BARRA
  const barra = document.createElement('div')
  barra.className = 'barra'
  const marca = document.createElement('span')
  marca.className = 'marca'
  marca.textContent = 'FCS SPY'

  const select = document.createElement('select')
  select.append(new Option('Ordenar os itens desta página', ''))
  for (const c of CRITERIOS) select.append(new Option(c.rotulo, c.valor))
  select.addEventListener('change', () => {
    if (select.value) aoOrdenar(select.value as Criterio)
  })

  let ligado = true
  const botao = document.createElement('button')
  botao.textContent = 'Desligar'
  botao.addEventListener('click', () => {
    ligado = !ligado
    botao.textContent = ligado ? 'Desligar' : 'Ligar'
    select.disabled = !ligado
    aoAlternar(ligado)
  })

  barra.append(marca, select, botao)
  raiz.append(estilo, barra)
  return host
}

export function aplicarLigado(doc: Document, ligado: boolean): void {
  if (ligado) doc.documentElement.removeAttribute(ATRIBUTO_DESLIGADO)
  else doc.documentElement.setAttribute(ATRIBUTO_DESLIGADO, '')
}

export function instalarEstiloGlobal(doc: Document): void {
  if (doc.getElementById('fcs-spy-estilo')) return
  const s = doc.createElement('style')
  s.id = 'fcs-spy-estilo'
  s.textContent = `[${ATRIBUTO_DESLIGADO}] [data-fcs-spy-card], [${ATRIBUTO_DESLIGADO}] [data-fcs-spy-painel] { display: none !important; }`
  ;(doc.head ?? doc.documentElement).append(s)
}
```

- [ ] **Step 8: Rodar testes e typecheck**

Run: `npx vitest run testes/ordenar.test.ts testes/barra.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 9: Commit**

```bash
git add src/ui/ordenar.ts src/ui/barra.ts testes/ordenar.test.ts testes/barra.test.ts
git commit -m "fcs-spy: ordenação e barra flutuante"
```

---

### Task 10: Painel da calculadora na página de produto

**Files:**
- Create: `src/ui/painel.ts`
- Test: `testes/painel.test.ts`

**Interfaces:**
- Consumes: `Config`, `Leitura`, `Variacoes`; `calcular`; `reais`, `inteiro`, `pct`; `ESTILO_BASE`; `CONFIG_PADRAO`.
- Produces: `ATRIBUTO_PAINEL = 'data-fcs-spy-painel'`; tipo `DadosPainel = { config: Config; preco: number | null; variacoes: Variacoes | null; leitura: Leitura | null }`; `textoLeitura(l: Leitura | null): string`; `montarPainel(d: DadosPainel): HTMLElement`.

- [ ] **Step 1: Escrever o teste**

`testes/painel.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { montarPainel, textoLeitura, ATRIBUTO_PAINEL } from '../src/ui/painel'
import { CONFIG_PADRAO } from '../src/dados/config'
import type { Config } from '../src/nucleo/tipos'

const cfg: Config = {
  ...CONFIG_PADRAO,
  filamentoKg: 100, perdaPct: 0, potenciaW: 0, kwh: 0,
  desgasteHora: 0, maoDeObraHora: 0, embalagem: 0.2, impostoPct: 0.04,
}

function preencher(raiz: ShadowRoot, nome: string, valor: string) {
  const input = raiz.querySelector<HTMLInputElement>(`input[name="${nome}"]`)!
  input.value = valor
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const valor = (raiz: ShadowRoot, campo: string) =>
  raiz.querySelector(`[data-campo="${campo}"] .valor`)!.textContent

describe('textoLeitura', () => {
  it('sem leitura', () => expect(textoLeitura(null)).toBe('abra pela busca para ver vendas'))
  it('com leitura', () => {
    expect(textoLeitura({ itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 196, vendasTotal: 1596 }))
      .toBe('vendas 30D 196, total 1.596 (leitura de 27/09/2026)')
  })
})

describe('montarPainel', () => {
  it('confere com a calculadora do Ziem', () => {
    const host = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null })
    expect(host.hasAttribute(ATRIBUTO_PAINEL)).toBe(true)
    const raiz = host.shadowRoot!
    preencher(raiz, 'gramas', '48')
    const ads = raiz.querySelector<HTMLInputElement>('input[name="ads"]')!
    ads.checked = true
    ads.dispatchEvent(new Event('change', { bubbles: true }))
    preencher(raiz, 'roas', '30')
    expect(valor(raiz, 'custoProducao')).toBe('R$ 5,00')
    expect(valor(raiz, 'taxa')).toBe('R$ 7,18')
    expect(valor(raiz, 'lucro')).toBe('R$ 2,55')
    expect(valor(raiz, 'margem')).toBe('16,1%')
    expect(valor(raiz, 'roasMinimo')).toBe('5,16x')
  })
  it('aceita vírgula decimal', () => {
    const raiz = montarPainel({ config: cfg, preco: 15.9, variacoes: null, leitura: null }).shadowRoot!
    preencher(raiz, 'gramas', '48,0')
    expect(valor(raiz, 'custoProducao')).toBe('R$ 5,00')
  })
  it('conta que não fecha', () => {
    const raiz = montarPainel({ config: CONFIG_PADRAO, preco: 5, variacoes: null, leitura: null }).shadowRoot!
    expect(valor(raiz, 'roasMinimo')).toBe('prejuízo mesmo sem ads')
  })
  it('variação preenche o preço', () => {
    const raiz = montarPainel({
      config: cfg, preco: null, leitura: null,
      variacoes: { itemId: '1', opcoes: [{ nome: 'Preto', preco: 24.9 }, { nome: 'Kit com 4', preco: 54.9 }] },
    }).shadowRoot!
    const preco = raiz.querySelector<HTMLInputElement>('input[name="preco"]')!
    expect(preco.value).toBe('24.9')
    const select = raiz.querySelector('select')!
    select.value = '1'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(preco.value).toBe('54.9')
  })
  it('recolher esconde o corpo', () => {
    const raiz = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null }).shadowRoot!
    const botao = raiz.querySelector('button')!
    botao.click()
    expect(raiz.querySelector<HTMLElement>('.corpo')!.hidden).toBe(true)
    expect(botao.textContent).toBe('Abrir')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/painel.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/ui/painel.ts`**

```ts
import type { Config, Leitura, Variacoes } from '../nucleo/tipos'
import { calcular } from '../nucleo/calculadora'
import { reais, inteiro, pct } from '../nucleo/formato'
import { ESTILO_BASE } from './estilo'

export const ATRIBUTO_PAINEL = 'data-fcs-spy-painel'

export type DadosPainel = {
  config: Config
  preco: number | null
  variacoes: Variacoes | null
  leitura: Leitura | null
}

const ESTILO_PAINEL = `
.painel { padding: 8px; display: grid; gap: 6px; }
.topo { display: flex; justify-content: space-between; align-items: center; color: #00D8FF; font-weight: 800; text-transform: uppercase; }
.corpo { display: grid; gap: 4px; }
.leitura { color: #00D8FF; }
label { display: flex; justify-content: space-between; gap: 6px; align-items: center; color: #9A9A9A; }
label input:not([type=checkbox]) { width: 80px; }
select { width: 100%; }
.resultado { border-top: 1px solid #1F1F1F; padding-top: 6px; display: grid; gap: 2px; }
.linha { display: flex; }
.valor { margin-left: auto; font-weight: 700; }
[data-campo=lucro] .valor { color: #00D8FF; }
`

function numero(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function textoLeitura(l: Leitura | null): string {
  if (!l) return 'abra pela busca para ver vendas'
  const [ano, mes, dia] = l.data.split('-')
  return `vendas 30D ${inteiro(l.vendas30d)}, total ${inteiro(l.vendasTotal)} (leitura de ${dia}/${mes}/${ano})`
}

function campo(pai: HTMLElement, rotulo: string, nome: string, inicial: string, tipo = 'text'): HTMLInputElement {
  const label = document.createElement('label')
  const span = document.createElement('span')
  span.textContent = rotulo
  const input = document.createElement('input')
  input.name = nome
  input.type = tipo
  if (tipo === 'checkbox') input.checked = inicial === 'sim'
  else input.value = inicial
  label.append(span, input)
  pai.append(label)
  return input
}

function linhaResultado(chave: string, rotulo: string, valor: string): HTMLElement {
  const l = document.createElement('div')
  l.className = 'linha'
  l.dataset.campo = chave
  const r = document.createElement('span')
  r.textContent = rotulo
  const v = document.createElement('span')
  v.className = 'valor'
  v.textContent = valor
  l.append(r, v)
  return l
}

export function montarPainel(d: DadosPainel): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_PAINEL, '')
  host.style.cssText = 'position:fixed;top:180px;right:12px;z-index:2147483646;width:260px'
  const raiz = host.attachShadow({ mode: 'open' })

  const estilo = document.createElement('style')
  estilo.textContent = ESTILO_BASE + ESTILO_PAINEL
  const painel = document.createElement('div')
  painel.className = 'painel'

  const topo = document.createElement('div')
  topo.className = 'topo'
  const titulo = document.createElement('span')
  titulo.textContent = 'FCS SPY calculadora'
  const recolher = document.createElement('button')
  recolher.textContent = 'Recolher'
  topo.append(titulo, recolher)

  const corpo = document.createElement('div')
  corpo.className = 'corpo'
  recolher.addEventListener('click', () => {
    corpo.hidden = !corpo.hidden
    recolher.textContent = corpo.hidden ? 'Abrir' : 'Recolher'
  })

  const leitura = document.createElement('div')
  leitura.className = 'leitura'
  leitura.textContent = textoLeitura(d.leitura)
  corpo.append(leitura)

  const opcoes = d.variacoes?.opcoes ?? []
  let select: HTMLSelectElement | null = null
  if (opcoes.length) {
    select = document.createElement('select')
    opcoes.forEach((o, i) => select!.append(new Option(`${o.nome} ${reais(o.preco)}`, String(i))))
    corpo.append(select)
  }

  const precoInicial = d.preco ?? (opcoes.length ? opcoes[0].preco : 0)
  const preco = campo(corpo, 'Preço de venda (R$)', 'preco', String(precoInicial))
  const gramas = campo(corpo, 'Filamento (g)', 'gramas', '0')
  const horas = campo(corpo, 'Impressão (h)', 'horas', '0')
  const minutos = campo(corpo, 'Acabamento (min)', 'minutos', '0')
  const ads = campo(corpo, 'Shopee Ads', 'ads', 'nao', 'checkbox')
  const roas = campo(corpo, 'ROAS esperado', 'roas', '10')

  select?.addEventListener('change', () => {
    preco.value = String(opcoes[Number(select!.value)].preco)
  })

  const resultado = document.createElement('div')
  resultado.className = 'resultado'
  corpo.append(resultado)

  function recalcular() {
    const r = calcular({
      preco: numero(preco.value),
      gramas: numero(gramas.value),
      horas: numero(horas.value),
      minutosAcabamento: numero(minutos.value),
      ads: ads.checked,
      roas: numero(roas.value),
    }, d.config)
    resultado.replaceChildren(
      linhaResultado('custoProducao', 'Custo de produção', reais(r.custoProducao)),
      linhaResultado('taxa', 'Taxa Shopee', reais(r.taxa)),
      linhaResultado('imposto', 'Imposto', reais(r.imposto)),
      linhaResultado('ads', 'Ads', reais(r.ads)),
      linhaResultado('lucro', 'Lucro por unidade', reais(r.lucro)),
      linhaResultado('margem', 'Margem', pct(r.margem)),
      linhaResultado('roasMinimo', 'ROAS mínimo',
        r.roasMinimo === null ? 'prejuízo mesmo sem ads' : `${r.roasMinimo.toFixed(2).replace('.', ',')}x`),
    )
  }
  // O change do select atualiza o preço no próprio elemento antes de borbulhar até o corpo.
  corpo.addEventListener('input', recalcular)
  corpo.addEventListener('change', recalcular)
  recalcular()

  painel.append(topo, corpo)
  raiz.append(estilo, painel)
  return host
}
```

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run testes/painel.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/ui/painel.ts testes/painel.test.ts
git commit -m "fcs-spy: painel da calculadora na página de produto"
```

---

### Task 11: Tela de configurações

**Files:**
- Create: `src/opcoes/opcoes.ts`, `src/opcoes/entrada.ts`, `src/opcoes/opcoes.html`
- Test: `testes/opcoes.test.ts`

**Interfaces:**
- Consumes: `Config`; `CONFIG_PADRAO`, `mesclar`, `lerConfig`, `salvarConfig`, `CHAVE_CONFIG`; `Area`, `areaLocal`; `areaEmMemoria`.
- Produces: `CAMPOS`, `paraTela(c: Config): Record<string, string>`, `daTela(v: Record<string, string>): Config`, `iniciarTela(doc: Document, area?: Area): Promise<void>`.

- [ ] **Step 1: Escrever o teste**

`testes/opcoes.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { paraTela, daTela, iniciarTela, CAMPOS } from '../src/opcoes/opcoes'
import { CONFIG_PADRAO, CHAVE_CONFIG } from '../src/dados/config'
import type { Config } from '../src/nucleo/tipos'
import { areaEmMemoria } from './area-memoria'

describe('paraTela e daTela', () => {
  it('percentuais aparecem em % e margens separadas por ;', () => {
    const t = paraTela(CONFIG_PADRAO)
    expect(t.comissaoPct).toBe('20')
    expect(t.taxaFixa).toBe('4')
    expect(t.margens).toBe('10; 15; 20')
  })
  it('ida e volta sem perda', () => {
    expect(daTela(paraTela(CONFIG_PADRAO))).toEqual(CONFIG_PADRAO)
  })
  it('vírgula decimal e lixo', () => {
    const t = { ...paraTela(CONFIG_PADRAO), kwh: '1,05', embalagem: 'abc', margens: '12,5; x; 30' }
    const c = daTela(t)
    expect(c.kwh).toBe(1.05)
    expect(c.embalagem).toBe(CONFIG_PADRAO.embalagem)
    expect(c.margens).toEqual([0.125, 0.3])
  })
  it('todo campo numérico da config está na tela', () => {
    const chaves = CAMPOS.map(c => c.chave).sort()
    const esperado = Object.keys(CONFIG_PADRAO).filter(k => k !== 'margens').sort()
    expect(chaves).toEqual(esperado)
  })
})

describe('iniciarTela', () => {
  it('carrega, edita e salva', async () => {
    document.body.innerHTML = '<form id="form"><div id="campos"></div><button type="submit">Salvar</button><span id="status"></span></form>'
    const area = areaEmMemoria()
    await iniciarTela(document, area)
    const input = document.querySelector<HTMLInputElement>('input[name="comissaoPct"]')!
    expect(input.value).toBe('20')
    input.value = '18'
    document.getElementById('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toBe('Salvo.'))
    expect((area.dados[CHAVE_CONFIG] as Config).comissaoPct).toBeCloseTo(0.18, 10)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/opcoes.test.ts`
Expected: FAIL, import não resolvido.

- [ ] **Step 3: Implementar `src/opcoes/opcoes.ts`**

```ts
import type { Config } from '../nucleo/tipos'
import { lerConfig, salvarConfig, mesclar } from '../dados/config'
import { areaLocal, type Area } from '../dados/area'

type ChaveNumerica = Exclude<keyof Config, 'margens'>
export type Campo = { chave: ChaveNumerica; rotulo: string; pct: boolean }

export const CAMPOS: Campo[] = [
  { chave: 'comissaoPct', rotulo: 'Comissão Shopee (%)', pct: true },
  { chave: 'taxaFixa', rotulo: 'Taxa fixa Shopee por venda (R$)', pct: false },
  { chave: 'impostoPct', rotulo: 'Imposto (%)', pct: true },
  { chave: 'filamentoKg', rotulo: 'Filamento, preço do kg (R$)', pct: false },
  { chave: 'perdaPct', rotulo: 'Perda de filamento (%)', pct: true },
  { chave: 'potenciaW', rotulo: 'Potência média da impressora (W)', pct: false },
  { chave: 'kwh', rotulo: 'Preço do kWh (R$)', pct: false },
  { chave: 'desgasteHora', rotulo: 'Desgaste da máquina por hora (R$)', pct: false },
  { chave: 'maoDeObraHora', rotulo: 'Mão de obra de acabamento por hora (R$)', pct: false },
  { chave: 'embalagem', rotulo: 'Embalagem por pedido (R$)', pct: false },
]
const ROTULO_MARGENS = 'Margens do custo alvo (%, separadas por ;)'

const arredonda = (n: number) => Number(n.toFixed(6))

function numero(v: string | undefined): number | undefined {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function paraTela(c: Config): Record<string, string> {
  const t: Record<string, string> = {}
  for (const f of CAMPOS) t[f.chave] = String(f.pct ? arredonda(c[f.chave] * 100) : c[f.chave])
  t.margens = c.margens.map(m => arredonda(m * 100)).join('; ')
  return t
}

export function daTela(v: Record<string, string>): Config {
  const bruto: Record<string, unknown> = {}
  for (const f of CAMPOS) {
    const n = numero(v[f.chave])
    if (n !== undefined) bruto[f.chave] = f.pct ? arredonda(n / 100) : n
  }
  const margens = (v.margens ?? '')
    .split(';')
    .map(s => numero(s.trim()))
    .filter((n): n is number => n !== undefined)
    .map(n => arredonda(n / 100))
  if (margens.length) bruto.margens = margens
  return mesclar(bruto)
}

export async function iniciarTela(doc: Document, area: Area = areaLocal()): Promise<void> {
  const form = doc.getElementById('form') as HTMLFormElement
  const campos = doc.getElementById('campos')!
  const status = doc.getElementById('status')!
  const todos = [...CAMPOS.map(f => ({ chave: f.chave as string, rotulo: f.rotulo })), { chave: 'margens', rotulo: ROTULO_MARGENS }]

  for (const f of todos) {
    const label = doc.createElement('label')
    const span = doc.createElement('span')
    span.textContent = f.rotulo
    const input = doc.createElement('input')
    input.name = f.chave
    label.append(span, input)
    campos.append(label)
  }
  const input = (chave: string) => form.querySelector<HTMLInputElement>(`input[name="${chave}"]`)!
  const preencher = (c: Config) => {
    for (const [k, v] of Object.entries(paraTela(c))) input(k).value = v
  }

  preencher(await lerConfig(area))

  form.addEventListener('submit', async ev => {
    ev.preventDefault()
    const c = daTela(Object.fromEntries(todos.map(f => [f.chave, input(f.chave).value])))
    await salvarConfig(c, area)
    preencher(c)
    status.textContent = 'Salvo.'
  })
}
```

- [ ] **Step 4: Criar `src/opcoes/entrada.ts` e `src/opcoes/opcoes.html`**

`src/opcoes/entrada.ts`:
```ts
import { iniciarTela } from './opcoes'

void iniciarTela(document)
```

`src/opcoes/opcoes.html`:
```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>FCS SPY, configurações</title>
  <style>
    body { background: #0A0A0A; color: #FFFFFF; font-family: Inter, Poppins, system-ui, sans-serif; max-width: 560px; margin: 32px auto; padding: 0 16px; }
    h1 { color: #00D8FF; text-transform: uppercase; font-size: 20px; letter-spacing: .08em; }
    p { color: #9A9A9A; }
    label { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 8px 0; }
    input { background: #141414; color: #FFFFFF; border: 1px solid #1F1F1F; border-radius: 2px; padding: 4px 6px; width: 140px; }
    button { background: #00D8FF; color: #0A0A0A; border: 0; border-radius: 2px; font-weight: 700; text-transform: uppercase; padding: 8px 16px; cursor: pointer; margin-top: 16px; }
    #status { color: #00D8FF; margin-left: 12px; }
  </style>
</head>
<body>
  <h1>FCS SPY</h1>
  <p>Os valores padrão são ponto de partida. Ajuste com os custos reais da FCS.</p>
  <form id="form">
    <div id="campos"></div>
    <button type="submit">Salvar</button>
    <span id="status"></span>
  </form>
  <script src="opcoes.js"></script>
</body>
</html>
```

- [ ] **Step 5: Rodar testes e typecheck**

Run: `npx vitest run testes/opcoes.test.ts && npm run typecheck`
Expected: PASS, `tsc` sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/opcoes testes/opcoes.test.ts
git commit -m "fcs-spy: tela de configurações"
```

---

### Task 12: Orquestração, manifest, build e checagem no Chrome

**Files:**
- Create: `src/licenca/licenca.ts`, `src/content/main.ts`, `manifest.json`, `build.mjs`, `../docs/checagem-manual.md`

**Interfaces:**
- Consumes: tudo das tasks 1 a 11.
- Produces: `licencaValida(): Promise<boolean>`; pasta `dist/` carregável no Chrome.

- [ ] **Step 1: Criar `src/licenca/licenca.ts`**

```ts
// Versão 1 é de uso interno: sempre válida.
// Ponto único onde a validação de assinatura entra quando o FCS SPY for vendido.
export async function licencaValida(): Promise<boolean> {
  return true
}
```

- [ ] **Step 2: Criar `src/content/main.ts`**

```ts
import { ouvirEscuta } from './ponte'
import type { MensagemEscuta } from '../page/escuta'
import { traduzirBusca, traduzirVitrine, traduzirProduto } from '../shopee/traduzir'
import { idDaUrl } from '../shopee/url'
import { calcularMetricas } from '../nucleo/metricas'
import type { Anuncio, Config, Tendencia, Variacoes } from '../nucleo/tipos'
import { lerConfig, CONFIG_PADRAO, CHAVE_CONFIG } from '../dados/config'
import { areaLocal } from '../dados/area'
import { gravarLeituras, leituraDe, ultimaLeitura } from '../dados/historico'
import { montarCard, anexarCard, linkDoProduto, containerDoCard, ATRIBUTO_CARD, type EstadoHistorico } from '../ui/card'
import { ordenar, reordenarNaPagina, type Criterio } from '../ui/ordenar'
import { montarBarra, aplicarLigado, instalarEstiloGlobal, ATRIBUTO_BARRA } from '../ui/barra'
import { montarPainel, ATRIBUTO_PAINEL } from '../ui/painel'
import { licencaValida } from '../licenca/licenca'

type Visto = { anuncio: Anuncio; historico: EstadoHistorico }

async function iniciar(): Promise<void> {
  if (!(await licencaValida())) return

  const area = areaLocal()
  let config: Config = CONFIG_PADRAO
  const vistos = new Map<string, Visto>()
  let variacoes: Variacoes | null = null
  let urlDoPainel: string | null = null
  let desenhandoPainel = false
  let agendado = false

  // Registra antes de qualquer await para não perder a primeira resposta da busca.
  ouvirEscuta(window, msg => void receber(msg))

  config = await lerConfig(area)
  chrome.storage.onChanged.addListener((mudancas, nome) => {
    if (nome !== 'local' || !mudancas[CHAVE_CONFIG]) return
    void lerConfig(area).then(c => {
      config = c
      redesenharTudo()
    })
  })

  async function receber(msg: MensagemEscuta) {
    if (msg.rota === 'produto') {
      variacoes = traduzirProduto(msg.corpo)
      urlDoPainel = null
      agendar()
      return
    }
    const anuncios = msg.rota === 'busca' ? traduzirBusca(msg.corpo) : traduzirVitrine(msg.corpo)
    if (!anuncios.length) return
    let tendencias: Map<string, Tendencia | null> | null = null
    try {
      tendencias = await gravarLeituras(anuncios.map(a => leituraDe(a, new Date())), area)
    } catch (e) {
      console.warn('[FCS SPY] histórico indisponível', e)
    }
    for (const a of anuncios) {
      vistos.set(a.itemId, { anuncio: a, historico: tendencias ? (tendencias.get(a.itemId) ?? null) : 'indisponivel' })
    }
    agendar()
  }

  function agendar() {
    if (agendado) return
    agendado = true
    setTimeout(() => {
      agendado = false
      desenhar()
    }, 250)
  }

  function redesenharTudo() {
    document.querySelectorAll(`[${ATRIBUTO_CARD}]`).forEach(e => e.remove())
    document.querySelector(`[${ATRIBUTO_PAINEL}]`)?.remove()
    urlDoPainel = null
    agendar()
  }

  function desenhar() {
    if (!document.body) return
    garantirBarra()
    const hoje = new Date()
    for (const { anuncio, historico } of vistos.values()) {
      const link = linkDoProduto(document, anuncio)
      if (!link) continue
      const container = containerDoCard(link)
      if (!container || container.querySelector(`[${ATRIBUTO_CARD}="${anuncio.itemId}"]`)) continue
      anexarCard(container, montarCard({ anuncio, metricas: calcularMetricas(anuncio, config, hoje), historico }))
    }
    void desenharPainel()
  }

  function garantirBarra() {
    if (document.querySelector(`[${ATRIBUTO_BARRA}]`)) return
    instalarEstiloGlobal(document)
    document.body.append(montarBarra(ordenarPagina, ligado => aplicarLigado(document, ligado)))
  }

  function ordenarPagina(c: Criterio) {
    const presentes = [...vistos.values()].map(v => v.anuncio).filter(a => linkDoProduto(document, a))
    const containers = ordenar(presentes, c)
      .map(a => containerDoCard(linkDoProduto(document, a)!))
      .filter((x): x is HTMLElement => x !== null)
    reordenarNaPagina(containers)
  }

  async function desenharPainel() {
    const id = idDaUrl(location.href)
    const atual = document.querySelector(`[${ATRIBUTO_PAINEL}]`)
    if (!id) {
      atual?.remove()
      urlDoPainel = null
      return
    }
    if ((atual && urlDoPainel === location.href) || desenhandoPainel) return
    desenhandoPainel = true
    urlDoPainel = location.href
    try {
      let leitura = null
      try {
        leitura = await ultimaLeitura(id.itemId, area)
      } catch (e) {
        console.warn('[FCS SPY] histórico indisponível', e)
      }
      document.querySelector(`[${ATRIBUTO_PAINEL}]`)?.remove()
      document.body.append(montarPainel({
        config,
        preco: vistos.get(id.itemId)?.anuncio.preco ?? null,
        variacoes: variacoes?.itemId === id.itemId ? variacoes : null,
        leitura,
      }))
    } finally {
      desenhandoPainel = false
    }
  }

  new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true })
}

iniciar().catch(e => console.warn('[FCS SPY]', e))
```

- [ ] **Step 3: Criar `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "FCS SPY",
  "version": "0.1.0",
  "description": "Estudo de mercado e produto na Shopee, da FCS 3D STUDIO.",
  "permissions": ["storage", "unlimitedStorage"],
  "options_page": "opcoes.html",
  "content_scripts": [
    {
      "matches": ["https://shopee.com.br/*"],
      "js": ["escuta.js"],
      "run_at": "document_start",
      "world": "MAIN"
    },
    {
      "matches": ["https://shopee.com.br/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

- [ ] **Step 4: Criar `build.mjs`**

```js
import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await build({
  entryPoints: {
    escuta: 'src/page/entrada.ts',
    content: 'src/content/main.ts',
    opcoes: 'src/opcoes/entrada.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'dist',
  logLevel: 'info',
})

await cp('manifest.json', 'dist/manifest.json')
await cp('src/opcoes/opcoes.html', 'dist/opcoes.html')
```

- [ ] **Step 5: Rodar a suíte inteira, typecheck e build**

Run: `npm test && npm run typecheck && npm run build && ls dist`
Expected: todos os testes PASS, `tsc` sem erro, esbuild lista `dist/escuta.js`, `dist/content.js`, `dist/opcoes.js`, e `ls` mostra também `manifest.json` e `opcoes.html`.

- [ ] **Step 6: Conferir que a escuta não arrasta código de UI**

Run: `node -e "const s=require('fs').readFileSync('dist/escuta.js','utf8');console.log(s.length, /attachShadow|chrome\.storage/.test(s))"`
Expected: tamanho pequeno (menos de 5000) e `false`.

- [ ] **Step 7: Criar `../docs/checagem-manual.md`**

```markdown
# FCS SPY: checagem manual no Chrome

Rodar a cada versão nova, com o Chrome logado na Shopee.

## Instalar

1. `npm run build` em `mini-projetos/fcs-spy/extensao/`
2. Chrome, `chrome://extensions`, ligar "Modo do desenvolvedor"
3. "Carregar sem compactação", escolher a pasta `extensao/dist`
4. Depois de cada build, clicar no botão de recarregar da extensão e recarregar a aba da Shopee

## Busca

- [ ] Buscar "miniatura f1". Cada card da primeira tela ganha o painel preto e ciano embaixo
- [ ] Conferir um card: "Vendas 30D" igual ao "Vendido/Mês" que a Shopee mostra no próprio card
- [ ] Recebe, faturamento e custo alvo batem com a conta de cabeça (preço x 0,8 menos 4)
- [ ] Rolar a página: cards novos que carregam também recebem o painel
- [ ] Clicar no painel não abre o produto. Clicar na foto abre
- [ ] Botão "Copiar" copia o nome da loja
- [ ] Layout da grade não quebra. Se o painel ficar cortado ou empurrar a grade, anotar: a hipótese do `<li>` como container em `containerDoCard` precisa de ajuste
- [ ] Barra FCS SPY no canto superior direito
- [ ] Ordenar por Vendas 30D: a grade reordena, maior primeiro
- [ ] Ordenar por Mais novos e Mais antigos
- [ ] Botão Desligar esconde os painéis. Ligar mostra de novo
- [ ] Ir para a página 2 da busca: cards da página 2 recebem painel

## Histórico

- [ ] Primeira busca do dia: cards mostram "primeira leitura"
- [ ] No dia seguinte, mesma busca: cards mostram "subindo", "caindo" ou "estável" com a diferença

## Produto

- [ ] Abrir um produto a partir da busca: painel da calculadora aparece à direita
- [ ] Topo do painel mostra vendas 30D e a data da leitura
- [ ] Produto aberto por link direto, sem passar pela busca: mostra "abra pela busca para ver vendas"
- [ ] Com variações: o seletor lista cada uma com preço e troca o preço de venda
- [ ] Preencher gramas e horas: lucro e margem mudam na hora
- [ ] Vitrine "mais vendidos" no pé da página recebe painel nos cards
- [ ] Voltar para a busca: o painel da calculadora some

## Configurações

- [ ] Clique direito no ícone da extensão, "Opções": abre a tela preta com os campos
- [ ] Mudar a comissão para 18 e salvar. Na aba da Shopee, os cards recalculam sem recarregar

## Saúde

- [ ] Console da aba sem erro vermelho vindo da extensão. Avisos `[FCS SPY]` só em caso de formato inesperado
- [ ] Busca, carrinho e login da Shopee continuam funcionando normalmente
- [ ] Página não fica lenta ao rolar

## Pendências conhecidas

- Selo Ads: confirmar com uma busca que tenha anúncio pago (capturar HAR e conferir `is_ads`)
```

- [ ] **Step 8: Rodar a checagem manual no Chrome**

Seguir `docs/checagem-manual.md`. Registrar no fim do arquivo, numa seção "Resultado de 27/09/2026" (ou a data do dia), cada item que falhou. Item que falhar vira correção antes do commit final.

- [ ] **Step 9: Commit**

```bash
git add src/licenca src/content/main.ts manifest.json build.mjs ../docs/checagem-manual.md
git commit -m "fcs-spy: orquestração, manifest e build da versão 1"
```
