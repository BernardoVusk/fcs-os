# FCS SPY v3, fases 1 e 2: cores de venda e cobertura geral

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colorir Vendas 30D por faixa (verde, amarelo, vermelho, cortes editáveis) e mostrar o card do FCS SPY em todo produto de qualquer página do comprador, não só na busca.

**Architecture:** A faixa é uma função pura (`faixaVendas`) calculada junto com as métricas e lida pelo card e pela calculadora. A cobertura geral troca a lista fixa de 3 URLs da escuta por "toda resposta `/api/` que contenha o marcador de card", e a tradução passa a procurar cards em qualquer lugar do JSON (`acharCards`).

**Tech Stack:** TypeScript, esbuild, Vitest + jsdom, Shadow DOM.

**Spec:** `mini-projetos/fcs-spy/docs/2026-10-02-fcs-spy-v3-design.md` (frentes 1 e 2).

## Global Constraints

- Comandos rodam em `mini-projetos/fcs-spy/extensao/`.
- A escuta nunca altera, atrasa ou repete requisição. Todo código da escuta em try/catch.
- Campo ausente vira `sem dado`, nunca zero; sem vendas 30D o card fica neutro (sem faixa).
- Cores de faixa, texto sobre branco: verde `#15803D`, amarelo `#A16207`, vermelho `#B91C1C`. Borda: `#22C55E`, `#EAB308`, `#EF4444`. Ciano continua nunca como texto sobre branco.
- Padrões: `corteVerde` 300, `corteAmarelo` 50 (vendas por mês).
- Texto de interface em português, sem emoji, sem travessão.
- Valores em reais têm U+00A0 entre `R$` e o número; nos testes escrever o escape ` ` (seis caracteres ASCII) e conferir os bytes depois de editar.
- Nunca `git add .`/`-A`. Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; usar `git commit -F arquivo` para manter acentos.

---

### Task 1: Cortes de faixa na configuração e função `faixaVendas`

**Files:**
- Modify: `src/nucleo/tipos.ts`, `src/dados/config.ts`, `src/opcoes/opcoes.ts`
- Create: `src/nucleo/faixas.ts`
- Test: `testes/faixas.test.ts` (novo), `testes/config.test.ts`, `testes/opcoes.test.ts`

**Interfaces:**
- Produces: `Config.corteVerde: number`, `Config.corteAmarelo: number`; `type NivelFaixa = 'alta' | 'media' | 'baixa'`; `type FaixaVendas = { nivel: NivelFaixa; titulo: string }`; `faixaVendas(vendas30d: number | null, c: Pick<Config, 'corteVerde' | 'corteAmarelo'>): FaixaVendas | null`.

- [ ] **Step 1: Testes que falham**

`testes/faixas.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { faixaVendas } from '../src/nucleo/faixas'

const c = { corteVerde: 300, corteAmarelo: 50 }

describe('faixaVendas', () => {
  it('alta a partir do corte verde', () => {
    expect(faixaVendas(300, c)).toEqual({ nivel: 'alta', titulo: 'Vendas altas: 300 ou mais no mês' })
    expect(faixaVendas(1151, c)?.nivel).toBe('alta')
  })
  it('média do corte amarelo até um abaixo do verde', () => {
    expect(faixaVendas(50, c)).toEqual({ nivel: 'media', titulo: 'Vendas médias: de 50 a 299 no mês' })
    expect(faixaVendas(299, c)?.nivel).toBe('media')
  })
  it('baixa abaixo do corte amarelo, inclusive zero', () => {
    expect(faixaVendas(49, c)).toEqual({ nivel: 'baixa', titulo: 'Vendas baixas: menos de 50 no mês' })
    expect(faixaVendas(0, c)?.nivel).toBe('baixa')
  })
  it('sem vendas 30D não tem faixa', () => {
    expect(faixaVendas(null, c)).toBeNull()
  })
  it('cortes com milhar aparecem formatados', () => {
    expect(faixaVendas(2000, { corteVerde: 1000, corteAmarelo: 200 })?.titulo).toBe('Vendas altas: 1.000 ou mais no mês')
  })
})
```

