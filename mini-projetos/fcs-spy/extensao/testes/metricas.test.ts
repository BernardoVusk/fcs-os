import { describe, it, expect } from 'vitest'
import { calcularMetricas, taxaShopee } from '../src/nucleo/metricas'
import { CONFIG_PADRAO } from '../src/dados/config'
import { anuncio } from './fabrica'

const hoje = new Date('2026-09-27T12:00:00Z')

describe('conferência com o print do Ziem Spy', () => {
  const m = calcularMetricas(anuncio(), CONFIG_PADRAO, hoje)

  it('dias no ar', () => expect(m.diasNoAr).toBe(390))
  it('recebe', () => expect(m.recebe).toBeCloseTo(3.92, 2))
  it('faturamento 30D', () => expect(m.faturamento30d).toBeCloseTo(11394.9, 2))
  it('faturamento total', () => expect(m.faturamentoTotal).toBeCloseTo(45490.5, 2))
  it('média diária', () => expect(m.mediaDiaria).toBeCloseTo(379.83, 2))
  it('custo alvo 10, 15, 20', () => {
    expect(m.custoAlvo.map(c => c.margem)).toEqual([0.1, 0.15, 0.2])
    expect(m.custoAlvo[0].valor).toBeCloseTo(2.93, 2)
    expect(m.custoAlvo[1].valor).toBeCloseTo(2.435, 3)
    expect(m.custoAlvo[2].valor).toBeCloseTo(1.94, 2)
  })
  it('outros cards do print', () => {
    expect(calcularMetricas(anuncio({ preco: 15.83 }), CONFIG_PADRAO, hoje).recebe).toBeCloseTo(8.66, 2)
    expect(calcularMetricas(anuncio({ preco: 21.99 }), CONFIG_PADRAO, hoje).recebe).toBeCloseTo(13.59, 2)
  })
})

describe('taxaShopee', () => {
  it('preço x comissão + taxa fixa', () => {
    expect(taxaShopee(15.9, { comissaoPct: 0.2, taxaFixa: 4 })).toBeCloseTo(7.18, 2)
  })
})

describe('campos nulos', () => {
  it('sem vendas e sem data, métricas dependentes viram null', () => {
    const m = calcularMetricas(anuncio({ vendas30d: null, vendasTotal: null, criadoEm: null }), CONFIG_PADRAO, hoje)
    expect(m.diasNoAr).toBeNull()
    expect(m.faturamento30d).toBeNull()
    expect(m.faturamentoTotal).toBeNull()
    expect(m.mediaDiaria).toBeNull()
    expect(m.recebe).toBeCloseTo(3.92, 2)
  })
})

describe('faixa nas métricas', () => {
  it('usa os cortes da configuração', () => {
    expect(calcularMetricas(anuncio({ vendas30d: 1151 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('alta')
    expect(calcularMetricas(anuncio({ vendas30d: 188 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('media')
    expect(calcularMetricas(anuncio({ vendas30d: 12 }), CONFIG_PADRAO, hoje).faixa?.nivel).toBe('baixa')
    expect(calcularMetricas(anuncio({ vendas30d: null }), CONFIG_PADRAO, hoje).faixa).toBeNull()
  })
})
