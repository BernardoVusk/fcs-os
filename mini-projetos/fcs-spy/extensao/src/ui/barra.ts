import { CRITERIOS, type Criterio } from './ordenar'
import { ESTILO_BASE } from './estilo'
import { icone, marcaFcs } from './icones'
import { ATRIBUTO_CARD } from './card'
import { ATRIBUTO_PAINEL } from './painel'

export const ATRIBUTO_BARRA = 'data-fcs-spy-barra'
export const ATRIBUTO_DESLIGADO = 'data-fcs-spy-desligado'

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

export function aplicarLigado(doc: Document, ligado: boolean): void {
  if (ligado) doc.documentElement.removeAttribute(ATRIBUTO_DESLIGADO)
  else doc.documentElement.setAttribute(ATRIBUTO_DESLIGADO, '')
}

// A barra só existe onde há card do FCS SPY para ordenar (some no carrinho, por exemplo).
// Ao sumir, a camada volta a ficar ligada, porque a barra nova nasce em "Desligar".
export function sincronizarBarra(doc: Document, criar: () => HTMLElement): void {
  const barra = doc.querySelector(`[${ATRIBUTO_BARRA}]`)
  const temCard = doc.querySelector(`[${ATRIBUTO_CARD}]`) !== null
  if (temCard && !barra) {
    doc.body.append(criar())
  } else if (!temCard && barra) {
    barra.remove()
    aplicarLigado(doc, true)
  }
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
