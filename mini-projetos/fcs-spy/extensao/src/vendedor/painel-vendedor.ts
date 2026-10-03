import type { Coletas } from './coleta'
import { ESTILO_BASE } from '../ui/estilo'
import { marcaFcs } from '../ui/icones'

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
.estado.lido { color: #15803D; }
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
