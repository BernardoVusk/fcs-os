import { areaLocal, type Area } from './area'

export type CustoProduto = { gramas: number; horas: number; minutos: number }

const chave = (itemId: string) => `custo:${itemId}`
const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0

function valido(v: unknown): CustoProduto | null {
  const c = v as Partial<CustoProduto> | null
  return c && ok(c.gramas) && ok(c.horas) && ok(c.minutos) ? { gramas: c.gramas!, horas: c.horas!, minutos: c.minutos! } : null
}

export async function lerCusto(itemId: string, area: Area = areaLocal()): Promise<CustoProduto | null> {
  return valido((await area.get(chave(itemId)))[chave(itemId)])
}

export async function salvarCusto(itemId: string, c: CustoProduto, area: Area = areaLocal()): Promise<void> {
  await area.set({ [chave(itemId)]: { gramas: c.gramas, horas: c.horas, minutos: c.minutos } })
}

export async function lerCustos(itemIds: string[], area: Area = areaLocal()): Promise<Map<string, CustoProduto>> {
  const salvo = await area.get(itemIds.map(chave))
  const m = new Map<string, CustoProduto>()
  for (const id of itemIds) { const c = valido(salvo[chave(id)]); if (c) m.set(id, c) }
  return m
}
