import type { Anuncio } from '../nucleo/tipos'

export type Criterio = 'vendas30d' | 'vendasTotal' | 'faturamento30d' | 'maisNovos' | 'maisAntigos'

export const CRITERIOS: { valor: Criterio; rotulo: string }[] = [
  { valor: 'vendas30d', rotulo: 'Vendas 30D' },
  { valor: 'vendasTotal', rotulo: 'Vendas total' },
  { valor: 'faturamento30d', rotulo: 'Faturamento 30D' },
  { valor: 'maisNovos', rotulo: 'Mais novos' },
  { valor: 'maisAntigos', rotulo: 'Mais antigos' },
]

// Maior chave primeiro. "Mais antigos" usa data negativa para inverter.
function chave(a: Anuncio, c: Criterio): number | null {
  switch (c) {
    case 'vendas30d': return a.vendas30d
    case 'vendasTotal': return a.vendasTotal
    case 'faturamento30d': return a.vendas30d === null ? null : a.vendas30d * a.preco
    case 'maisNovos': return a.criadoEm ? a.criadoEm.getTime() : null
    case 'maisAntigos': return a.criadoEm ? -a.criadoEm.getTime() : null
  }
}

export function ordenar(lista: Anuncio[], c: Criterio): Anuncio[] {
  return [...lista].sort((x, y) => {
    const a = chave(x, c)
    const b = chave(y, c)
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return b - a
  })
}

export function reordenarNaPagina(containers: HTMLElement[]): void {
  for (const el of containers) el.parentElement?.appendChild(el)
}
