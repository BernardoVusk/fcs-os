import type { Config, Leitura, Variacoes } from '../nucleo/tipos'
import { calcular } from '../nucleo/calculadora'
import { reais, inteiro, pct, SEM_DADO } from '../nucleo/formato'
import { ESTILO_BASE } from './estilo'
import { icone, marcaFcs, type NomeIcone } from './icones'

export const ATRIBUTO_PAINEL = 'data-fcs-spy-painel'

export type DadosPainel = {
  config: Config
  preco: number | null
  variacoes: Variacoes | null
  leitura: Leitura | null
  aoAbrirCustos?: () => void
}

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

// null quando o campo está vazio ou não é número. Quem chama decide o padrão (0 ou sem dado).
function lerNumero(v: string): number | null {
  const t = v.trim()
  if (t === '') return null
  const n = parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function textoLeitura(l: Leitura | null): string {
  if (!l) return 'abra pela busca para ver vendas'
  const [ano, mes, dia] = l.data.split('-')
  return `vendas 30D ${inteiro(l.vendas30d)}, total ${inteiro(l.vendasTotal)} (leitura de ${dia}/${mes}/${ano})`
}

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
