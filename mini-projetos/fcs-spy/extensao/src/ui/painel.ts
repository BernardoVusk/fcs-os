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
