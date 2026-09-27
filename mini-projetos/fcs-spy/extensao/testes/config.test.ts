import { describe, it, expect } from 'vitest'
import { CONFIG_PADRAO, CHAVE_CONFIG, mesclar, lerConfig, salvarConfig } from '../src/dados/config'
import { areaEmMemoria } from './area-memoria'

describe('CONFIG_PADRAO', () => {
  it('comissão 20% + R$ 4 e margens 10, 15, 20', () => {
    expect(CONFIG_PADRAO.comissaoPct).toBe(0.2)
    expect(CONFIG_PADRAO.taxaFixa).toBe(4)
    expect(CONFIG_PADRAO.margens).toEqual([0.1, 0.15, 0.2])
  })
})

describe('mesclar', () => {
  it('nada salvo devolve o padrão', () => {
    expect(mesclar(undefined)).toEqual(CONFIG_PADRAO)
  })
  it('aproveita número válido e descarta lixo', () => {
    const c = mesclar({ comissaoPct: 0.18, taxaFixa: 'x', margens: [], kwh: Number.NaN })
    expect(c.comissaoPct).toBe(0.18)
    expect(c.taxaFixa).toBe(4)
    expect(c.margens).toEqual([0.1, 0.15, 0.2])
    expect(c.kwh).toBe(CONFIG_PADRAO.kwh)
  })
  it('não compartilha o array de margens com o padrão', () => {
    const c = mesclar(undefined)
    c.margens.push(0.5)
    expect(CONFIG_PADRAO.margens).toHaveLength(3)
  })
})

describe('lerConfig e salvarConfig', () => {
  it('lê o que foi salvo, completando com padrão', async () => {
    const area = areaEmMemoria({ [CHAVE_CONFIG]: { kwh: 1.1 } })
    const c = await lerConfig(area)
    expect(c.kwh).toBe(1.1)
    expect(c.comissaoPct).toBe(0.2)
  })
  it('ida e volta', async () => {
    const area = areaEmMemoria()
    await salvarConfig({ ...CONFIG_PADRAO, embalagem: 2.5 }, area)
    expect((await lerConfig(area)).embalagem).toBe(2.5)
  })
})
