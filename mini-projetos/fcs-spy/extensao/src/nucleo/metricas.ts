import type { Anuncio, Config } from './tipos'
import { faixaVendas, type FaixaVendas } from './faixas'

const DIA_MS = 86_400_000

export type Metricas = {
  diasNoAr: number | null
  recebe: number
  faturamento30d: number | null
  faturamentoTotal: number | null
  mediaDiaria: number | null
  custoAlvo: { margem: number; valor: number }[]
  faixa: FaixaVendas | null
}

export function taxaShopee(preco: number, c: Pick<Config, 'comissaoPct' | 'taxaFixa'>): number {
  return preco * c.comissaoPct + c.taxaFixa
}

// Faturamento usa o menor preço atual para todo o período: é estimativa.
export function calcularMetricas(a: Anuncio, c: Config, hoje: Date): Metricas {
  const recebe = a.preco - taxaShopee(a.preco, c)
  const faturamento30d = a.vendas30d === null ? null : a.vendas30d * a.preco
  return {
    diasNoAr: a.criadoEm === null ? null : Math.floor((hoje.getTime() - a.criadoEm.getTime()) / DIA_MS),
    recebe,
    faturamento30d,
    faturamentoTotal: a.vendasTotal === null ? null : a.vendasTotal * a.preco,
    mediaDiaria: faturamento30d === null ? null : faturamento30d / 30,
    custoAlvo: c.margens.map(margem => ({ margem, valor: recebe - margem * a.preco })),
    faixa: faixaVendas(a.vendas30d, c),
  }
}
