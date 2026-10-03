import { describe, it, expect, vi } from 'vitest'
import { periodoDaUrl, mesmoPeriodo, juntarProdutos, gravarColeta, lerColetas, CHAVE_VENDEDOR } from '../src/vendedor/coleta'
import { areaEmMemoria } from './area-memoria'
import km from './amostras/vendedor-exemplo/key-metrics.json'
import pp from './amostras/vendedor-exemplo/product-performance.json'
import mk from './amostras/vendedor-exemplo/marketing-discount.json'

const URL_KM = '/api/mydata/v3/dashboard/key-metrics/?start_time=100&end_time=200&period=past7days'
const URL_PP = (p: number) => `/api/mydata/v4/product/performance/?start_time=100&end_time=200&period=past7days&page_num=${p}`

describe('periodoDaUrl', () => {
  it('lê início, fim e tipo', () => {
    expect(periodoDaUrl(URL_KM)).toEqual({ inicio: 100, fim: 200, tipo: 'past7days' })
    expect(periodoDaUrl('/api/x')).toEqual({ inicio: null, fim: null, tipo: null })
  })
  it('mesmo período', () => {
    expect(mesmoPeriodo(periodoDaUrl(URL_KM), periodoDaUrl(URL_PP(2)))).toBe(true)
    expect(mesmoPeriodo(periodoDaUrl(URL_KM), { inicio: 100, fim: 300, tipo: 'past7days' })).toBe(false)
  })
})

describe('gravarColeta e lerColetas', () => {
  it('grava indicadores com período e hora da leitura', async () => {
    const area = areaEmMemoria()
    expect(await gravarColeta('indicadores', URL_KM, km, 1000, area)).toBe(true)
    const c = await lerColetas(area)
    expect(c.indicadores?.lidoEm).toBe(1000)
    expect(c.indicadores?.periodo.tipo).toBe('past7days')
    expect(c.indicadores?.dados.vendas.valor).toBe(1250.5)
  })
  it('páginas de produtos do mesmo período se juntam; período novo substitui', async () => {
    const area = areaEmMemoria()
    await gravarColeta('produtos', URL_PP(1), pp, 1000, area)
    const outra = { result: { items: [{ id: 33333333333, name: 'Produto 3', paid_orders: 1 }, { id: 11111111111, name: 'Produto 1', paid_orders: 9 }] } }
    await gravarColeta('produtos', URL_PP(2), outra, 2000, area)
    let c = await lerColetas(area)
    expect(c.produtos?.dados.map(p => p.itemId)).toEqual(['11111111111', '22222222222', '33333333333'])
    expect(c.produtos?.dados[0].pedidos).toBe(9)
    expect(c.produtos?.lidoEm).toBe(2000)
    await gravarColeta('produtos', '/api/mydata/v4/product/performance/?start_time=500&end_time=600&period=past30days', outra, 3000, area)
    c = await lerColetas(area)
    expect(c.produtos?.dados).toHaveLength(2)
  })
  it('marketing guardado por ferramenta', async () => {
    const area = areaEmMemoria()
    await gravarColeta('marketing', '/api/mydata/marketing/new-discount/key-metrics/?start_time=1', mk, 1000, area)
    const c = await lerColetas(area)
    expect(c.marketing?.['new-discount'].dados.vendas).toBe(400)
  })
  it('resposta com formato inesperado não grava', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const area = areaEmMemoria()
    expect(await gravarColeta('produtos', URL_PP(1), {}, 1000, area)).toBe(false)
    expect(area.dados[CHAVE_VENDEDOR]).toBeUndefined()
    aviso.mockRestore()
  })
  it('tudo numa chave só', async () => {
    const area = areaEmMemoria()
    await gravarColeta('indicadores', URL_KM, km, 1000, area)
    expect(Object.keys(area.dados)).toEqual([CHAVE_VENDEDOR])
  })
})