Acrescentar em `testes/config.test.ts`:
```ts
describe('cortes de faixa', () => {
  it('padrões 300 e 50', () => {
    expect(CONFIG_PADRAO.corteVerde).toBe(300)
    expect(CONFIG_PADRAO.corteAmarelo).toBe(50)
  })
  it('amarelo maior ou igual ao verde volta os dois ao padrão', () => {
    const c = mesclar({ corteVerde: 100, corteAmarelo: 100 })
    expect(c.corteVerde).toBe(300)
    expect(c.corteAmarelo).toBe(50)
  })
  it('cortes válidos são mantidos', () => {
    const c = mesclar({ corteVerde: 500, corteAmarelo: 80 })
    expect(c.corteVerde).toBe(500)
    expect(c.corteAmarelo).toBe(80)
  })
})
```

Em `testes/opcoes.test.ts`, no teste "quatro grupos na ordem e unidades nos campos": renomear para "cinco grupos na ordem e unidades nos campos", esperar
`['Shopee e imposto', 'Impressão 3D', 'Acabamento e envio', 'Cores das vendas', 'Custo alvo']` e acrescentar `expect(unidades('corteVerde')).toEqual(['/mês'])`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/faixas.test.ts testes/config.test.ts testes/opcoes.test.ts`
Expected: FAIL (módulo `faixas` ausente, campos novos ausentes).

- [ ] **Step 3: Implementar**

`src/nucleo/tipos.ts`, no tipo `Config`, depois de `embalagem`:
```ts
  // Faixa de Vendas 30D: verde a partir de corteVerde, amarelo a partir de corteAmarelo.
  corteVerde: number
  corteAmarelo: number
```

`src/dados/config.ts`: em `CONFIG_PADRAO` acrescentar `corteVerde: 300, corteAmarelo: 50,`. Em `mesclar`, antes do `return c`:
```ts
  // Faixa impossível (amarelo alcançando o verde) volta os dois cortes ao padrão.
  if (c.corteAmarelo >= c.corteVerde) {
    c.corteVerde = CONFIG_PADRAO.corteVerde
    c.corteAmarelo = CONFIG_PADRAO.corteAmarelo
  }
```

`src/nucleo/faixas.ts`:
```ts
import type { Config } from './tipos'
import { inteiro } from './formato'

export type NivelFaixa = 'alta' | 'media' | 'baixa'
export type FaixaVendas = { nivel: NivelFaixa; titulo: string }

export function faixaVendas(
  vendas30d: number | null,
  c: Pick<Config, 'corteVerde' | 'corteAmarelo'>,
): FaixaVendas | null {
  if (vendas30d === null) return null
  if (vendas30d >= c.corteVerde) {
    return { nivel: 'alta', titulo: `Vendas altas: ${inteiro(c.corteVerde)} ou mais no mês` }
  }
  if (vendas30d >= c.corteAmarelo) {
    return { nivel: 'media', titulo: `Vendas médias: de ${inteiro(c.corteAmarelo)} a ${inteiro(c.corteVerde - 1)} no mês` }
  }
  return { nivel: 'baixa', titulo: `Vendas baixas: menos de ${inteiro(c.corteAmarelo)} no mês` }
}
```

`src/opcoes/opcoes.ts`:
- `type IdGrupo = 'shopee' | 'impressao' | 'acabamento' | 'cores'`
- Em `GRUPOS`, entre `acabamento` e `alvo`: `{ id: 'cores', titulo: 'Cores das vendas', icone: 'sobe' },`
- Em `CAMPOS`, no fim:
```ts
  { chave: 'corteVerde', rotulo: 'Verde a partir de', pct: false, grupo: 'cores', sufixo: '/mês' },
  { chave: 'corteAmarelo', rotulo: 'Amarelo a partir de', pct: false, grupo: 'cores', sufixo: '/mês' },
