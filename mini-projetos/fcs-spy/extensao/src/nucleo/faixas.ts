import type { Config } from './tipos'
import { inteiro } from './formato'

export type NivelFaixa = 'alta' | 'media' | 'baixa'
export type FaixaVendas = { nivel: NivelFaixa; titulo: string }

export function faixaVendas(
  vendas30d: number | null,
  c: Pick<Config, 'corteVerde' | 'corteAmarelo'>,
): FaixaVendas | null {
  if (vendas30d === null) return null
  if (vendas30d >= c.corteVerde) {
    return { nivel: 'alta', titulo: `Vendas altas: ${inteiro(c.corteVerde)} ou mais no mês` }
  }
  if (vendas30d >= c.corteAmarelo) {
    return { nivel: 'media', titulo: `Vendas médias: de ${inteiro(c.corteAmarelo)} a ${inteiro(c.corteVerde - 1)} no mês` }
  }
  return { nivel: 'baixa', titulo: `Vendas baixas: menos de ${inteiro(c.corteAmarelo)} no mês` }
}
