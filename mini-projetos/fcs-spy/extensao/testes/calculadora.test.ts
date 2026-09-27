import { describe, it, expect } from 'vitest'
import { calcular } from '../src/nucleo/calculadora'
import { CONFIG_PADRAO } from '../src/dados/config'
import type { Config } from '../src/nucleo/tipos'

describe('conferência com a calculadora do Ziem Spy', () => {
  // 48 g a R$ 100/kg = 4,80 de produção, + 0,20 de embalagem = 5,00
  const cfg: Config = {
    ...CONFIG_PADRAO,
    filamentoKg: 100, perdaPct: 0, potenciaW: 0, kwh: 0,
    desgasteHora: 0, maoDeObraHora: 0, embalagem: 0.2, impostoPct: 0.04,
  }
  const r = calcular({ preco: 15.9, gramas: 48, horas: 0, minutosAcabamento: 0, ads: true, roas: 30 }, cfg)

  it('custo de produção', () => expect(r.custoProducao).toBeCloseTo(5.0, 2))
  it('taxa Shopee', () => expect(r.taxa).toBeCloseTo(7.18, 2))
  it('imposto', () => expect(r.imposto).toBeCloseTo(0.64, 2))
  it('ads', () => expect(r.ads).toBeCloseTo(0.53, 2))
  it('lucro', () => expect(r.lucro).toBeCloseTo(2.55, 2))
  it('margem', () => expect(r.margem).toBeCloseTo(0.161, 3))
  it('ROAS mínimo', () => expect(r.roasMinimo).toBeCloseTo(5.16, 2))
})

describe('componentes do custo de impressão', () => {
  const cfg: Config = {
    ...CONFIG_PADRAO,
    filamentoKg: 120, perdaPct: 0.1, potenciaW: 200, kwh: 1,
    desgasteHora: 0.5, maoDeObraHora: 20, embalagem: 1,
  }
  const r = calcular({ preco: 100, gramas: 100, horas: 5, minutosAcabamento: 30, ads: false, roas: 0 }, cfg)

  it('filamento com perda', () => expect(r.filamento).toBeCloseTo(13.2, 4))
  it('energia', () => expect(r.energia).toBeCloseTo(1.0, 4))
  it('desgaste', () => expect(r.desgaste).toBeCloseTo(2.5, 4))
  it('acabamento', () => expect(r.acabamento).toBeCloseTo(10, 4))
  it('soma com embalagem', () => expect(r.custoProducao).toBeCloseTo(27.7, 4))
  it('ads desligado custa zero', () => expect(r.ads).toBe(0))
})

describe('conta que não fecha', () => {
  it('ROAS mínimo null quando dá prejuízo mesmo sem ads', () => {
    const r = calcular({ preco: 5, gramas: 10, horas: 1, minutosAcabamento: 0, ads: false, roas: 0 }, CONFIG_PADRAO)
    expect(r.roasMinimo).toBeNull()
    expect(r.lucro).toBeLessThan(0)
  })
  it('preço zero não divide por zero', () => {
    const r = calcular({ preco: 0, gramas: 0, horas: 0, minutosAcabamento: 0, ads: true, roas: 10 }, CONFIG_PADRAO)
    expect(r.margem).toBe(0)
    expect(r.roasMinimo).toBeNull()
  })
})
