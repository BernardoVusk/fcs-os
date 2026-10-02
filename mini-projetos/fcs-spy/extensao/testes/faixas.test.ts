import { describe, it, expect } from 'vitest'
import { faixaVendas } from '../src/nucleo/faixas'

const c = { corteVerde: 300, corteAmarelo: 50 }

describe('faixaVendas', () => {
  it('alta a partir do corte verde', () => {
    expect(faixaVendas(300, c)).toEqual({ nivel: 'alta', titulo: 'Vendas altas: 300 ou mais no mês' })
    expect(faixaVendas(1151, c)?.nivel).toBe('alta')
  })
  it('média do corte amarelo até um abaixo do verde', () => {
    expect(faixaVendas(50, c)).toEqual({ nivel: 'media', titulo: 'Vendas médias: de 50 a 299 no mês' })
    expect(faixaVendas(299, c)?.nivel).toBe('media')
  })
  it('baixa abaixo do corte amarelo, inclusive zero', () => {
    expect(faixaVendas(49, c)).toEqual({ nivel: 'baixa', titulo: 'Vendas baixas: menos de 50 no mês' })
    expect(faixaVendas(0, c)?.nivel).toBe('baixa')
  })
  it('sem vendas 30D não tem faixa', () => {
    expect(faixaVendas(null, c)).toBeNull()
  })
  it('cortes com milhar aparecem formatados', () => {
    expect(faixaVendas(2000, { corteVerde: 1000, corteAmarelo: 200 })?.titulo).toBe('Vendas altas: 1.000 ou mais no mês')
  })
})