```

- [ ] **Step 4: Rodar suíte e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (o teste "todo campo numérico da config está na tela" cobre os dois campos novos), `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add src/nucleo/tipos.ts src/nucleo/faixas.ts src/dados/config.ts src/opcoes/opcoes.ts testes/faixas.test.ts testes/config.test.ts testes/opcoes.test.ts
git commit -F msg.txt   # "fcs-spy v3: faixas de vendas 30D com cortes editáveis"
```

---

### Task 2: Cor da faixa no card e na calculadora

**Files:**
- Modify: `src/nucleo/metricas.ts`, `src/ui/estilo.ts`, `src/ui/card.ts`, `src/ui/painel.ts`, `src/previa/previa.ts`
- Test: `testes/metricas.test.ts`, `testes/card.test.ts`, `testes/painel.test.ts`

**Interfaces:**
- Consumes: `faixaVendas`, `FaixaVendas` (Task 1).
- Produces: `Metricas.faixa: FaixaVendas | null`; classes CSS `cor-alta|cor-media|cor-baixa` (texto) e `faixa-alta|faixa-media|faixa-baixa` (borda esquerda) em `ESTILO_BASE`.

- [ ] **Step 1: Testes que falham**

`testes/metricas.test.ts`, acrescentar:
```ts
describe('faixa nas métricas', () => {
  it('usa os cortes da configuração', () => {
    expect(calcularMetricas(anuncio({ vendas30d: 1151 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('alta')
    expect(calcularMetricas(anuncio({ vendas30d: 188 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('media')
    expect(calcularMetricas(anuncio({ vendas30d: 12 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('baixa')
    expect(calcularMetricas(anuncio({ vendas30d: null }), CONFIG_PADRAO, hoje).faixa).toBeNull()
  })
})
```

`testes/card.test.ts`, acrescentar:
```ts
describe('cor da faixa no card', () => {
  const raiz = (a: Anuncio) => card(a).shadowRoot!
  it('número e borda na cor da faixa, com título explicativo', () => {
    const r = raiz(anuncio({ vendas30d: 1151 }))
    const numero = r.querySelector<HTMLElement>('.heroi .grande')!
    expect(numero.classList.contains('cor-alta')).toBe(true)
    expect(numero.title).toBe('Vendas altas: 300 ou mais no mês')
    expect(r.querySelector('.card')!.classList.contains('faixa-alta')).toBe(true)
  })
  it('média e baixa', () => {
    expect(raiz(anuncio({ vendas30d: 188 })).querySelector('.card')!.classList.contains('faixa-media')).toBe(true)
    expect(raiz(anuncio({ vendas30d: 12 })).querySelector('.card')!.classList.contains('faixa-baixa')).toBe(true)
  })
  it('sem vendas 30D o card fica neutro', () => {
    const r = raiz(anuncio({ vendas30d: null }))
    expect(r.querySelector('.card')!.className).toBe('card')
    expect(r.querySelector('.heroi .grande')!.className).toBe('grande num')
  })
})
```

`testes/painel.test.ts`, acrescentar ao `describe('montarPainel')`:
```ts
  it('vendas 30D do resumo na cor da faixa', () => {
    const leitura = { itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 12, vendasTotal: 100 }
    const r = montarPainel({ config: CONFIG_PADRAO, preco: 17.9, variacoes: null, leitura }).shadowRoot!
    expect(r.querySelector('.resumo .grande')!.classList.contains('cor-baixa')).toBe(true)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/metricas.test.ts testes/card.test.ts testes/painel.test.ts`
Expected: FAIL (`faixa` ausente, classes ausentes).

- [ ] **Step 3: Implementar**

`src/nucleo/metricas.ts`: importar `faixaVendas` e `type FaixaVendas` de `./faixas`; acrescentar `faixa: FaixaVendas | null` ao tipo `Metricas` e `faixa: faixaVendas(a.vendas30d, c),` no objeto retornado por `calcularMetricas`.

`src/ui/estilo.ts`, acrescentar ao fim de `ESTILO_BASE` (antes da crase final):
```css
.cor-alta { color: #15803D; }
.cor-media { color: #A16207; }
.cor-baixa { color: #B91C1C; }
.faixa-alta { border-left: 4px solid #22C55E; }
.faixa-media { border-left: 4px solid #EAB308; }
.faixa-baixa { border-left: 4px solid #EF4444; }
```

`src/ui/card.ts`, em `montarCard`:
- logo depois de `const card = el('div', 'card')`: `if (m.faixa) card.classList.add(\`faixa-${m.faixa.nivel}\`)`
- trocar `heroi.append(el('span', 'grande num', inteiro(a.vendas30d)), chip)` por:
```ts
  const numeroVendas = el('span', 'grande num', inteiro(a.vendas30d))
  if (m.faixa) {
    numeroVendas.classList.add(`cor-${m.faixa.nivel}`)
    numeroVendas.title = m.faixa.titulo
  }
  heroi.append(numeroVendas, chip)
```

`src/ui/painel.ts`: importar `faixaVendas` de `../nucleo/faixas`; depois de `grande.textContent = ...`:
```ts
  const faixa = faixaVendas(d.leitura ? d.leitura.vendas30d : null, d.config)
  if (faixa) {
    grande.classList.add(`cor-${faixa.nivel}`)
    grande.title = faixa.titulo
  }
```

`src/previa/previa.ts`: no terceiro exemplo (Bburago), trocar `vendas30d: 188` por `vendas30d: 18` para a prévia mostrar as três cores (1.151 verde, 1.345 verde, 18 vermelho). Acrescentar um quarto exemplo médio:
```ts
  [{ ...base, itemId: '5', titulo: 'Pegboard Setup Gamer', preco: 73.85, vendas30d: 120, vendasTotal: 2100, criadoEm: new Date('2026-01-10T12:00:00Z') },
    { dias: 3, difVendas30d: 0, difPreco: 0, seta: 'estavel' }],
```

- [ ] **Step 4: Rodar suíte, typecheck e build**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: PASS, `tsc` limpo, build gera `dist/` e `previa/`.

- [ ] **Step 5: Commit**

```bash
git add src/nucleo/metricas.ts src/ui/estilo.ts src/ui/card.ts src/ui/painel.ts src/previa/previa.ts testes/metricas.test.ts testes/card.test.ts testes/painel.test.ts
git commit -F msg.txt   # "fcs-spy v3: vendas 30D em verde, amarelo e vermelho"
```

- [ ] **Step 6 (controlador): conferência visual**

Print de `previa/index.html` em Chromium headless: borda e número verde, amarelo e vermelho nos cards certos.

---

### Task 3: Escuta geral e `acharCards`

**Files:**
- Modify: `src/page/escuta.ts`, `src/content/ponte.ts`, `src/shopee/traduzir.ts`
- Test: `testes/escuta.test.ts`, `testes/ponte.test.ts`, `testes/traduzir.test.ts`

**Interfaces:**
- Produces: `type Rota = 'produto' | 'cards'`; `rotaDe(url: string): Rota | null` (`pdp/get_pc` → `produto`; outra URL com `/api/` → `cards`; resto `null`); `temCards(texto: string): boolean`; `acharCards(json: unknown): Anuncio[]`. `traduzirBusca`, `traduzirVitrine`, `traduzirProduto`, `traduzirCard` ficam.

- [ ] **Step 1: Testes que falham**

`testes/traduzir.test.ts`, acrescentar (`busca` e `vitrine` já são importados no arquivo):
```ts
import { acharCards } from '../src/shopee/traduzir'

describe('acharCards', () => {
  it('acha os mesmos cards da busca e da vitrine', () => {
    expect(acharCards(busca).map(a => a.itemId)).toEqual(traduzirBusca(busca).map(a => a.itemId))
    expect(acharCards(vitrine)).toHaveLength(8)
  })
  it('acha card aninhado em qualquer formato de resposta', () => {
    const resposta = { data: { sections: [{ data: { item: [busca.items[0]] } }, { outra: busca.items[1] }] } }
    expect(acharCards(resposta).map(a => a.itemId)).toEqual(['58207314279', '58211960177'])
  })
  it('mesmo produto duas vezes fica uma só', () => {
    expect(acharCards({ a: [busca.items[0], busca.items[0]] })).toHaveLength(1)
  })
  it('para de descer além da profundidade máxima', () => {
    let fundo: unknown = busca.items[0]
    for (let i = 0; i < 20; i++) fundo = { x: fundo }
    expect(acharCards(fundo)).toEqual([])
  })
  it('lixo não quebra', () => {
    expect(acharCards(null)).toEqual([])
    expect(acharCards('texto')).toEqual([])
    expect(acharCards({ items: [null, 1, 'x', {}] })).toEqual([])
  })
})
```

`testes/escuta.test.ts`: substituir o `describe('rotaDe')` por:
```ts
describe('rotaDe', () => {
  it('produto continua com rota própria', () => {
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/get_pc?item_id=1&shop_id=2')).toBe('produto')
  })
  it('qualquer outra API vira candidata a cards', () => {
    expect(rotaDe(BUSCA)).toBe('cards')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/hot_sales/get_item_cards?item_id=1')).toBe('cards')
    expect(rotaDe('https://shopee.com.br/api/v4/homepage/get_daily_discover?limit=60')).toBe('cards')
  })
  it('fora de /api/ não interessa', () => {
    expect(rotaDe('https://shopee.com.br/search?keyword=x')).toBeNull()
    expect(rotaDe('https://deo.shopeemobile.com/x.js')).toBeNull()
  })
})

describe('temCards', () => {
  it('só textos com o marcador de card', () => {
    expect(temCards('{"items":[{"item_data":{"item_card_display_sold_count":{}}}]}')).toBe(true)
    expect(temCards('{"subcart":1}')).toBe(false)
  })
})
```
Importar `temCards` junto com `rotaDe`. Nos testes de fetch e XHR que esperam `rota: 'busca'` e corpo `{ items: [] }`: trocar o corpo publicado por um que tenha o marcador, ex. `'{"items":[{"item_card_display_sold_count":{}}]}'`, esperar `rota: 'cards'` e esse corpo parseado. Acrescentar:
```ts
  it('API sem marcador de card não é publicada', async () => {
    const { w, postMessage } = janelaFalsa('{"subcart":1}')
    await w.fetch('https://shopee.com.br/api/v4/web/subcart')
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
```

`testes/ponte.test.ts`: nas mensagens válidas, trocar `rota: 'busca'` por `rota: 'cards'`; no teste de rota inválida manter `'carrinho'` e acrescentar `enviar({ marca: 'fcs-spy', rota: 'busca' })` (rota antiga deixa de valer).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/traduzir.test.ts testes/escuta.test.ts testes/ponte.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/page/escuta.ts`:
```ts
export type Rota = 'produto' | 'cards'

const ROTA_PRODUTO = '/api/v4/pdp/get_pc'
// Marcador do formato de card de 2026: teste barato antes do JSON.parse.
const MARCADOR_CARD = '"item_card_display_sold_count"'

export function rotaDe(url: string): Rota | null {
  if (url.includes(ROTA_PRODUTO)) return 'produto'
  if (url.includes('/api/')) return 'cards'
  return null
}

export function temCards(texto: string): boolean {
  return texto.includes(MARCADOR_CARD)
}
```
Remover a lista `ROTAS`. Em `publicarTexto`, antes do `JSON.parse`: `if (rota === 'cards' && !temCards(texto)) return`. No ramo XHR com `responseType === 'json'`, quando a rota for `cards`, publicar só se `temCards(JSON.stringify(this.response))`.

`src/content/ponte.ts`: `const ROTAS_VALIDAS: Rota[] = ['produto', 'cards']`.

`src/shopee/traduzir.ts`, acrescentar:
```ts
const PROFUNDIDADE_MAXIMA = 12
const NOS_MAXIMOS = 5000

// Procura cards em qualquer lugar da resposta: página inicial, categoria, loja, busca, vitrines.
export function acharCards(json: unknown): Anuncio[] {
  const achados = new Map<string, Anuncio>()
  let nos = 0
  const visitar = (v: unknown, profundidade: number) => {
    if (profundidade > PROFUNDIDADE_MAXIMA || nos >= NOS_MAXIMOS || v === null || typeof v !== 'object') return
    nos++
    if (Array.isArray(v)) {
      for (const x of v) visitar(x, profundidade + 1)
      return
    }
    const o = v as Bruto
    if (o.item_data && typeof o.item_data === 'object') {
      const a = traduzirCard(o)
      if (a && !achados.has(a.itemId)) achados.set(a.itemId, a)
      return
    }
    for (const x of Object.values(o)) visitar(x, profundidade + 1)
  }
  visitar(json, 0)
  return [...achados.values()]
}
```
No teste de profundidade, o card está a 21 níveis; com `PROFUNDIDADE_MAXIMA = 12` não é achado.

- [ ] **Step 4: Rodar suíte e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: falha só em `src/content/main.ts` no typecheck se ele comparar com `'busca'`/`'vitrine'`; isso é resolvido na Task 4. Se `tsc` acusar, faça a Task 4 Step 3 junto e anote no relatório.

- [ ] **Step 5: Commit**

```bash
git add src/page/escuta.ts src/content/ponte.ts src/shopee/traduzir.ts testes/escuta.test.ts testes/ponte.test.ts testes/traduzir.test.ts
git commit -F msg.txt   # "fcs-spy v3: escuta geral e busca de cards em qualquer resposta"
```

---

### Task 4: Orquestração da cobertura geral e checagem por página

**Files:**
- Modify: `src/content/main.ts`, `mini-projetos/fcs-spy/docs/checagem-manual.md`

**Interfaces:**
- Consumes: `acharCards`, `Rota` (Task 3).

- [ ] **Step 1: Trocar a tradução em `receber`**

Em `src/content/main.ts`, importar `acharCards` (e remover `traduzirBusca`/`traduzirVitrine` do import se não forem mais usados). Trocar:
```ts
const anuncios = msg.rota === 'busca' ? traduzirBusca(msg.corpo) : traduzirVitrine(msg.corpo)
```
por:
```ts
const anuncios = acharCards(msg.corpo)
```

- [ ] **Step 2: Suíte, typecheck, build e check do bundle**

Run: `npx vitest run && npm run typecheck && npm run build && node -e "const s=require('fs').readFileSync('dist/escuta.js','utf8');console.log(s.length, /attachShadow|chrome\.storage/.test(s))"`
Expected: PASS, `tsc` limpo, escuta menor que 5000 bytes e `false`.

- [ ] **Step 3: Acrescentar ao `checagem-manual.md` uma seção "Cobertura geral (v3)"**

```markdown
## Cobertura geral (v3)

Em cada página: o painel aparece nos produtos? A grade quebra? O painel cabe no card?

- [ ] Página inicial, Descobertas do dia
- [ ] Página de categoria (ex.: Brinquedos e Hobbies)
- [ ] Página de uma loja (ex.: fcs3dstudio)
- [ ] Busca, ordenada por Mais vendidos
- [ ] Página de produto: similares e "da mesma loja"
- [ ] Ofertas relâmpago

Para cada item que falhar, anotar: a página, se a resposta chega (aviso no console ou não) e como o card da Shopee é montado ali (o `<li>` existe?).

## Cores das vendas (v3)

- [ ] Produto com 300+ vendas no mês: número e borda verdes
- [ ] Produto entre 50 e 299: amarelo
- [ ] Produto com menos de 50: vermelho
- [ ] Mudar "Verde a partir de" para 1000 em Seus custos: os cards recalculam sem recarregar
```

- [ ] **Step 4: Commit**

```bash
git add src/content/main.ts ../docs/checagem-manual.md
git commit -F msg.txt   # "fcs-spy v3: cards em todas as páginas do comprador"
```

- [ ] **Step 5 (usuário ou sessão com Chrome): checagem por página**

Rodar a seção "Cobertura geral (v3)" no Chrome. Página em que o card não aparece ou quebra a grade vira correção com base no que for visto ali (formato da resposta ou montagem do card), em rodada própria.
