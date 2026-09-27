# FCS SPY v2 visual: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o visual aprovado (fundo branco, cantos arredondados, ícones SVG inline) ao card da busca, barra, painel da calculadora e tela de opções, sem mudar regra de negócio.

**Architecture:** Tokens e estilos comuns em `src/ui/estilo.ts`; ícones SVG criados por `src/ui/icones.ts` com `createElementNS` (nada vindo da página); cada componente mantém seu arquivo e sua interface pública, só troca a estrutura DOM e o CSS. Uma página de prévia monta os componentes reais para conferência visual em Chromium headless.

**Tech Stack:** TypeScript, esbuild, Vitest + jsdom, Shadow DOM.

**Spec:** `mini-projetos/fcs-spy/docs/2026-09-27-fcs-spy-v2-visual-design.md`. **Referência visual:** `mini-projetos/fcs-spy/docs/mockup-v2.html` (CSS de origem) e `mockup-v2.png`.

## Global Constraints

- Comandos rodam em `mini-projetos/fcs-spy/extensao/`.
- Regras de negócio, escuta, tradução, histórico, ordenação e formato de dados não mudam.
- Campo ausente continua `sem dado`, nunca zero. Todos os `data-campo` e `name` de inputs do painel continuam iguais.
- Ciano `#00D8FF` nunca como cor de texto sobre branco. Texto sobre ciano é preto.
- Texto de interface em português, sem emoji, sem travessão.
- Ícones só por `icone()`; proibido `innerHTML` com qualquer texto vindo da Shopee.
- Valores monetários usam U+00A0 entre `R$` e o número (como o `Intl` gera). Nos testes, escrever ` `.
- Nunca `git add .`/`-A`. Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Tokens, ícones e formato curto de reais

**Files:**
- Modify: `src/ui/estilo.ts` (reescrever), `src/nucleo/formato.ts` (acrescentar `reaisCurto`)
- Create: `src/ui/icones.ts`
- Test: `testes/icones.test.ts` (novo), `testes/formato.test.ts` (acrescentar)

**Interfaces:**
- Produces: `ESTILO_BASE: string` (tokens + classes comuns: `.num`, `svg.ic`, `.rotulo`, `.grande`, `.heroi`, `.chip` e variantes `sobe|cai|estavel|novo`, `.est`, `.linha`, `.pilulas`, `.pilula`, `.selo`, `.icone-btn`, `.marca`, `.logo`, `.interruptor`); `ICONES`, `type NomeIcone`, `icone(nome: NomeIcone, doc?: Document): SVGSVGElement`, `marcaFcs(texto: string, doc?: Document): HTMLElement`; `reaisCurto(v: number | null): string`.

- [ ] **Step 1: Testes que falham**

Acrescentar em `testes/formato.test.ts`:
```ts
import { reaisCurto } from '../src/nucleo/formato'

describe('reaisCurto', () => {
  it('abaixo de 100 mostra centavos', () => expect(reaisCurto(3.92)).toBe('R$ 3,92'))
  it('de 100 a 999 arredonda para inteiro', () => expect(reaisCurto(379.83)).toBe('R$ 380'))
  it('milhar vira mil com uma casa', () => {
    expect(reaisCurto(11394.9)).toBe('R$ 11,4 mil')
    expect(reaisCurto(1000)).toBe('R$ 1 mil')
  })
  it('milhão vira mi', () => expect(reaisCurto(1250000)).toBe('R$ 1,3 mi'))
  it('negativo leva o sinal na frente', () => expect(reaisCurto(-2500)).toBe('-R$ 2,5 mil'))
  it('null vira sem dado', () => expect(reaisCurto(null)).toBe('sem dado'))
})
```
(Juntar o import com o import existente do arquivo.)

Criar `testes/icones.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { icone, marcaFcs, ICONES, type NomeIcone } from '../src/ui/icones'

describe('icone', () => {
  it('svg decorativo com classe ic e viewBox 24', () => {
    const svg = icone('calendario')
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('class')).toBe('ic')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.children).toHaveLength(2)
  })
  it('todo ícone do conjunto desenha pelo menos uma forma', () => {
    for (const nome of Object.keys(ICONES) as NomeIcone[]) {
      expect(icone(nome).children.length, nome).toBeGreaterThan(0)
    }
  })
  it('conjunto completo da spec', () => {
    expect(Object.keys(ICONES).sort()).toEqual([
      'alvo', 'balao', 'cai', 'calendario', 'carteira', 'check', 'copiar', 'coracao',
      'cubo', 'engrenagem', 'estrela', 'loja', 'mais', 'menos', 'ordenar', 'seta', 'sobe',
    ])
  })
})

describe('marcaFcs', () => {
  it('logo e texto', () => {
    const m = marcaFcs('Calculadora')
    expect(m.className).toBe('marca')
    expect(m.querySelector('.logo')).not.toBeNull()
    expect(m.textContent).toBe('Calculadora')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/formato.test.ts testes/icones.test.ts`
Expected: FAIL (`reaisCurto` e módulo `icones` inexistentes).

- [ ] **Step 3: Implementar `reaisCurto` em `src/nucleo/formato.ts`**

Acrescentar ao fim do arquivo (usa `BRL`/`INTEIRO`/`reais` já existentes; se os nomes das constantes forem outros no arquivo, use os existentes):
```ts
const CURTO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

// Formato para blocos estreitos do card: R$ 3,92, R$ 380, R$ 11,4 mil, R$ 1,3 mi.
export function reaisCurto(v: number | null): string {
  if (v === null) return SEM_DADO
  if (v < 0) return `-${reaisCurto(-v)}`
  if (v < 100) return reais(v)
  if (v < 1_000) return `R$ ${INTEIRO.format(Math.round(v))}`
  if (v < 1_000_000) return `R$ ${CURTO.format(v / 1_000)} mil`
  return `R$ ${CURTO.format(v / 1_000_000)} mi`
}
```

- [ ] **Step 4: Criar `src/ui/icones.ts`**

```ts
// Ícones de linha 24x24 desenhados só com formas fixas daqui. Nada vem da página.
const SVG = 'http://www.w3.org/2000/svg'

type Forma = [string, Record<string, string>]
const p = (d: string): Forma => ['path', { d }]

export const ICONES = {
  calendario: [['rect', { x: '3', y: '5', width: '18', height: '16', rx: '3' }], p('M8 3v4M16 3v4M3 10h18')],
  carteira: [p('M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'), p('M4 7l11-3v3M16 13.5h.01')],
  sobe: [p('M4 16l6-6 4 4 6-7'), p('M15 7h5v5')],
  cai: [p('M4 8l6 6 4-4 6 7'), p('M15 17h5v-5')],
  seta: [p('M6 9l6 6 6-6')],
  copiar: [['rect', { x: '9', y: '9', width: '11', height: '11', rx: '2.5' }], p('M5 15V6a2 2 0 0 1 2-2h9')],
  coracao: [p('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z')],
  balao: [p('M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4V6a1 1 0 0 1 1-1z')],
  estrela: [p('M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.5-.8z')],
  ordenar: [p('M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3')],
  engrenagem: [
    ['circle', { cx: '12', cy: '12', r: '3' }],
    p('M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'),
  ],
  menos: [p('M6 12h12')],
  mais: [p('M6 12h12M12 6v12')],
  cubo: [p('M12 3l8 4.5v9L12 21l-8-4.5v-9z'), p('M4 7.5l8 4.5 8-4.5M12 12v9')],
  loja: [p('M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16'), p('M9 20v-6h6v6')],
  alvo: [
    ['circle', { cx: '12', cy: '12', r: '8' }],
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['circle', { cx: '12', cy: '12', r: '.5' }],
  ],
  check: [p('M5 12.5l4.5 4.5L19 7.5')],
} satisfies Record<string, Forma[]>

export type NomeIcone = keyof typeof ICONES

export function icone(nome: NomeIcone, doc: Document = document): SVGSVGElement {
  const svg = doc.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'ic')
  svg.setAttribute('aria-hidden', 'true')
  for (const [tag, attrs] of ICONES[nome] as Forma[]) {
    const forma = doc.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) forma.setAttribute(k, v)
    svg.append(forma)
  }
  return svg
}

// Marca da FCS: quadrado preto com miolo ciano, seguido do texto.
export function marcaFcs(texto: string, doc: Document = document): HTMLElement {
  const marca = doc.createElement('span')
  marca.className = 'marca'
  const logo = doc.createElement('span')
  logo.className = 'logo'
  logo.append(doc.createElement('i'))
  marca.append(logo, texto)
  return marca
}
```

