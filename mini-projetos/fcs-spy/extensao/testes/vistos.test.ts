import { describe, it, expect } from 'vitest'
import { lembrar, MAX_VISTOS } from '../src/content/vistos'

describe('lembrar', () => {
  it('mantém no máximo max entradas, descartando as mais antigas', () => {
    const mapa = new Map<string, number>()
    lembrar(mapa, 'a', 1, 3)
    lembrar(mapa, 'b', 2, 3)
    lembrar(mapa, 'c', 3, 3)
    lembrar(mapa, 'd', 4, 3)
    expect([...mapa.keys()]).toEqual(['b', 'c', 'd'])
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
