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
.bloco .rotulo { white-space: nowrap; }
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

function marcaEstimativa(): HTMLElement[] {
  return [el('i', 'est'), el('span', 'so-leitor', ' (estimativa)')]
}

function linha(rotulo: string, valor: string, estimativa = false): HTMLElement {
  const l = el('div', 'linha')
  const r = el('span', '', rotulo)
  if (estimativa) r.append(...marcaEstimativa())
  l.append(r, el('b', 'num', valor))
  return l
}

function bloco(rotulo: string, valor: string): HTMLElement {
  const b = el('div', 'bloco')
  const r = el('span', 'rotulo', rotulo)
  r.append(...marcaEstimativa())
  b.append(r, el('b', 'num', valor))
  return b
}

export function textoHistorico(h: EstadoHistorico): string {
  if (h === 'indisponivel') return 'histórico indisponível'
  if (h === null) return 'primeira leitura'
  const dias = `${h.dias} ${h.dias === 1 ? 'dia' : 'dias'}`
  const precoTexto = Math.abs(h.difPreco) >= 0.005
    ? `, preço ${h.difPreco > 0 ? '+' : ''}${reais(h.difPreco)}`
    : ''
  if (h.difVendas30d === null || h.seta === null) return `sem dado de vendas, última leitura há ${dias}${precoTexto}`
  const palavra = { sobe: 'subindo', cai: 'caindo', estavel: 'estável' }[h.seta]
  const sinal = h.difVendas30d > 0 ? '+' : ''
  return `${palavra}: ${sinal}${inteiro(h.difVendas30d)} vendas 30D em ${dias}${precoTexto}`
}

export function chipHistorico(h: EstadoHistorico): { classe: 'sobe' | 'cai' | 'estavel' | 'novo'; texto: string; icone: NomeIcone | null } {
  if (h === 'indisponivel') return { classe: 'novo', texto: 'sem histórico', icone: null }
  if (h === null) return { classe: 'novo', texto: '1ª leitura', icone: null }
  if (h.difVendas30d === null || h.seta === null) return { classe: 'novo', texto: SEM_DADO, icone: null }
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
  if (m.faixa) card.classList.add(`faixa-${m.faixa.nivel}`)

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
  const numeroVendas = el('span', 'grande num', inteiro(a.vendas30d))
  if (m.faixa) {
    numeroVendas.classList.add(`cor-${m.faixa.nivel}`)
    numeroVendas.title = m.faixa.titulo
  }
  heroi.append(numeroVendas)
  if (m.faixa) heroi.append(el('span', 'so-leitor', ` (vendas ${{ alta: 'altas', media: 'médias', baixa: 'baixas' }[m.faixa.nivel]})`))
  heroi.append(chip)
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

export function linkDoProduto(raiz: ParentNode, a: Pick<Anuncio, 'shopId' | 'itemId'>): HTMLAnchorElement | null {
  for (const link of raiz.querySelectorAll<HTMLAnchorElement>(seletorDoLink(a))) {
    const id = idDaUrl(link.getAttribute('href') ?? '')
    if (id && id.itemId === a.itemId && id.shopId === a.shopId) return link
  }
  return null
}

const SELETOR_LINK_PRODUTO = 'a[href*="-i."], a[href*="/product/"]'

export function chaveDoProduto(a: Pick<Anuncio, 'shopId' | 'itemId'>): string {
  return `${a.shopId}.${a.itemId}`
}

// Um querySelectorAll só por ciclo de desenho, em vez de um por item visto.
export function mapaDeLinks(raiz: ParentNode): Map<string, HTMLAnchorElement> {
  const mapa = new Map<string, HTMLAnchorElement>()
  for (const link of raiz.querySelectorAll<HTMLAnchorElement>(SELETOR_LINK_PRODUTO)) {
    const id = idDaUrl(link.getAttribute('href') ?? '')
    if (!id) continue
    const chave = chaveDoProduto(id)
    if (!mapa.has(chave)) mapa.set(chave, link)
  }
  return mapa
}

// Hipótese a validar na checagem manual: o card da busca é o <li> que contém o link.
// Só usa o <li> quando ele tem um produto só: se tiver outro produto dentro,
// duas grades diferentes disputariam o mesmo container e o card ficaria trocando para sempre.
export function containerDoCard(link: HTMLElement): HTMLElement | null {
  const li = link.closest('li')
  if (!li) return link.parentElement
  const id = idDaUrl(link.getAttribute('href') ?? '')
  if (!id) return link.parentElement
  const outroProduto = [...li.querySelectorAll<HTMLAnchorElement>(SELETOR_LINK_PRODUTO)]
    .map(l => idDaUrl(l.getAttribute('href') ?? ''))
    .filter((outro): outro is IdProduto => outro !== null)
    .some(outro => outro.shopId !== id.shopId || outro.itemId !== id.itemId)
  return outroProduto ? link.parentElement : li
}

export function anexarCard(container: HTMLElement, card: HTMLElement): void {
  container.querySelector(`[${ATRIBUTO_CARD}]`)?.remove()
  container.append(card)
}