- [ ] **Step 5: Reescrever `src/ui/estilo.ts`**

```ts
// Visual v2: fundo branco, cantos arredondados, preto e ciano da FCS.
// Exceção ao design guide aprovada pelo usuário em 27/09/2026 (só na extensão).
export const ESTILO_BASE = `
:host { all: initial; }
:host {
  --fundo: #FFFFFF; --superficie: #F3F5F6; --linha: #E6E9EB; --texto: #0A0A0A; --suave: #6B7177;
  --ciano: #00D8FF; --ciano-claro: #E0F9FF; --ciano-escuro: #006B80; --preto: #0A0A0A;
  --raio: 14px; --raio-sm: 10px;
  --sombra: 0 1px 2px rgba(10,10,10,.04), 0 8px 24px rgba(10,10,10,.06);
}
* { box-sizing: border-box; margin: 0; font-family: Inter, "Segoe UI", system-ui, sans-serif; }
.num { font-variant-numeric: tabular-nums; }
svg.ic { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.rotulo { color: var(--suave); font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.heroi { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; }
.grande { font-size: 28px; font-weight: 700; line-height: 1; letter-spacing: -.02em; color: var(--texto); }
.chip { display: inline-flex; align-items: center; gap: 3px; border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.chip.sobe { background: var(--ciano); color: var(--preto); }
.chip.cai { background: var(--preto); color: #FFFFFF; }
.chip.estavel, .chip.novo { background: var(--superficie); color: var(--suave); }
.est { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--ciano); margin-left: 4px; vertical-align: middle; }
.linha { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.linha > span:first-child { color: var(--suave); display: inline-flex; gap: 5px; align-items: center; }
.linha b { font-weight: 600; }
.pilulas { display: flex; gap: 4px; flex-wrap: wrap; }
.pilula { background: var(--superficie); border-radius: 999px; padding: 3px 7px; font-size: 10px; }
.pilula em { font-style: normal; color: var(--suave); }
.selo { background: var(--ciano-claro); color: var(--ciano-escuro); border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 700; }
.icone-btn { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; border: 1px solid var(--linha); background: var(--fundo); color: var(--texto); cursor: pointer; flex: none; padding: 0; }
.icone-btn:hover { border-color: var(--texto); }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--ciano); outline-offset: 2px; }
.marca { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; letter-spacing: .02em; color: var(--texto); }
.logo { width: 22px; height: 22px; border-radius: 7px; background: var(--preto); display: grid; place-items: center; }
.logo i { width: 8px; height: 8px; border-radius: 2px; background: var(--ciano); }
.interruptor { appearance: none; position: relative; width: 34px; height: 20px; border: 0; border-radius: 999px; background: #D5DADD; cursor: pointer; flex: none; margin: 0; padding: 0; }
.interruptor::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: left .15s; }
.interruptor[aria-checked="true"], .interruptor:checked { background: var(--ciano); }
.interruptor[aria-checked="true"]::after, .interruptor:checked::after { left: 16px; }
.interruptor:disabled { opacity: .5; cursor: default; }
`
```

- [ ] **Step 6: Rodar testes, typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (os testes dos componentes ainda passam porque só a base mudou), `tsc` limpo.

- [ ] **Step 7: Commit**

```bash
git add src/ui/estilo.ts src/ui/icones.ts src/nucleo/formato.ts testes/icones.test.ts testes/formato.test.ts
git commit -m "fcs-spy v2: tokens brancos, ícones SVG e reais curtos"
```

---

### Task 2: Card da busca

**Files:**
- Modify: `src/ui/card.ts` (só a parte visual: `montarCard`, CSS, helpers; `textoHistorico`, `linkDoProduto`, `mapaDeLinks`, `chaveDoProduto`, `containerDoCard`, `anexarCard` ficam iguais)
- Test: `testes/card.test.ts`

**Interfaces:**
- Consumes: `ESTILO_BASE`, `icone`, `NomeIcone`, `reaisCurto`.
- Produces: `chipHistorico(h: EstadoHistorico): { classe: 'sobe' | 'cai' | 'estavel' | 'novo'; texto: string; icone: NomeIcone | null }`. `montarCard(d: DadosCard): HTMLElement` com a mesma assinatura.

- [ ] **Step 1: Ajustar e acrescentar testes em `testes/card.test.ts`**

Importar `chipHistorico` junto com os outros de `../src/ui/card`. No teste `'mostra as métricas conferidas'`, trocar estas asserções:
- `'390 dias no ar'` → `'390 dias'`
- `'recebe R$ 3,92'` → `'R$ 3,92'`
- `'R$ 11.394,90'` → `'R$ 11,4 mil'`
- `'R$ 379,83'` → `'R$ 380'`
- `expect(t).toContain('est.')` → `expect(host.shadowRoot!.querySelectorAll('.est').length).toBeGreaterThan(0)`

Manter as demais (`'1.151'`, `'4.595'`, `'R$ 45.490,50'`, `'10% R$ 2,93'`, `'primeira leitura'`, `'Loja Teste'`). Acrescentar:
```ts
describe('card v2', () => {
  const raiz = (h: HTMLElement) => h.shadowRoot!

  it('ver mais abre e fecha os detalhes', () => {
    const r = raiz(card(anuncio()))
    const detalhes = r.querySelector<HTMLElement>('.detalhes')!
    const mais = r.querySelector<HTMLButtonElement>('.mais')!
    expect(detalhes.hidden).toBe(true)
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.textContent).toBe('ver mais')
    mais.click()
    expect(detalhes.hidden).toBe(false)
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    expect(mais.textContent).toBe('fechar')
  })
  it('recebe e dias no ar têm título explicativo', () => {
    const r = raiz(card(anuncio()))
    expect(r.querySelector('[title="Dias no ar"]')!.textContent).toBe('390 dias')
    expect(r.querySelector('[title^="Quanto o vendedor recebe"]')!.textContent).toBe('R$ 3,92')
  })
  it('chip de tendência leva a frase completa no title', () => {
    const h = { dias: 7, difVendas30d: 120, difPreco: -2, seta: 'sobe' as const }
    const chip = raiz(card(anuncio(), h)).querySelector<HTMLElement>('.chip')!
    expect(chip.className).toBe('chip sobe')
    expect(chip.textContent).toBe('+120')
    expect(chip.title).toBe(textoHistorico(h))
  })
  it('copiar tem nome acessível e ícones estão presentes', () => {
    const r = raiz(card(anuncio()))
    expect(r.querySelector('button[aria-label="Copiar nome da loja"]')).not.toBeNull()
    expect(r.querySelectorAll('svg.ic').length).toBeGreaterThan(4)
  })
})

describe('chipHistorico', () => {
  it('estados', () => {
    expect(chipHistorico(null)).toEqual({ classe: 'novo', texto: '1ª leitura', icone: null })
    expect(chipHistorico('indisponivel')).toEqual({ classe: 'novo', texto: 'sem histórico', icone: null })
    expect(chipHistorico({ dias: 1, difVendas30d: null, difPreco: 0, seta: null }))
      .toEqual({ classe: 'novo', texto: 'sem dado', icone: null })
    expect(chipHistorico({ dias: 1, difVendas30d: 1200, difPreco: 0, seta: 'sobe' }))
      .toEqual({ classe: 'sobe', texto: '+1.200', icone: 'sobe' })
    expect(chipHistorico({ dias: 1, difVendas30d: -40, difPreco: 0, seta: 'cai' }))
      .toEqual({ classe: 'cai', texto: '-40', icone: 'cai' })
    expect(chipHistorico({ dias: 1, difVendas30d: 0, difPreco: 0, seta: 'estavel' }))
      .toEqual({ classe: 'estavel', texto: '0', icone: null })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/card.test.ts`
Expected: FAIL (textos novos e `chipHistorico` ausentes).

- [ ] **Step 3: Reescrever a parte visual de `src/ui/card.ts`**

Substituir os imports, `ESTILO_CARD`, `el`, `linha` e `montarCard` por:
```ts
import type { Anuncio, Tendencia } from '../nucleo/tipos'
import type { Metricas } from '../nucleo/metricas'
import { reais, reaisCurto, inteiro, pct, SEM_DADO } from '../nucleo/formato'
import { idDaUrl, seletorDoLink, type IdProduto } from '../shopee/url'
import { ESTILO_BASE } from './estilo'
import { icone, type NomeIcone } from './icones'

export const ATRIBUTO_CARD = 'data-fcs-spy-card'
export type EstadoHistorico = Tendencia | null | 'indisponivel'
export type DadosCard = { anuncio: Anuncio; metricas: Metricas; historico: EstadoHistorico }

const ESTILO_CARD = `
.card { background: var(--fundo); border: 1px solid var(--linha); border-radius: var(--raio); padding: 10px; margin-top: 6px; display: grid; gap: 8px; font-size: 11px; color: var(--texto); box-shadow: var(--sombra); }
.meta { display: flex; justify-content: space-between; align-items: center; gap: 6px; color: var(--suave); }
.meta span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.blocos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.bloco { background: var(--superficie); border-radius: var(--raio-sm); padding: 7px; display: grid; gap: 2px; min-width: 0; }
.bloco b { font-size: 12px; white-space: nowrap; letter-spacing: -.01em; }
.mais { display: flex; align-items: center; justify-content: center; gap: 4px; background: none; border: 0; color: var(--suave); font: inherit; font-weight: 600; cursor: pointer; padding: 3px; border-radius: 999px; }
.mais:hover { color: var(--texto); background: var(--superficie); }
.mais[aria-expanded="true"] svg { transform: rotate(180deg); }
.detalhes { display: grid; gap: 6px; border-top: 1px solid var(--linha); padding-top: 8px; }
.detalhes[hidden] { display: none; }
.social { display: flex; justify-content: space-between; }
.social span { display: inline-flex; align-items: center; gap: 4px; color: var(--suave); }
.social b { color: var(--texto); font-weight: 600; }
.loja { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.loja .nome { display: inline-flex; align-items: center; gap: 5px; min-width: 0; font-weight: 600; }
.loja .nome span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.historico { color: var(--suave); font-size: 10px; }
.legenda { display: flex; align-items: center; gap: 4px; color: var(--suave); font-size: 9px; }
.legenda .est { margin: 0; }
`

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texto !== undefined) e.textContent = texto
  return e
}

function comIcone(nome: NomeIcone, texto: string, titulo: string): HTMLElement {
  const s = el('span', 'num')
  s.title = titulo
  s.append(icone(nome), texto)
  return s
}

function linha(rotulo: string, valor: string, estimativa = false): HTMLElement {
  const l = el('div', 'linha')
  const r = el('span', '', rotulo)
  if (estimativa) r.append(el('i', 'est'))
  l.append(r, el('b', 'num', valor))
  return l
}

function bloco(rotulo: string, valor: string): HTMLElement {
  const b = el('div', 'bloco')
  const r = el('span', 'rotulo', rotulo)
  r.append(el('i', 'est'))
  b.append(r, el('b', 'num', valor))
  return b
}

export function textoHistorico(h: EstadoHistorico): string {
  // (corpo atual sem mudança)
}

export function chipHistorico(h: EstadoHistorico): { classe: 'sobe' | 'cai' | 'estavel' | 'novo'; texto: string; icone: NomeIcone | null } {
  if (h === 'indisponivel') return { classe: 'novo', texto: 'sem histórico', icone: null }
  if (h === null) return { classe: 'novo', texto: '1ª leitura', icone: null }
  if (h.difVendas30d === null || h.seta === null) return { classe: 'novo', texto: 'sem dado', icone: null }
  if (h.seta === 'sobe') return { classe: 'sobe', texto: `+${inteiro(h.difVendas30d)}`, icone: 'sobe' }
  if (h.seta === 'cai') return { classe: 'cai', texto: inteiro(h.difVendas30d), icone: 'cai' }
  return { classe: 'estavel', texto: '0', icone: null }
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

  const meta = el('div', 'meta')
  meta.append(
    comIcone('calendario', m.diasNoAr === null ? SEM_DADO : `${inteiro(m.diasNoAr)} dias`, 'Dias no ar'),
    comIcone('carteira', reais(m.recebe), 'Quanto o vendedor recebe por venda, depois da taxa Shopee'),
  )

  const vendas = el('div', '')
  const heroi = el('div', 'heroi')
  const c = chipHistorico(d.historico)
  const chip = el('span', `chip ${c.classe}`)
  if (c.icone) chip.append(icone(c.icone))
  chip.append(c.texto)
  chip.title = textoHistorico(d.historico)
  heroi.append(el('span', 'grande num', inteiro(a.vendas30d)), chip)
  vendas.append(el('div', 'rotulo', 'Vendas 30D'), heroi)

  const blocos = el('div', 'blocos')
  blocos.append(bloco('Fatur. 30D', reaisCurto(m.faturamento30d)), bloco('Por dia', reaisCurto(m.mediaDiaria)))

  const detalhes = el('div', 'detalhes')
  detalhes.hidden = true
  const mais = el('button', 'mais')
  mais.type = 'button'
  mais.setAttribute('aria-expanded', 'false')
  const rotuloMais = el('span', '', 'ver mais')
  mais.append(rotuloMais, icone('seta'))
  mais.addEventListener('click', ev => {
    ev.preventDefault()
    detalhes.hidden = !detalhes.hidden
    mais.setAttribute('aria-expanded', String(!detalhes.hidden))
    rotuloMais.textContent = detalhes.hidden ? 'ver mais' : 'fechar'
  })

  const alvo = el('div', '')
  const pilulas = el('div', 'pilulas')
  for (const ca of m.custoAlvo) {
    const p = el('span', 'pilula num')
    p.append(el('em', '', pct(ca.margem)), ` ${reais(ca.valor)}`)
    pilulas.append(p)
  }
  alvo.append(el('div', 'rotulo', 'Custo alvo'), pilulas)

  const social = el('div', 'social')
  const itensSociais: [NomeIcone, string, string][] = [
    ['coracao', inteiro(a.likes), 'Likes'],
    ['balao', inteiro(a.reviews), 'Reviews'],
    ['estrela', a.nota === null ? SEM_DADO : a.nota.toFixed(1).replace('.', ','), 'Nota'],
  ]
  for (const [nome, valor, titulo] of itensSociais) {
    const s = el('span', '')
    s.title = titulo
    s.append(icone(nome), el('b', 'num', valor))
    social.append(s)
  }

  detalhes.append(
    linha('Vendas total', inteiro(a.vendasTotal)),
    linha('Fatur. total', reais(m.faturamentoTotal), true),
    linha('Preço (menor)', reais(a.preco)),
    alvo,
    social,
  )

  const nomesSelos = [
    a.selos.indicado ? 'Indicado' : null,
    a.selos.lojaOficial ? 'Loja oficial' : null,
    a.selos.ads ? 'Ads' : null,
  ].filter((s): s is string => s !== null)
  if (nomesSelos.length) {
    const selos = el('div', 'pilulas')
    for (const s of nomesSelos) selos.append(el('span', 'selo', s))
    detalhes.append(selos)
  }

  const loja = el('div', 'loja')
  const nome = el('span', 'nome')
  nome.append(icone('loja'), el('span', '', a.loja ?? SEM_DADO))
  loja.append(nome)
  if (a.loja) {
    const nomeLoja = a.loja
    const copiar = el('button', 'icone-btn')
    copiar.type = 'button'
    copiar.setAttribute('aria-label', 'Copiar nome da loja')
    copiar.title = 'Copiar nome da loja'
    copiar.append(icone('copiar'))
    copiar.addEventListener('click', ev => {
      ev.preventDefault()
      void navigator.clipboard?.writeText(nomeLoja)
    })
    loja.append(copiar)
  }

  const legenda = el('div', 'legenda')
  legenda.append(el('i', 'est'), 'estimativa com o menor preço atual')
  detalhes.append(loja, el('div', 'historico', textoHistorico(d.historico)), legenda)

  card.append(meta, vendas, blocos, mais, detalhes)
  raiz.append(estilo, card)
  return host
}
```
Manter `textoHistorico` com o corpo atual e todo o código abaixo de `montarCard` (`linkDoProduto` em diante) sem mudança.

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS, `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add src/ui/card.ts testes/card.test.ts
git commit -m "fcs-spy v2: card com vendas 30D em destaque e ver mais"
```

---

### Task 3: Barra flutuante

**Files:**
- Modify: `src/ui/barra.ts` (`montarBarra` e CSS; `aplicarLigado`, `sincronizarBarra`, `instalarEstiloGlobal` sem mudança)
- Modify: `src/content/main.ts` (passar o terceiro argumento)
- Test: `testes/barra.test.ts`

**Interfaces:**
- Consumes: `ESTILO_BASE`, `icone`, `marcaFcs`.
- Produces: `montarBarra(aoOrdenar: (c: Criterio) => void, aoAlternar: (ligado: boolean) => void, aoAbrirCustos?: () => void): HTMLElement`.

- [ ] **Step 1: Ajustar testes em `testes/barra.test.ts`**

Substituir o teste `'botão alterna ligado e desligado'` por:
```ts
  it('interruptor alterna ligado e desligado', () => {
    const aoAlternar = vi.fn()
    const host = montarBarra(vi.fn(), aoAlternar)
    const r = host.shadowRoot!
    const chave = r.querySelector<HTMLButtonElement>('[role="switch"]')!
    const select = r.querySelector('select')!
    expect(chave.getAttribute('aria-checked')).toBe('true')
    expect(chave.getAttribute('aria-label')).toBe('Ligar e desligar o FCS SPY')
    chave.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(false)
    expect(chave.getAttribute('aria-checked')).toBe('false')
    expect(select.disabled).toBe(true)
    chave.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(true)
    expect(select.disabled).toBe(false)
  })
  it('engrenagem abre os custos quando há callback', () => {
    const aoAbrirCustos = vi.fn()
    const r = montarBarra(vi.fn(), vi.fn(), aoAbrirCustos).shadowRoot!
    r.querySelector<HTMLButtonElement>('button[aria-label="Custos"]')!.click()
    expect(aoAbrirCustos).toHaveBeenCalledOnce()
    expect(montarBarra(vi.fn(), vi.fn()).shadowRoot!.querySelector('button[aria-label="Custos"]')).toBeNull()
  })
```
O teste `'escolher critério chama aoOrdenar'` continua igual.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/barra.test.ts`
Expected: FAIL (não existe `[role="switch"]` nem botão Custos).

- [ ] **Step 3: Reescrever `montarBarra` e o CSS em `src/ui/barra.ts`**

Acrescentar `import { icone, marcaFcs } from './icones'` e substituir `ESTILO_BARRA` e `montarBarra` por:
```ts
const ESTILO_BARRA = `
.barra { display: inline-flex; align-items: center; gap: 8px; background: var(--fundo); border: 1px solid var(--linha); border-radius: 999px; padding: 6px 6px 6px 8px; box-shadow: var(--sombra); font-size: 12px; color: var(--texto); }
.seletor { display: inline-flex; align-items: center; gap: 6px; background: var(--superficie); border-radius: 999px; padding: 0 10px; color: var(--texto); }
.seletor select { appearance: none; border: 0; background: transparent; font: inherit; color: var(--texto); padding: 6px 0; cursor: pointer; }
.seletor select:disabled { color: var(--suave); cursor: default; }
`

export function montarBarra(
  aoOrdenar: (c: Criterio) => void,
  aoAlternar: (ligado: boolean) => void,
  aoAbrirCustos?: () => void,
): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_BARRA, '')
  host.style.cssText = 'position:fixed;top:120px;right:12px;z-index:2147483647'
  const raiz = host.attachShadow({ mode: 'open' })

  const estilo = document.createElement('style')
  estilo.textContent = ESTILO_BASE + ESTILO_BARRA
  const barra = document.createElement('div')
  barra.className = 'barra'

  const seletor = document.createElement('label')
  seletor.className = 'seletor'
  const select = document.createElement('select')
  select.append(new Option('Ordenar os itens desta página', ''))
  for (const c of CRITERIOS) select.append(new Option(c.rotulo, c.valor))
  select.addEventListener('change', () => {
    if (select.value) aoOrdenar(select.value as Criterio)
  })
  seletor.append(icone('ordenar'), select, icone('seta'))

  let ligado = true
  const chave = document.createElement('button')
  chave.type = 'button'
  chave.className = 'interruptor'
  chave.setAttribute('role', 'switch')
  chave.setAttribute('aria-checked', 'true')
  chave.setAttribute('aria-label', 'Ligar e desligar o FCS SPY')
  chave.title = 'Ligar e desligar o FCS SPY'
  chave.addEventListener('click', () => {
    ligado = !ligado
    chave.setAttribute('aria-checked', String(ligado))
    select.disabled = !ligado
    aoAlternar(ligado)
  })

  barra.append(marcaFcs('FCS SPY'), seletor, chave)
  if (aoAbrirCustos) {
    const custos = document.createElement('button')
    custos.type = 'button'
    custos.className = 'icone-btn'
    custos.setAttribute('aria-label', 'Custos')
    custos.title = 'Custos e configurações'
    custos.append(icone('engrenagem'))
    custos.addEventListener('click', () => aoAbrirCustos())
    barra.append(custos)
  }
  raiz.append(estilo, barra)
  return host
}
```

- [ ] **Step 4: Ligar a engrenagem no `src/content/main.ts`**

Criar dentro de `iniciar()` (perto das outras funções internas) uma função única e usá-la nos dois lugares:
```ts
  function abrirCustos() {
    chrome.runtime.sendMessage({ tipo: MENSAGEM_ABRIR_OPCOES }).catch(e => console.warn('[FCS SPY] custos', e))
  }
```
- Na chamada de `sincronizarBarra`, passar `abrirCustos` como terceiro argumento de `montarBarra`.
- No `montarPainel`, trocar o `aoAbrirCustos: () => { ... }` atual por `aoAbrirCustos: abrirCustos`.

- [ ] **Step 5: Rodar testes e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS, `tsc` limpo.

- [ ] **Step 6: Commit**

```bash
git add src/ui/barra.ts src/content/main.ts testes/barra.test.ts
git commit -m "fcs-spy v2: barra em pílula com interruptor e engrenagem"
```

---

### Task 4: Painel da calculadora

**Files:**
- Modify: `src/ui/painel.ts` (visual; `lerNumero`, `textoLeitura` e as regras de `sem dado` ficam)
- Test: `testes/painel.test.ts`

**Interfaces:**
- Consumes: `ESTILO_BASE`, `icone`, `marcaFcs`, `NomeIcone`.
- Produces: `montarPainel(d: DadosPainel): HTMLElement` com a mesma assinatura. Mantém `input[name=preco|gramas|horas|minutos|ads|roas]`, o `select` de variação e os sete `[data-campo=...] .valor`.

- [ ] **Step 1: Ajustar testes em `testes/painel.test.ts`**

- No `describe('botão Custos')`, trocar a busca do botão para `raiz.querySelector<HTMLButtonElement>('button[aria-label="Custos"]')` (com callback: não nulo e clica; sem callback: `toBeNull()`).
- Substituir o teste `'recolher esconde o corpo'` por:
```ts
  it('recolher esconde o corpo e vira abrir', () => {
    const raiz = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null }).shadowRoot!
    const botao = raiz.querySelector<HTMLButtonElement>('button[aria-label="Recolher"]')!
    botao.click()
    expect(raiz.querySelector<HTMLElement>('.corpo')!.hidden).toBe(true)
    expect(botao.getAttribute('aria-label')).toBe('Abrir')
    botao.click()
    expect(raiz.querySelector<HTMLElement>('.corpo')!.hidden).toBe(false)
    expect(botao.getAttribute('aria-label')).toBe('Recolher')
  })
