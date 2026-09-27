import type { Config } from '../nucleo/tipos'
import { lerConfig, salvarConfig, mesclar } from '../dados/config'
import { areaLocal, type Area } from '../dados/area'

type ChaveNumerica = Exclude<keyof Config, 'margens'>
export type Campo = { chave: ChaveNumerica; rotulo: string; pct: boolean }

export const CAMPOS: Campo[] = [
  { chave: 'comissaoPct', rotulo: 'Comissão Shopee (%)', pct: true },
  { chave: 'taxaFixa', rotulo: 'Taxa fixa Shopee por venda (R$)', pct: false },
  { chave: 'impostoPct', rotulo: 'Imposto (%)', pct: true },
  { chave: 'filamentoKg', rotulo: 'Filamento, preço do kg (R$)', pct: false },
  { chave: 'perdaPct', rotulo: 'Perda de filamento (%)', pct: true },
  { chave: 'potenciaW', rotulo: 'Potência média da impressora (W)', pct: false },
  { chave: 'kwh', rotulo: 'Preço do kWh (R$)', pct: false },
  { chave: 'desgasteHora', rotulo: 'Desgaste da máquina por hora (R$)', pct: false },
  { chave: 'maoDeObraHora', rotulo: 'Mão de obra de acabamento por hora (R$)', pct: false },
  { chave: 'embalagem', rotulo: 'Embalagem por pedido (R$)', pct: false },
]
const ROTULO_MARGENS = 'Margens do custo alvo (%, separadas por ;)'

const arredonda = (n: number) => Number(n.toFixed(6))

function numero(v: string | undefined): number | undefined {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function paraTela(c: Config): Record<string, string> {
  const t: Record<string, string> = {}
  for (const f of CAMPOS) t[f.chave] = String(f.pct ? arredonda(c[f.chave] * 100) : c[f.chave])
  t.margens = c.margens.map(m => arredonda(m * 100)).join('; ')
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

export async function iniciarTela(doc: Document, area: Area = areaLocal()): Promise<void> {
  const form = doc.getElementById('form') as HTMLFormElement
  const campos = doc.getElementById('campos')!
  const status = doc.getElementById('status')!
  const todos = [...CAMPOS.map(f => ({ chave: f.chave as string, rotulo: f.rotulo })), { chave: 'margens', rotulo: ROTULO_MARGENS }]

  for (const f of todos) {
    const label = doc.createElement('label')
    const span = doc.createElement('span')
    span.textContent = f.rotulo
    const input = doc.createElement('input')
    input.name = f.chave
    label.append(span, input)
    campos.append(label)
  }
  const input = (chave: string) => form.querySelector<HTMLInputElement>(`input[name="${chave}"]`)!
  const preencher = (c: Config) => {
    for (const [k, v] of Object.entries(paraTela(c))) input(k).value = v
  }

  preencher(await lerConfig(area))

  form.addEventListener('submit', async ev => {
    ev.preventDefault()
    const c = daTela(Object.fromEntries(todos.map(f => [f.chave, input(f.chave).value])))
    await salvarConfig(c, area)
    preencher(c)
    status.textContent = 'Salvo.'
  })
}
