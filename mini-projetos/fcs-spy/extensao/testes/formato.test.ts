import { describe, it, expect } from 'vitest'
import { reais, inteiro, pct, SEM_DADO, reaisCurto } from '../src/nucleo/formato'

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

describe('reaisCurto', () => {
  it('abaixo de 100 mostra centavos', () => expect(reaisCurto(3.92)).toBe('R$ 3,92'))
  it('de 100 a 999 arredonda para inteiro', () => expect(reaisCurto(379.83)).toBe('R$ 380'))
  it('milhar vira mil com uma casa', () => {
    expect(reaisCurto(11394.9)).toBe('R$ 11,4 mil')
    expect(reaisCurto(1000)).toBe('R$ 1 mil')
  })
  it('milhão vira mi', () => expect(reaisCurto(1250000)).toBe('R$ 1,3 mi'))
  it('negativo leva o sinal na frente', () => expect(reaisCurto(-2500)).toBe('-R$ 2,5 mil'))
  it('null vira sem dado', () => expect(reaisCurto(null)).toBe('sem dado'))
})
