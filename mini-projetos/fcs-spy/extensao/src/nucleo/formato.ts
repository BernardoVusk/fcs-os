const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const INTEIRO = new Intl.NumberFormat('pt-BR')

export const SEM_DADO = 'sem dado'

export function reais(v: number | null): string {
  return v === null ? SEM_DADO : BRL.format(v)
}

export function inteiro(v: number | null): string {
  return v === null ? SEM_DADO : INTEIRO.format(v)
}

export function pct(v: number | null): string {
  if (v === null) return SEM_DADO
  return `${(v * 100).toFixed(1).replace('.', ',').replace(/,0$/, '')}%`
}

const CURTO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

// Formato para blocos estreitos do card: R$ 3,92, R$ 380, R$ 11,4 mil, R$ 1,3 mi.
export function reaisCurto(v: number | null): string {
  if (v === null) return SEM_DADO
  if (v < 0) return `-${reaisCurto(-v)}`
  if (v < 100) return reais(v)
  if (v < 1_000) return `R$ ${INTEIRO.format(Math.round(v))}`
  if (v < 1_000_000) return `R$ ${CURTO.format(v / 1_000)} mil`
  return `R$ ${CURTO.format(v / 1_000_000)} mi`
}
