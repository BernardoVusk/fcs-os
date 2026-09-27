import { describe, it, expect } from 'vitest'
import {
  MAX_LEITURAS, dataLocal, leituraDe, registrar, anterior, comparar, gravarLeituras, ultimaLeitura,
} from '../src/dados/historico'
import type { Leitura } from '../src/nucleo/tipos'
import { areaEmMemoria } from './area-memoria'
import { anuncio } from './fabrica'

const l = (data: string, vendas30d: number | null, preco = 10): Leitura =>
  ({ itemId: '1', data, preco, vendas30d, vendasTotal: 100 })

describe('dataLocal e leituraDe', () => {
  it('data local AAAA-MM-DD', () => {
    expect(dataLocal(new Date(2026, 8, 7, 23, 30))).toBe('2026-09-07')
  })
  it('leitura a partir do anúncio', () => {
    expect(leituraDe(anuncio(), new Date(2026, 8, 27, 10))).toEqual({
      itemId: '1', data: '2026-09-27', preco: 9.9, vendas30d: 1151, vendasTotal: 4595,
    })
  })
})

describe('registrar', () => {
  it('substitui a leitura do mesmo dia', () => {
    const r = registrar([l('2026-09-26', 10), l('2026-09-27', 11)], l('2026-09-27', 15))
    expect(r).toEqual([l('2026-09-26', 10), l('2026-09-27', 15)])
  })
  it('mantém ordem por data', () => {
    const r = registrar([l('2026-09-27', 11)], l('2026-09-20', 5))
    expect(r.map(x => x.data)).toEqual(['2026-09-20', '2026-09-27'])
  })
  it(`guarda no máximo ${MAX_LEITURAS}`, () => {
    let lista: Leitura[] = []
    for (let i = 0; i < 95; i++) lista = registrar(lista, l(dataLocal(new Date(2026, 0, 1 + i)), i))
    expect(lista).toHaveLength(MAX_LEITURAS)
    expect(lista[0].vendas30d).toBe(5)
  })
})

describe('anterior', () => {
  it('mais recente antes da data', () => {
    const lista = [l('2026-09-20', 1), l('2026-09-25', 2), l('2026-09-27', 3)]
    expect(anterior(lista, '2026-09-27')?.data).toBe('2026-09-25')
    expect(anterior(lista, '2026-09-20')).toBeNull()
  })
})

describe('comparar', () => {
  it('sobe', () => {
    expect(comparar(l('2026-09-27', 130, 11), l('2026-09-20', 10, 10)))
      .toEqual({ dias: 7, difVendas30d: 120, difPreco: 1, seta: 'sobe' })
  })
  it('cai', () => expect(comparar(l('2026-09-27', 5), l('2026-09-26', 10))?.seta).toBe('cai'))
  it('estável', () => expect(comparar(l('2026-09-27', 10), l('2026-09-26', 10))?.seta).toBe('estavel'))
  it('sem vendas, seta null', () => {
    expect(comparar(l('2026-09-27', null), l('2026-09-26', 10))).toEqual(
      { dias: 1, difVendas30d: null, difPreco: 0, seta: null })
  })
  it('sem anterior, null', () => expect(comparar(l('2026-09-27', 10), null)).toBeNull())
})

describe('gravarLeituras e ultimaLeitura', () => {
  it('primeira leitura, depois tendência no dia seguinte', async () => {
    const area = areaEmMemoria()
    const t1 = await gravarLeituras([l('2026-09-26', 10)], area)
    expect(t1.get('1')).toBeNull()
    const t2 = await gravarLeituras([l('2026-09-27', 14)], area)
    expect(t2.get('1')).toEqual({ dias: 1, difVendas30d: 4, difPreco: 0, seta: 'sobe' })
    expect(area.dados['h:1']).toHaveLength(2)
    expect((await ultimaLeitura('1', area))?.vendas30d).toBe(14)
  })
  it('mesmo dia de novo substitui e compara com o dia anterior', async () => {
    const area = areaEmMemoria()
    await gravarLeituras([l('2026-09-26', 10)], area)
    await gravarLeituras([l('2026-09-27', 14)], area)
    const t = await gravarLeituras([l('2026-09-27', 20)], area)
    expect(t.get('1')?.difVendas30d).toBe(10)
    expect(area.dados['h:1']).toHaveLength(2)
  })
  it('sem leitura, ultimaLeitura é null', async () => {
    expect(await ultimaLeitura('999', areaEmMemoria())).toBeNull()
  })
})
