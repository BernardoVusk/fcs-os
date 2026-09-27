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