```
- Acrescentar:
```ts
  it('resumo mostra vendas 30D grande e a linha da leitura', () => {
    const leitura = { itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 196, vendasTotal: 1596 }
    const r = montarPainel({ config: cfg, preco: 17.9, variacoes: null, leitura }).shadowRoot!
    expect(r.querySelector('.resumo .grande')!.textContent).toBe('196')
    expect(r.querySelector('.resumo small')!.textContent).toBe(textoLeitura(leitura))
    const vazio = montarPainel({ config: cfg, preco: 17.9, variacoes: null, leitura: null }).shadowRoot!
    expect(vazio.querySelector('.resumo .grande')!.textContent).toBe('sem dado')
  })
  it('unidades dentro dos campos e ads como interruptor', () => {
    const r = montarPainel({ config: cfg, preco: 10, variacoes: null, leitura: null }).shadowRoot!
    const unidade = (nome: string) =>
      [...r.querySelector(`input[name="${nome}"]`)!.parentElement!.querySelectorAll('.unidade')].map(u => u.textContent)
    expect(unidade('preco')).toEqual(['R$'])
    expect(unidade('gramas')).toEqual(['g'])
    expect(unidade('horas')).toEqual(['h'])
    expect(unidade('minutos')).toEqual(['min'])
    expect(unidade('roas')).toEqual(['x'])
    const ads = r.querySelector<HTMLInputElement>('input[name="ads"]')!
    expect(ads.type).toBe('checkbox')
    expect(ads.className).toBe('interruptor')
  })
