import { describe, it, expect } from 'vitest'
import { lerCusto, salvarCusto, lerCustos } from '../src/dados/custos'
import { areaEmMemoria } from './area-memoria'

describe('custo por produto', () => {
  it('ida e volta', async () => {
    const area = areaEmMemoria()
    await salvarCusto('111', { gramas: 30, horas: 4, minutos: 10 }, area)
    expect(await lerCusto('111', area)).toEqual({ gramas: 30, horas: 4, minutos: 10 })
    expect(area.dados['custo:111']).toBeDefined()
  })
  it('sem custo é null', async () => expect(await lerCusto('999', areaEmMemoria())).toBeNull())
  it('valor salvo estragado é ignorado', async () => {
    expect(await lerCusto('1', areaEmMemoria({ 'custo:1': { gramas: 'x' } }))).toBeNull()
  })
  it('vários de uma vez', async () => {
    const area = areaEmMemoria({ 'custo:1': { gramas: 10, horas: 1, minutos: 0 } })
    const m = await lerCustos(['1', '2'], area)
    expect([...m.keys()]).toEqual(['1'])
  })
})
