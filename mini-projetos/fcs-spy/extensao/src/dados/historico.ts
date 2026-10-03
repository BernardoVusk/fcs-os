import type { Anuncio, Leitura, Tendencia } from '../nucleo/tipos'
import { areaLocal, type Area } from './area'

export const MAX_LEITURAS = 90
const DIA_MS = 86_400_000
const chave = (itemId: string) => `h:${itemId}`

export function dataLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function leituraDe(a: Anuncio, agora: Date): Leitura {
  return { itemId: a.itemId, data: dataLocal(agora), preco: a.preco, vendas30d: a.vendas30d, vendasTotal: a.vendasTotal }
}

export function registrar(lista: Leitura[], nova: Leitura): Leitura[] {
  const existente = lista.find(x => x.data === nova.data)
  const final = existente
    ? { ...nova, vendas30d: nova.vendas30d ?? existente.vendas30d, vendasTotal: nova.vendasTotal ?? existente.vendasTotal }
    : nova
  return [...lista.filter(x => x.data !== nova.data), final]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-MAX_LEITURAS)
}

export function anterior(lista: Leitura[], data: string): Leitura | null {
  let achada: Leitura | null = null
  for (const x of lista) if (x.data < data && (!achada || x.data > achada.data)) achada = x
  return achada
}

export function comparar(atual: Leitura, ant: Leitura | null): Tendencia | null {
  if (!ant) return null
  const dif = atual.vendas30d !== null && ant.vendas30d !== null ? atual.vendas30d - ant.vendas30d : null
  return {
    dias: Math.round((Date.parse(atual.data) - Date.parse(ant.data)) / DIA_MS),
    difVendas30d: dif,
    difPreco: atual.preco - ant.preco,
    seta: dif === null ? null : dif > 0 ? 'sobe' : dif < 0 ? 'cai' : 'estavel',
  }
}

function listaDe(v: unknown): Leitura[] {
  return Array.isArray(v) ? (v as Leitura[]) : []
}

// Uma resposta de busca vira um get e um set para todos os itens.
export async function gravarLeituras(novas: Leitura[], area: Area = areaLocal()): Promise<Map<string, Tendencia | null>> {
  const salvo = await area.get(novas.map(n => chave(n.itemId)))
  const atualizado: Record<string, Leitura[]> = {}
  const tendencias = new Map<string, Tendencia | null>()
  for (const n of novas) {
    const k = chave(n.itemId)
    const lista = atualizado[k] ?? listaDe(salvo[k])
    atualizado[k] = registrar(lista, n)
    const atual = atualizado[k].find(x => x.data === n.data) ?? n
    tendencias.set(n.itemId, comparar(atual, anterior(lista, n.data)))
  }
  await area.set(atualizado)
  return tendencias
}

export async function ultimaLeitura(itemId: string, area: Area = areaLocal()): Promise<Leitura | null> {
  const k = chave(itemId)
  return listaDe((await area.get(k))[k]).at(-1) ?? null
}