```
Todos os outros testes do arquivo continuam iguais.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/painel.test.ts`
Expected: FAIL (aria-labels, `.resumo`, `.unidade` ausentes).

- [ ] **Step 3: Reescrever a parte visual de `src/ui/painel.ts`**

Acrescentar `import { icone, marcaFcs, type NomeIcone } from './icones'`. Substituir `ESTILO_PAINEL`, `campo`, `linhaResultado` e `montarPainel` por:
```ts
const ESTILO_PAINEL = `
.painel { background: var(--fundo); border: 1px solid var(--linha); border-radius: 18px; box-shadow: var(--sombra); padding: 14px; display: grid; gap: 12px; font-size: 12px; color: var(--texto); }
.painel-topo { display: flex; justify-content: space-between; align-items: center; }
.acoes { display: flex; gap: 6px; }
.corpo { display: grid; gap: 12px; }
.corpo[hidden] { display: none; }
.resumo { background: var(--superficie); border-radius: var(--raio); padding: 12px; display: grid; gap: 4px; }
.resumo .grande { font-size: 26px; }
.resumo small { color: var(--suave); font-size: 11px; }
.campos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.campo { display: grid; gap: 4px; min-width: 0; }
.campo.cheio { grid-column: 1 / -1; }
.entrada { display: flex; align-items: center; gap: 6px; background: var(--superficie); border: 1px solid transparent; border-radius: var(--raio-sm); padding: 7px 10px; }
.entrada:focus-within { border-color: var(--ciano); background: var(--fundo); }
.entrada input, .entrada select { appearance: none; border: 0; background: transparent; font: inherit; width: 100%; min-width: 0; outline: none; color: var(--texto); font-variant-numeric: tabular-nums; }
.entrada .unidade { color: var(--suave); font-size: 11px; }
.ads { display: flex; justify-content: space-between; align-items: center; }
.lucro { background: var(--preto); color: #FFFFFF; border-radius: var(--raio); padding: 14px; display: grid; gap: 6px; }
.lucro .rotulo { color: #9BA1A6; }
.lucro .grande { color: #FFFFFF; }
.lucro .chip { background: var(--ciano); color: var(--preto); }
.lucro small { color: #9BA1A6; font-size: 11px; }
.contas { display: grid; gap: 6px; }
`

type Unidade = { prefixo?: string; sufixo?: string; cheio?: boolean }

function campo(pai: HTMLElement, rotulo: string, nome: string, inicial: string, u: Unidade = {}): HTMLInputElement {
  const label = document.createElement('label')
  label.className = u.cheio ? 'campo cheio' : 'campo'
  const titulo = document.createElement('span')
  titulo.className = 'rotulo'
  titulo.textContent = rotulo
  const entrada = document.createElement('div')
  entrada.className = 'entrada'
  const input = document.createElement('input')
  input.name = nome
  input.value = inicial
  input.inputMode = 'decimal'
  const unidade = (texto: string) => {
    const s = document.createElement('span')
    s.className = 'unidade'
    s.textContent = texto
    return s
  }
  if (u.prefixo) entrada.append(unidade(u.prefixo))
  entrada.append(input)
  if (u.sufixo) entrada.append(unidade(u.sufixo))
  label.append(titulo, entrada)
  pai.append(label)
  return input
}

function conta(chave: string, nomeIcone: NomeIcone, rotulo: string, valor: string): HTMLElement {
  const l = document.createElement('div')
  l.className = 'linha'
  l.dataset.campo = chave
  const r = document.createElement('span')
  r.append(icone(nomeIcone), rotulo)
  const v = document.createElement('b')
  v.className = 'valor num'
  v.textContent = valor
  l.append(r, v)
  return l
}

function botaoIcone(rotulo: string, titulo: string, nome: NomeIcone): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'icone-btn'
  b.setAttribute('aria-label', rotulo)
  b.title = titulo
  b.append(icone(nome))
  return b
}

export function montarPainel(d: DadosPainel): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute(ATRIBUTO_PAINEL, '')
  host.style.cssText = 'position:fixed;top:180px;right:12px;z-index:2147483646;width:280px'
  const raiz = host.attachShadow({ mode: 'open' })

  const estilo = document.createElement('style')
  estilo.textContent = ESTILO_BASE + ESTILO_PAINEL
  const painel = document.createElement('div')
  painel.className = 'painel'

  const topo = document.createElement('div')
  topo.className = 'painel-topo'
  const acoes = document.createElement('div')
  acoes.className = 'acoes'
  if (d.aoAbrirCustos) {
    const aoAbrirCustos = d.aoAbrirCustos
    const custos = botaoIcone('Custos', 'Editar custos de impressão, imposto e comissão', 'engrenagem')
    custos.addEventListener('click', () => aoAbrirCustos())
    acoes.append(custos)
  }
  const recolher = botaoIcone('Recolher', 'Recolher', 'menos')
  acoes.append(recolher)
  topo.append(marcaFcs('Calculadora'), acoes)

  const corpo = document.createElement('div')
  corpo.className = 'corpo'
  recolher.addEventListener('click', () => {
    corpo.hidden = !corpo.hidden
    const texto = corpo.hidden ? 'Abrir' : 'Recolher'
    recolher.setAttribute('aria-label', texto)
    recolher.title = texto
    recolher.replaceChildren(icone(corpo.hidden ? 'mais' : 'menos'))
  })

  const resumo = document.createElement('div')
  resumo.className = 'resumo'
  const rotuloResumo = document.createElement('span')
  rotuloResumo.className = 'rotulo'
  rotuloResumo.textContent = 'Vendas 30D'
  const grande = document.createElement('span')
  grande.className = 'grande num'
  grande.textContent = d.leitura ? inteiro(d.leitura.vendas30d) : SEM_DADO
  const linhaLeitura = document.createElement('small')
  linhaLeitura.textContent = textoLeitura(d.leitura)
  resumo.append(rotuloResumo, grande, linhaLeitura)
  corpo.append(resumo)

  const campos = document.createElement('div')
  campos.className = 'campos'
  corpo.append(campos)

  const opcoes = d.variacoes?.opcoes ?? []
  let select: HTMLSelectElement | null = null
  if (opcoes.length) {
    const label = document.createElement('label')
    label.className = 'campo cheio'
    const titulo = document.createElement('span')
    titulo.className = 'rotulo'
    titulo.textContent = 'Variação'
    const entrada = document.createElement('div')
    entrada.className = 'entrada'
    select = document.createElement('select')
    opcoes.forEach((o, i) => select!.append(new Option(`${o.nome} ${reais(o.preco)}`, String(i))))
    entrada.append(select, icone('seta'))
    label.append(titulo, entrada)
    campos.append(label)
  }

  const precoInicial = d.preco ?? (opcoes.length ? opcoes[0].preco : null)
  const preco = campo(campos, 'Preço de venda', 'preco', precoInicial === null ? '' : String(precoInicial), { prefixo: 'R$', cheio: true })
  preco.placeholder = 'sem dado, digite o preço'
  const gramas = campo(campos, 'Filamento', 'gramas', '0', { sufixo: 'g' })
  const horas = campo(campos, 'Impressão', 'horas', '0', { sufixo: 'h' })
  const minutos = campo(campos, 'Acabamento', 'minutos', '0', { sufixo: 'min' })
  const roas = campo(campos, 'ROAS', 'roas', '10', { sufixo: 'x' })

  const linhaAds = document.createElement('label')
  linhaAds.className = 'ads'
  const textoAds = document.createElement('span')
  textoAds.textContent = 'Shopee Ads'
  const ads = document.createElement('input')
  ads.type = 'checkbox'
  ads.name = 'ads'
  ads.className = 'interruptor'
  ads.setAttribute('role', 'switch')
  linhaAds.append(textoAds, ads)
  corpo.append(linhaAds)

  select?.addEventListener('change', () => {
    preco.value = String(opcoes[Number(select!.value)].preco)
  })

  const resultado = document.createElement('div')
  resultado.className = 'corpo'
  corpo.append(resultado)

  function desenharResultado(v: { lucro: string; margem: string; roas: string; custo: string; taxa: string; imposto: string; ads: string }) {
    const lucro = document.createElement('div')
    lucro.className = 'lucro'
    const rotuloLucro = document.createElement('span')
    rotuloLucro.className = 'rotulo'
    rotuloLucro.textContent = 'Lucro por unidade'
    const heroi = document.createElement('div')
    heroi.className = 'heroi'
    const valorLucro = document.createElement('div')
    valorLucro.dataset.campo = 'lucro'
    const numeroLucro = document.createElement('span')
    numeroLucro.className = 'grande num valor'
    numeroLucro.textContent = v.lucro
    valorLucro.append(numeroLucro)
    const margem = document.createElement('span')
    margem.className = 'chip'
    margem.dataset.campo = 'margem'
    const valorMargem = document.createElement('span')
    valorMargem.className = 'valor num'
    valorMargem.textContent = v.margem
    margem.append(valorMargem)
    heroi.append(valorLucro, margem)
    const roasMin = document.createElement('small')
    roasMin.dataset.campo = 'roasMinimo'
    const valorRoas = document.createElement('span')
    valorRoas.className = 'valor num'
    valorRoas.textContent = v.roas
    roasMin.append('ROAS mínimo ', valorRoas)
    lucro.append(rotuloLucro, heroi, roasMin)

    const contas = document.createElement('div')
    contas.className = 'contas'
    contas.append(
      conta('custoProducao', 'cubo', 'Custo de produção', v.custo),
      conta('taxa', 'loja', 'Taxa Shopee', v.taxa),
      conta('imposto', 'carteira', 'Imposto', v.imposto),
      conta('ads', 'alvo', 'Ads', v.ads),
    )
    resultado.replaceChildren(lucro, contas)
  }

  function recalcular() {
    const precoNum = lerNumero(preco.value)
    if (precoNum === null) {
      desenharResultado({ lucro: SEM_DADO, margem: SEM_DADO, roas: SEM_DADO, custo: SEM_DADO, taxa: SEM_DADO, imposto: SEM_DADO, ads: SEM_DADO })
      return
    }
    const roasNum = lerNumero(roas.value)
    // Ads ligado sem ROAS utilizável: não dá para inventar o custo de ads, então essas três ficam sem dado.
    const roasSemDado = ads.checked && (roasNum === null || roasNum <= 0)
    const r = calcular({
      preco: precoNum,
      gramas: lerNumero(gramas.value) ?? 0,
      horas: lerNumero(horas.value) ?? 0,
      minutosAcabamento: lerNumero(minutos.value) ?? 0,
      ads: ads.checked,
      roas: roasNum ?? 0,
    }, d.config)
    desenharResultado({
      lucro: roasSemDado ? SEM_DADO : reais(r.lucro),
      margem: roasSemDado ? SEM_DADO : pct(r.margem),
      roas: r.roasMinimo === null ? 'prejuízo mesmo sem ads' : `${r.roasMinimo.toFixed(2).replace('.', ',')}x`,
      custo: reais(r.custoProducao),
      taxa: reais(r.taxa),
      imposto: reais(r.imposto),
      ads: roasSemDado ? SEM_DADO : reais(r.ads),
    })
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
Importante: o elemento `resultado` usa a classe `corpo` só para herdar o `gap`; o teste de recolher procura o primeiro `.corpo` do shadow root, que é o corpo principal (vem antes no DOM). Se o implementador preferir, pode trocar a classe do `resultado` para `resultado` com `display: grid; gap: 12px;` no CSS; nesse caso ajuste o CSS, não os testes.

- [ ] **Step 4: Rodar testes e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS, `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add src/ui/painel.ts testes/painel.test.ts
git commit -m "fcs-spy v2: calculadora com resumo, campos com unidade e lucro em destaque"
```

---

### Task 5: Tela de configurações "Seus custos"

**Files:**
- Modify: `src/opcoes/opcoes.ts`, `src/opcoes/opcoes.html`
- Test: `testes/opcoes.test.ts`

**Interfaces:**
- Consumes: `icone`, `marcaFcs`.
- Produces: `CAMPOS` com `grupo`, `prefixo?`, `sufixo?`; `GRUPOS`; `paraTela`, `daTela`, `iniciarTela` com as mesmas assinaturas.

- [ ] **Step 1: Ajustar testes em `testes/opcoes.test.ts`**

- No teste `'carrega, edita e salva'`, trocar a espera de `'Salvo.'` por `expect(document.getElementById('status')!.textContent).toContain('Salvo')`.
- Acrescentar:
```ts
describe('tela v2', () => {
  it('quatro grupos na ordem e unidades nos campos', async () => {
    document.body.innerHTML = '<form id="form"><div id="campos"></div><span id="status"></span><button type="submit">Salvar custos</button></form>'
    await iniciarTela(document, areaEmMemoria())
    const titulos = [...document.querySelectorAll('.grupo h3')].map(h => h.textContent)
    expect(titulos).toEqual(['Shopee e imposto', 'Impressão 3D', 'Acabamento e envio', 'Custo alvo'])
    const unidades = (nome: string) =>
      [...document.querySelector(`input[name="${nome}"]`)!.parentElement!.querySelectorAll('.unidade')].map(u => u.textContent)
    expect(unidades('comissaoPct')).toEqual(['%'])
    expect(unidades('filamentoKg')).toEqual(['R$', '/kg'])
    expect(unidades('potenciaW')).toEqual(['W'])
    expect(unidades('kwh')).toEqual(['R$', '/kWh'])
    expect(unidades('margens')).toEqual(['%'])
  })
})
```
Os testes de `paraTela`/`daTela` e `'todo campo numérico da config está na tela'` continuam iguais.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run testes/opcoes.test.ts`
Expected: FAIL (sem `.grupo`, sem `.unidade`).

- [ ] **Step 3: Reescrever `src/opcoes/opcoes.ts`**

```ts
import type { Config } from '../nucleo/tipos'
import { lerConfig, salvarConfig, mesclar } from '../dados/config'
import { areaLocal, type Area } from '../dados/area'
import { icone, type NomeIcone } from '../ui/icones'

type ChaveNumerica = Exclude<keyof Config, 'margens'>
type IdGrupo = 'shopee' | 'impressao' | 'acabamento'
export type Campo = { chave: ChaveNumerica; rotulo: string; pct: boolean; grupo: IdGrupo; prefixo?: string; sufixo?: string }

export const GRUPOS: { id: IdGrupo | 'alvo'; titulo: string; icone: NomeIcone }[] = [
  { id: 'shopee', titulo: 'Shopee e imposto', icone: 'loja' },
  { id: 'impressao', titulo: 'Impressão 3D', icone: 'cubo' },
  { id: 'acabamento', titulo: 'Acabamento e envio', icone: 'carteira' },
  { id: 'alvo', titulo: 'Custo alvo', icone: 'alvo' },
]

export const CAMPOS: Campo[] = [
  { chave: 'comissaoPct', rotulo: 'Comissão', pct: true, grupo: 'shopee', sufixo: '%' },
  { chave: 'taxaFixa', rotulo: 'Taxa fixa por venda', pct: false, grupo: 'shopee', prefixo: 'R$' },
  { chave: 'impostoPct', rotulo: 'Imposto', pct: true, grupo: 'shopee', sufixo: '%' },
  { chave: 'filamentoKg', rotulo: 'Filamento', pct: false, grupo: 'impressao', prefixo: 'R$', sufixo: '/kg' },
  { chave: 'perdaPct', rotulo: 'Perda', pct: true, grupo: 'impressao', sufixo: '%' },
  { chave: 'potenciaW', rotulo: 'Potência', pct: false, grupo: 'impressao', sufixo: 'W' },
  { chave: 'kwh', rotulo: 'Energia', pct: false, grupo: 'impressao', prefixo: 'R$', sufixo: '/kWh' },
  { chave: 'desgasteHora', rotulo: 'Desgaste', pct: false, grupo: 'impressao', prefixo: 'R$', sufixo: '/h' },
  { chave: 'maoDeObraHora', rotulo: 'Mão de obra', pct: false, grupo: 'acabamento', prefixo: 'R$', sufixo: '/h' },
  { chave: 'embalagem', rotulo: 'Embalagem', pct: false, grupo: 'acabamento', prefixo: 'R$' },
]
const MARGENS = { chave: 'margens', rotulo: 'Margens, separadas por ;', sufixo: '%' }
```
Manter `arredonda`, `numero`, `paraTela`, `daTela` exatamente como estão. Substituir `iniciarTela` por:
```ts
function campoTela(doc: Document, chave: string, rotulo: string, prefixo?: string, sufixo?: string): HTMLLabelElement {
  const label = doc.createElement('label')
  label.className = 'campo'
  const titulo = doc.createElement('span')
  titulo.className = 'rotulo'
  titulo.textContent = rotulo
  const entrada = doc.createElement('div')
  entrada.className = 'entrada'
  const unidade = (texto: string) => {
    const s = doc.createElement('span')
    s.className = 'unidade'
    s.textContent = texto
    return s
  }
  const input = doc.createElement('input')
  input.name = chave
  input.inputMode = 'decimal'
  if (prefixo) entrada.append(unidade(prefixo))
  entrada.append(input)
  if (sufixo) entrada.append(unidade(sufixo))
  label.append(titulo, entrada)
  return label
}

export async function iniciarTela(doc: Document, area: Area = areaLocal()): Promise<void> {
  const form = doc.getElementById('form') as HTMLFormElement
  const campos = doc.getElementById('campos')!
  const status = doc.getElementById('status')!
  const chaves = [...CAMPOS.map(f => f.chave as string), MARGENS.chave]

  for (const g of GRUPOS) {
    const secao = doc.createElement('section')
    secao.className = 'grupo'
    const h3 = doc.createElement('h3')
    const marcador = doc.createElement('span')
    marcador.className = 'icone-grupo'
    marcador.append(icone(g.icone, doc))
    h3.append(marcador, g.titulo)
    const grade = doc.createElement('div')
    grade.className = g.id === 'alvo' ? 'campos um' : 'campos'
    if (g.id === 'alvo') {
      grade.append(campoTela(doc, MARGENS.chave, MARGENS.rotulo, undefined, MARGENS.sufixo))
    } else {
      for (const f of CAMPOS.filter(c => c.grupo === g.id)) grade.append(campoTela(doc, f.chave, f.rotulo, f.prefixo, f.sufixo))
    }
    secao.append(h3, grade)
    campos.append(secao)
  }

  const input = (chave: string) => form.querySelector<HTMLInputElement>(`input[name="${chave}"]`)!
  const preencher = (c: Config) => {
    for (const [k, v] of Object.entries(paraTela(c))) input(k).value = v
  }

  preencher(await lerConfig(area))

  form.addEventListener('submit', async ev => {
    ev.preventDefault()
    const c = daTela(Object.fromEntries(chaves.map(k => [k, input(k).value])))
    await salvarConfig(c, area)
    preencher(c)
    status.replaceChildren(icone('check', doc), ' Salvo')
  })
}
```
Observação: o `h3` recebe o texto do título depois do marcador; `h3.textContent` é exatamente o título porque o SVG não tem texto.

- [ ] **Step 4: Reescrever `src/opcoes/opcoes.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>FCS SPY, seus custos</title>
  <style>
    :root { --fundo: #FFFFFF; --superficie: #F3F5F6; --linha: #E6E9EB; --texto: #0A0A0A; --suave: #6B7177; --ciano: #00D8FF; --ciano-claro: #E0F9FF; --ciano-escuro: #006B80; --preto: #0A0A0A; --raio-sm: 10px; --sombra: 0 1px 2px rgba(10,10,10,.04), 0 8px 24px rgba(10,10,10,.06); }
    * { box-sizing: border-box; margin: 0; }
    body { background: #F5F6F7; color: var(--texto); font: 13px/1.4 Inter, "Segoe UI", system-ui, sans-serif; padding: 40px 16px; }
    main { max-width: 560px; margin: 0 auto; background: var(--fundo); border: 1px solid var(--linha); border-radius: 20px; box-shadow: var(--sombra); padding: 28px; display: grid; gap: 22px; }
    .marca { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: .02em; }
    .logo { width: 24px; height: 24px; border-radius: 7px; background: var(--preto); display: grid; place-items: center; }
    .logo i { width: 9px; height: 9px; border-radius: 2px; background: var(--ciano); }
    h1 { font-size: 24px; letter-spacing: -.02em; margin-top: 14px; }
    header p { color: var(--suave); margin-top: 4px; }
    form { display: grid; gap: 22px; }
    #campos { display: grid; gap: 22px; }
    .grupo { display: grid; gap: 10px; }
    .grupo h3 { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .icone-grupo { width: 26px; height: 26px; border-radius: 999px; background: var(--ciano-claro); color: var(--ciano-escuro); display: grid; place-items: center; }
    .campos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .campos.um { grid-template-columns: 1fr; }
    .campo { display: grid; gap: 4px; min-width: 0; }
    .rotulo { color: var(--suave); font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
    .entrada { display: flex; align-items: center; gap: 6px; background: var(--superficie); border: 1px solid transparent; border-radius: var(--raio-sm); padding: 9px 12px; }
    .entrada:focus-within { border-color: var(--ciano); background: var(--fundo); }
    .entrada input { border: 0; background: transparent; font: inherit; width: 100%; min-width: 0; outline: none; color: var(--texto); font-variant-numeric: tabular-nums; }
    .unidade { color: var(--suave); font-size: 12px; }
    svg.ic { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .salvar { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
    #status { color: var(--suave); display: inline-flex; align-items: center; gap: 4px; }
    button { background: var(--preto); color: #FFFFFF; border: 0; border-radius: 999px; padding: 11px 20px; font: inherit; font-weight: 700; cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--ciano); outline-offset: 2px; }
    @media (max-width: 520px) { .campos { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="marca"><span class="logo"><i></i></span>FCS SPY</span>
      <h1>Seus custos</h1>
      <p>A calculadora e o custo alvo usam estes valores. Ficam salvos só no seu navegador.</p>
    </header>
    <form id="form">
      <div id="campos"></div>
      <div class="salvar"><span id="status"></span><button type="submit">Salvar custos</button></div>
    </form>
  </main>
  <script src="opcoes.js"></script>
</body>
</html>
```

- [ ] **Step 5: Rodar testes e typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS, `tsc` limpo.

- [ ] **Step 6: Commit**

```bash
git add src/opcoes/opcoes.ts src/opcoes/opcoes.html testes/opcoes.test.ts
git commit -m "fcs-spy v2: tela Seus custos com grupos e unidades"
```

---

### Task 6: Prévia visual e build

**Files:**
- Create: `src/previa/previa.ts`, `src/previa/index.html`, `src/previa/opcoes-previa.ts`
- Modify: `build.mjs`, `.gitignore` (da extensão)

**Interfaces:**
- Consumes: `montarCard`, `montarBarra`, `montarPainel`, `iniciarTela`, `calcularMetricas`, `CONFIG_PADRAO`, tipos.
- Produces: pasta `previa/` (gerada, fora do git) com `index.html`, `previa.js`, `opcoes.html`, `opcoes.js`.

- [ ] **Step 1: Criar `src/previa/previa.ts`**

```ts
// Monta os componentes reais com dados de exemplo para conferir o visual fora da Shopee.
import { montarCard, type EstadoHistorico } from '../ui/card'
import { montarBarra } from '../ui/barra'
import { montarPainel } from '../ui/painel'
import { calcularMetricas } from '../nucleo/metricas'
import { CONFIG_PADRAO } from '../dados/config'
import type { Anuncio } from '../nucleo/tipos'

const hoje = new Date('2026-09-27T12:00:00Z')
const base: Anuncio = {
  itemId: '1', shopId: '2', titulo: 'Miniatura F1 12cm 4 Equipes', loja: 'Importadora Zenit', preco: 9.9,
  vendas30d: 1151, vendasTotal: 4595, criadoEm: new Date('2025-09-02T12:00:00Z'),
  likes: 1031, reviews: 2354, nota: 4.9, selos: { ads: null, indicado: true, lojaOficial: false },
}
const exemplos: [Anuncio, EstadoHistorico][] = [
  [base, { dias: 7, difVendas30d: 120, difPreco: 0, seta: 'sobe' }],
  [{ ...base, itemId: '3', titulo: 'Carrinho F1 Metal Fricção', preco: 19.7, vendas30d: 1345, vendasTotal: 2572, criadoEm: new Date('2026-04-28T12:00:00Z'), likes: 2901, reviews: 1459 },
    { dias: 1, difVendas30d: -40, difPreco: -1, seta: 'cai' }],
  [{ ...base, itemId: '4', titulo: 'Bburago 1:43 2025 F1', preco: 60, vendas30d: 188, vendasTotal: 1020, criadoEm: new Date('2026-08-28T12:00:00Z'), selos: { ads: null, indicado: false, lojaOficial: true } }, null],
]

const grade = document.getElementById('grade')!
for (const [a, h] of exemplos) {
  const li = document.createElement('li')
  li.className = 'shopee'
  const foto = document.createElement('div')
  foto.className = 'foto'
  const info = document.createElement('div')
  info.className = 'info'
  info.textContent = a.titulo
  li.append(foto, info, montarCard({ anuncio: a, metricas: calcularMetricas(a, CONFIG_PADRAO, hoje), historico: h }))
  grade.append(li)
}
// Segundo card aberto, para conferir o "ver mais".
grade.children[1].querySelector('[data-fcs-spy-card]')!.shadowRoot!.querySelector<HTMLButtonElement>('.mais')!.click()

const barra = montarBarra(() => {}, () => {}, () => {})
barra.style.position = 'static'
document.getElementById('barra')!.append(barra)

const painel = montarPainel({
  config: CONFIG_PADRAO, preco: null, leitura: { itemId: '1', data: '2026-09-27', preco: 17.9, vendas30d: 196, vendasTotal: 1596 },
  variacoes: { itemId: '1', opcoes: [{ nome: 'Kit com 4', preco: 54.9 }, { nome: 'Preto', preco: 24.9 }] },
  aoAbrirCustos: () => {},
})
painel.style.position = 'static'
document.getElementById('painel')!.append(painel)
```

- [ ] **Step 2: Criar `src/previa/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>FCS SPY, prévia</title>
  <style>
    body { background: #F5F5F5; font-family: Inter, "Segoe UI", system-ui, sans-serif; padding: 32px; margin: 0; }
    .palco { display: flex; gap: 40px; align-items: flex-start; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 190px); gap: 10px; align-items: start; }
    .shopee { background: #fff; border: 1px solid #eee; border-radius: 6px; }
    .foto { aspect-ratio: 1; background: linear-gradient(135deg, #ececec, #d9d9d9); }
    .info { padding: 8px; font-size: 12px; color: #222; }
    .coluna { display: grid; gap: 32px; }
  </style>
</head>
<body>
  <div class="palco">
    <ul id="grade"></ul>
    <div class="coluna"><div id="barra"></div><div id="painel"></div></div>
  </div>
  <script src="previa.js"></script>
</body>
</html>
```

- [ ] **Step 3: Criar `src/previa/opcoes-previa.ts`**

```ts
// Tela de opções fora da extensão, com armazenamento em memória.
import { iniciarTela } from '../opcoes/opcoes'
import type { Area } from '../dados/area'

const dados: Record<string, unknown> = {}
const memoria: Area = {
  async get(chaves) {
    const lista = Array.isArray(chaves) ? chaves : [chaves]
    return Object.fromEntries(lista.filter(c => c in dados).map(c => [c, dados[c]]))
  },
  async set(itens) {
    Object.assign(dados, itens)
  },
}
void iniciarTela(document, memoria)
```

- [ ] **Step 4: Gerar a prévia no `build.mjs` e ignorar a pasta**

Acrescentar ao fim de `build.mjs`:
```js
// Prévia visual fora da extensão (não vai para dist/).
await rm('previa', { recursive: true, force: true })
await mkdir('previa', { recursive: true })
await build({
  entryPoints: { previa: 'src/previa/previa.ts', opcoes: 'src/previa/opcoes-previa.ts' },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'previa',
  logLevel: 'info',
})
await cp('src/previa/index.html', 'previa/index.html')
await cp('src/opcoes/opcoes.html', 'previa/opcoes.html')
```
Acrescentar a linha `previa/` ao `.gitignore` de `extensao/`.

- [ ] **Step 5: Rodar suíte, typecheck, build e conferir saídas**

Run: `npx vitest run && npm run typecheck && npm run build && ls dist previa`
Expected: PASS, `tsc` limpo; `dist` com `content.js`, `escuta.js`, `fundo.js`, `manifest.json`, `opcoes.html`, `opcoes.js`; `previa` com `index.html`, `opcoes.html`, `opcoes.js`, `previa.js`.

- [ ] **Step 6: Commit**

```bash
git add src/previa build.mjs .gitignore
git commit -m "fcs-spy v2: prévia visual dos componentes reais"
```

- [ ] **Step 7 (controlador): conferência visual**

O controlador gera prints de `previa/index.html` e `previa/opcoes.html` em Chromium headless e compara com `docs/mockup-v2.png`. Diferença visual relevante vira correção antes de encerrar.
