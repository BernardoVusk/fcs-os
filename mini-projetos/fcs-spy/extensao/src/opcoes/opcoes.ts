import type { Config } from '../nucleo/tipos'
import { lerConfig, salvarConfig, mesclar } from '../dados/config'
import { areaLocal, type Area } from '../dados/area'
import { icone, type NomeIcone } from '../ui/icones'
import { paraCampo } from '../nucleo/formato'

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

const arredonda = (n: number) => Number(n.toFixed(6))

function numero(v: string | undefined): number | undefined {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function paraTela(c: Config): Record<string, string> {
  const t: Record<string, string> = {}
  for (const f of CAMPOS) t[f.chave] = paraCampo(f.pct ? arredonda(c[f.chave] * 100) : c[f.chave])
  t.margens = c.margens.map(m => paraCampo(arredonda(m * 100))).join('; ')
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
