// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { paraTela, daTela, iniciarTela, validarCortes, CAMPOS } from '../src/opcoes/opcoes'
import { CONFIG_PADRAO, CHAVE_CONFIG } from '../src/dados/config'
import type { Config } from '../src/nucleo/tipos'
import { areaEmMemoria } from './area-memoria'

describe('paraTela e daTela', () => {
  it('percentuais aparecem em % e margens separadas por ;', () => {
    const t = paraTela(CONFIG_PADRAO)
    expect(t.comissaoPct).toBe('20')
    expect(t.taxaFixa).toBe('4')
    expect(t.margens).toBe('10; 15; 20')
  })
  it('vírgula decimal nos campos com casa decimal', () => {
    expect(paraTela(CONFIG_PADRAO).kwh).toBe('0,95')
  })
  it('ida e volta sem perda', () => {
    expect(daTela(paraTela(CONFIG_PADRAO))).toEqual(CONFIG_PADRAO)
  })
  it('vírgula decimal e lixo', () => {
    const t = { ...paraTela(CONFIG_PADRAO), kwh: '1,05', embalagem: 'abc', margens: '12,5; x; 30' }
    const c = daTela(t)
    expect(c.kwh).toBe(1.05)
    expect(c.embalagem).toBe(CONFIG_PADRAO.embalagem)
    expect(c.margens).toEqual([0.125, 0.3])
  })
  it('todo campo numérico da config está na tela', () => {
    const chaves = CAMPOS.map(c => c.chave).sort()
    const esperado = Object.keys(CONFIG_PADRAO).filter(k => k !== 'margens').sort()
    expect(chaves).toEqual(esperado)
  })
})

describe('iniciarTela', () => {
  it('carrega, edita e salva', async () => {
    document.body.innerHTML = '<form id="form"><div id="campos"></div><button type="submit">Salvar</button><span id="status"></span></form>'
    const area = areaEmMemoria()
    await iniciarTela(document, area)
    const input = document.querySelector<HTMLInputElement>('input[name="comissaoPct"]')!
    expect(input.value).toBe('20')
    input.value = '18'
    document.getElementById('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toContain('Salvo'))
    expect((area.dados[CHAVE_CONFIG] as Config).comissaoPct).toBeCloseTo(0.18, 10)
  })
})

describe('tela v2', () => {
  it('cinco grupos na ordem e unidades nos campos', async () => {
    document.body.innerHTML = '<form id="form"><div id="campos"></div><span id="status"></span><button type="submit">Salvar custos</button></form>'
    await iniciarTela(document, areaEmMemoria())
    const titulos = [...document.querySelectorAll('.grupo h3')].map(h => h.textContent)
    expect(titulos).toEqual(['Shopee e imposto', 'Impressão 3D', 'Acabamento e envio', 'Cores das vendas', 'Custo alvo'])
    const unidades = (nome: string) =>
      [...document.querySelector(`input[name="${nome}"]`)!.parentElement!.querySelectorAll('.unidade')].map(u => u.textContent)
    expect(unidades('comissaoPct')).toEqual(['%'])
    expect(unidades('filamentoKg')).toEqual(['R$', '/kg'])
    expect(unidades('potenciaW')).toEqual(['W'])
    expect(unidades('kwh')).toEqual(['R$', '/kWh'])
    expect(unidades('margens')).toEqual(['%'])
    expect(unidades('corteVerde')).toEqual(['/mês'])
  })
})

describe('validarCortes', () => {
  it('aceita inteiros com amarelo menor que verde', () => {
    expect(validarCortes({ corteVerde: '300', corteAmarelo: '50' })).toBeNull()
  })
  it('recusa vazio, decimal e menor que 1', () => {
    const msg = 'Use um número inteiro a partir de 1 nas cores das vendas'
    expect(validarCortes({ corteVerde: '', corteAmarelo: '50' })).toBe(msg)
    expect(validarCortes({ corteVerde: '300,5', corteAmarelo: '50' })).toBe(msg)
    expect(validarCortes({ corteVerde: '300', corteAmarelo: '0' })).toBe(msg)
  })
  it('recusa amarelo maior ou igual ao verde', () => {
    expect(validarCortes({ corteVerde: '300', corteAmarelo: '300' })).toBe('O amarelo precisa ser menor que o verde')
  })
  it('ida e volta pela tela mantém 300 e 50', () => {
    const c = daTela(paraTela(CONFIG_PADRAO))
    expect(c.corteVerde).toBe(300)
    expect(c.corteAmarelo).toBe(50)
  })
  it('tela recusa salvar corte inválido e mostra o aviso', async () => {
    document.body.innerHTML = '<form id="form"><div id="campos"></div><span id="status"></span><button type="submit">Salvar</button></form>'
    const area = areaEmMemoria()
    await iniciarTela(document, area)
    document.querySelector<HTMLInputElement>('input[name="corteAmarelo"]')!.value = '400'
    document.getElementById('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toBe('O amarelo precisa ser menor que o verde'))
    expect(area.dados[CHAVE_CONFIG]).toBeUndefined()
  })
})
