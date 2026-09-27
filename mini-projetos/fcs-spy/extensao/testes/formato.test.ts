import { describe, it, expect } from 'vitest'
import { reais, inteiro, pct, SEM_DADO } from '../src/nucleo/formato'

describe('formato', () => {
  it('reais em pt-BR', () => {
    expect(reais(11394.9)).toBe('R$ 11.394,90')
  })
  it('inteiro com separador de milhar', () => {
    expect(inteiro(1151)).toBe('1.151')
  })
  it('pct com uma casa, sem ,0 no inteiro', () => {
    expect(pct(0.161)).toBe('16,1%')
    expect(pct(0.1)).toBe('10%')
  })
  it('null vira sem dado', () => {
    expect(reais(null)).toBe(SEM_DADO)
    expect(inteiro(null)).toBe(SEM_DADO)
    expect(pct(null)).toBe(SEM_DADO)
    expect(SEM_DADO).toBe('sem dado')
  })
})
