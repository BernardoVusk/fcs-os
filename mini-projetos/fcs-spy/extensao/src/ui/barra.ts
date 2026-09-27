import { CRITERIOS, type Criterio } from './ordenar'
import { ESTILO_BASE } from './estilo'
import { ATRIBUTO_CARD } from './card'
import { ATRIBUTO_PAINEL } from './painel'

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
  // O card da Shopee tem height: 100%. O bloco que recebe nosso painel vira coluna,
  // o card ocupa só o espaço que sobra e o painel fica dentro do bloco.
  s.textContent = [
    `[${ATRIBUTO_DESLIGADO}] [${ATRIBUTO_CARD}], [${ATRIBUTO_DESLIGADO}] [${ATRIBUTO_PAINEL}] { display: none !important; }`,
    `:has(> [${ATRIBUTO_CARD}]) { display: flex !important; flex-direction: column !important; }`,
    `:has(> [${ATRIBUTO_CARD}]) > :not([${ATRIBUTO_CARD}]) { height: auto !important; flex: 1 1 auto !important; }`,
    `[${ATRIBUTO_CARD}] { display: block; }`,
  ].join('\n')
  ;(doc.head ?? doc.documentElement).append(s)
}
