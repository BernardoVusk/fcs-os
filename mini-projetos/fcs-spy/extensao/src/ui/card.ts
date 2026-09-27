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
  const precoTexto = Math.abs(h.difPreco) >= 0.005
    ? `, preço ${h.difPreco > 0 ? '+' : ''}${reais(h.difPreco)}`
    : ''
  if (h.difVendas30d === null || h.seta === null) return `sem dado de vendas, última leitura há ${dias}${precoTexto}`
  const palavra = { sobe: 'subindo', cai: 'caindo', estavel: 'estável' }[h.seta]
  const sinal = h.difVendas30d > 0 ? '+' : ''
  return `${palavra}: ${sinal}${inteiro(h.difVendas30d)} vendas 30D em ${dias}${precoTexto}`
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
export function containerDoCard(link: HTMLElement): HTMLElement | null {
  return link.closest('li') ?? link.parentElement
}

export function anexarCard(container: HTMLElement, card: HTMLElement): void {
  container.querySelector(`[${ATRIBUTO_CARD}]`)?.remove()
  container.append(card)
}
