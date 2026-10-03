import { describe, it, expect, vi } from 'vitest'
import km from './amostras/vendedor-exemplo/key-metrics.json'
import ts from './amostras/vendedor-exemplo/traffic-sources.json'
import pp from './amostras/vendedor-exemplo/product-performance.json'
import ads from './amostras/vendedor-exemplo/ads-campanhas.json'
import af from './amostras/vendedor-exemplo/afiliados-diario.json'
import mk from './amostras/vendedor-exemplo/marketing-discount.json'
import {
  traduzirIndicadores, traduzirOrigens, traduzirProdutos, traduzirCampanhas,
  traduzirAfiliados, traduzirMarketing, ferramentaDaUrl,
} from '../src/vendedor/traduzir'

describe('traduzirIndicadores', () => {
  it('valores em reais e variação', () => {
    const i = traduzirIndicadores(km)!
    expect(i.vendas).toEqual({ valor: 1250.5, variacao: 0.1 })
    expect(i.pedidos).toEqual({ valor: 40, variacao: -0.05 })
    expect(i.ticket.valor).toBe(31.26)
    expect(i.visitantes.valor).toBe(900)
    expect(i.cliquesProduto.valor).toBe(1100)
    expect(i.conversao).toEqual({ valor: 0.0444, variacao: -0.1 })
  })
  it('campo ausente vira null', () => {
    expect(traduzirIndicadores({ result: {} })!.vendas).toEqual({ valor: null, variacao: null })
  })
})

describe('traduzirOrigens', () => {
  it('canais e parte via anúncio separada', () => {
    const o = traduzirOrigens(ts)!
    expect(o.total).toBe(1250.5)
    expect(o.canais.map(c => c.canal)).toEqual(['card', 'live', 'video', 'afiliado'])
    expect(o.canais[0]).toEqual({ canal: 'card', vendas: 1200, proporcao: 0.96, variacao: 0.08 })
    expect(o.viaAnuncio).toEqual({ vendas: 300, proporcao: 0.24, variacao: 0.3 })
  })
})

describe('traduzirProdutos', () => {
  it('funil e variações por produto', () => {
    const p = traduzirProdutos(pp)!
    expect(p).toHaveLength(2)
    expect(p[0]).toEqual({
      itemId: '11111111111', nome: 'Produto 1', impressoes: 5000, cliques: 200, ctr: 0.04, visitantes: 150,
      rejeicao: 0.3, carrinho: 20, pedidos: 8, unidades: 9, vendas: 360, conversao: 0.0533,
      variacoes: [{ nome: 'Vermelho', unidades: 6, vendas: 240 }, { nome: 'Azul', unidades: 3, vendas: 120 }],
    })
  })
  it('id inválido é descartado', () => {
    expect(traduzirProdutos({ result: { items: [{ id: '1"]', name: 'x' }] } })).toEqual([])
  })
})

describe('traduzirCampanhas', () => {
  it('dinheiro e ROAS alvo divididos por 100000', () => {
    const c = traduzirCampanhas(ads)!
    expect(c[0]).toEqual({
      campanhaId: '900001', itemId: '11111111111', titulo: 'Produto 1', estado: 'ongoing',
      orcamentoDiario: 50, roasAlvo: 8, gasto: 20, receita: 180, pedidos: 5, roas: 9,
      cliques: 80, impressoes: 3000, ctr: 0.0267, custoPorPedido: 4, custoPorClique: 0.25, carrinho: 10,
    })
    expect(c[1].estado).toBe('paused')
    expect(c[1].roasAlvo).toBeNull() // roi_two_target 0 = sem alvo
    expect(c[1].custoPorPedido).toBeNull()
    expect(c[1].custoPorClique).toBeCloseTo(5 / 60, 6)
  })
})

describe('traduzirAfiliados e traduzirMarketing', () => {
  it('afiliados em reais', () => {
    expect(traduzirAfiliados(af)).toEqual({ vendas: 50.5, pedidos: 2, comissao: 5.05, roi: 10, compradores: 2, variacaoVendas: 0.5 })
  })
  it('ferramenta de marketing', () => {
    expect(traduzirMarketing(mk, 'new-discount')).toEqual({ ferramenta: 'new-discount', vendas: 400, pedidos: 12, unidades: 13, compradores: 11, variacaoVendas: 0.2 })
    expect(ferramentaDaUrl('/api/mydata/marketing/new-discount/key-metrics/?start_time=1')).toBe('new-discount')
    expect(ferramentaDaUrl('/api/outra')).toBeNull()
  })
})

describe('formato inesperado', () => {
  it('null com aviso', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirProdutos({})).toBeNull()
    expect(traduzirCampanhas(null)).toBeNull()
    expect(aviso.mock.calls[0][0]).toContain('[FCS SPY]')
    aviso.mockRestore()
  })
})
