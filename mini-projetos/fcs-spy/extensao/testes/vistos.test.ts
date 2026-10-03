import { describe, it, expect } from 'vitest'
import { lembrar, mesclarAnuncio, MAX_VISTOS } from '../src/content/vistos'
import { anuncio } from './fabrica'

describe('lembrar', () => {
  it('mantém no máximo max entradas, descartando as mais antigas', () => {
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1, 3)
    lembrar(mapa, 'b', 2, 3)
    lembrar(mapa, 'c', 3, 3)
    const removidas = lembrar(mapa, 'd', 4, 3)
    expect([...mapa.keys()]).toEqual(['b', 'c', 'd'])
    expect(removidas).toEqual(['a'])
  })

  it('devolve lista vazia quando não passa do limite', () => {
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1, 3)
    const removidas = lembrar(mapa, 'b', 2, 3)
    expect(removidas).toEqual([])
  })

  it('rever uma chave existente move ela para o fim e ela sobrevive à próxima evicção', () => {
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1, 3)
    lembrar(mapa, 'b', 2, 3)
    lembrar(mapa, 'c', 3, 3)
    lembrar(mapa, 'a', 1, 3)
    lembrar(mapa, 'd', 4, 3)
    expect([...mapa.keys()]).toEqual(['c', 'a', 'd'])
  })

  it('atualiza o valor de uma chave existente', () => {
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1, 3)
    lembrar(mapa, 'a', 99, 3)
    expect(mapa.get('a')).toBe(99)
  })

  it('usa MAX_VISTOS como padrão quando max não é informado', () => {
    expect(MAX_VISTOS).toBe(300)
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1)
    expect(mapa.size).toBe(1)
  })
})

describe('mesclarAnuncio', () => {
  it('herda campo nulo do antigo', () => {
    const m = mesclarAnuncio(anuncio(), anuncio({ vendas30d: null, vendasTotal: null, criadoEm: null, likes: null, reviews: null, nota: null, loja: null }))
    expect(m.vendas30d).toBe(1151)
    expect(m.vendasTotal).toBe(4595)
    expect(m.criadoEm).toEqual(new Date('2025-09-02T12:00:00Z'))
    expect(m.likes).toBe(1031)
    expect(m.reviews).toBe(2354)
    expect(m.nota).toBe(4.9)
    expect(m.loja).toBe('Loja Teste')
  })
  it('campo presente substitui e preço é sempre o do novo', () => {
    const m = mesclarAnuncio(anuncio(), anuncio({ vendas30d: 5, preco: 4.5, loja: 'Outra' }))
    expect(m.vendas30d).toBe(5)
    expect(m.loja).toBe('Outra')
    expect(m.preco).toBe(4.5)
  })
})
