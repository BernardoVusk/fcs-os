// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { ordenar, reordenarNaPagina, CRITERIOS } from '../src/ui/ordenar'
import { anuncio } from './fabrica'

const lista = [
  anuncio({ itemId: 'a', preco: 10, vendas30d: 5, vendasTotal: 500, criadoEm: new Date('2026-01-01') }),
  anuncio({ itemId: 'b', preco: 100, vendas30d: 2, vendasTotal: null, criadoEm: new Date('2026-06-01') }),
  anuncio({ itemId: 'c', preco: 1, vendas30d: null, vendasTotal: 900, criadoEm: null }),
  anuncio({ itemId: 'd', preco: 10, vendas30d: 50, vendasTotal: 50, criadoEm: new Date('2025-01-01') }),
]
const ids = (c: Parameters<typeof ordenar>[1]) => ordenar(lista, c).map(a => a.itemId)

describe('ordenar', () => {
  it('vendas 30D decrescente, sem dado no fim', () => expect(ids('vendas30d')).toEqual(['d', 'a', 'b', 'c']))
  it('vendas total', () => expect(ids('vendasTotal')).toEqual(['c', 'a', 'd', 'b']))
  it('faturamento 30D', () => expect(ids('faturamento30d')).toEqual(['d', 'b', 'a', 'c']))
  it('mais novos', () => expect(ids('maisNovos')).toEqual(['b', 'a', 'd', 'c']))
  it('mais antigos', () => expect(ids('maisAntigos')).toEqual(['d', 'a', 'b', 'c']))
  it('não altera a lista original', () => {
    ordenar(lista, 'vendas30d')
    expect(lista.map(a => a.itemId)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('cinco critérios com rótulo', () => expect(CRITERIOS).toHaveLength(5))
})

describe('reordenarNaPagina', () => {
  it('move os containers na ordem dada', () => {
    document.body.innerHTML = '<ul><li id="a"></li><li id="b"></li><li id="c"></li></ul>'
    const pega = (id: string) => document.getElementById(id)!
    reordenarNaPagina([pega('c'), pega('a'), pega('b')])
    expect([...document.querySelectorAll('li')].map(li => li.id)).toEqual(['c', 'a', 'b'])
  })
})
