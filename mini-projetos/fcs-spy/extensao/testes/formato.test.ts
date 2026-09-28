import { describe, it, expect } from 'vitest'
import { reais, inteiro, pct, SEM_DADO, reaisCurto } from '../src/nucleo/formato'

describe('formato', () => {
  it('reais em pt-BR', () => {
    expect(reais(11394.9)).toBe('R$\u00a011.394,90')
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

describe('reaisCurto', () => {
  it('abaixo de 100 mostra centavos', () => expect(reaisCurto(3.92)).toBe('R$\u00a03,92'))
  it('de 100 a 999 arredonda para inteiro', () => expect(reaisCurto(379.83)).toBe('R$\u00a0380'))
  it('milhar vira mil com uma casa', () => {
    expect(reaisCurto(11394.9)).toBe('R$\u00a011,4\u00a0mil')
    expect(reaisCurto(1000)).toBe('R$\u00a01\u00a0mil')
  })
  it('milhão vira mi', () => expect(reaisCurto(1250000)).toBe('R$\u00a01,3\u00a0mi'))
  it('negativo leva o sinal na frente', () => expect(reaisCurto(-2500)).toBe('-R$\u00a02,5\u00a0mil'))
  it('null vira sem dado', () => expect(reaisCurto(null)).toBe('sem dado'))
  it('fronteira 100 usa reais curtos, não centavos', () => expect(reaisCurto(100)).toBe('R$\u00a0100'))
  it('fronteira 1 milhão usa mi, não mil', () => expect(reaisCurto(1_000_000)).toBe('R$\u00a01\u00a0mi'))
})
