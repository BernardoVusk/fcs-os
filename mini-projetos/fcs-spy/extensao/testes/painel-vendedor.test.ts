// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarPainelVendedor, montarBotaoVendedor, textoLidoHa, FONTES, ATRIBUTO_VENDEDOR } from '../src/vendedor/painel-vendedor'

const MIN = 60_000

describe('textoLidoHa', () => {
  it('faixas de tempo', () => {
    expect(textoLidoHa(0, 30_000)).toBe('lido agora há pouco')
    expect(textoLidoHa(0, 12 * MIN)).toBe('lido há 12 min')
    expect(textoLidoHa(0, 3 * 60 * MIN)).toBe('lido há 3 h')
    expect(textoLidoHa(0, 2 * 24 * 60 * MIN)).toBe('lido há 2 dias')
    expect(textoLidoHa(0, 24 * 60 * MIN)).toBe('lido há 1 dia')
  })
})

describe('montarPainelVendedor', () => {
  it('uma linha por fonte, com estado de leitura', () => {
    const coletas = { indicadores: { lidoEm: 0, periodo: { inicio: null, fim: null, tipo: 'past7days' }, dados: {} as never } }
    const host = montarPainelVendedor(coletas, 12 * MIN)
    expect(host.hasAttribute(ATRIBUTO_VENDEDOR)).toBe(true)
    const linhas = [...host.shadowRoot!.querySelectorAll('.fonte')]
    expect(linhas).toHaveLength(FONTES.length)
    expect(linhas[0].textContent).toContain('lido há 12 min')
    expect(linhas[1].textContent).toContain('ainda não lido')
    expect(linhas[1].querySelector('a')!.getAttribute('href')).toBe(FONTES[1].link)
  })
  it('marketing conta as ferramentas lidas', () => {
    const coleta = { lidoEm: 0, periodo: { inicio: null, fim: null, tipo: null }, dados: {} as never }
    const host = montarPainelVendedor({ marketing: { 'new-discount': coleta, voucher: coleta } }, MIN)
    const mk = [...host.shadowRoot!.querySelectorAll('.fonte')].find(l => l.querySelector('b')!.textContent!.startsWith('Marketing'))!
    expect(mk.textContent).toContain('2 ferramentas')
  })
  it('texto sem emoji e sem travessão', () => {
    const t = montarPainelVendedor({}, 0).shadowRoot!.textContent!
    expect(t).not.toMatch(/[–—]/)
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('montarBotaoVendedor', () => {
  it('chama ao clicar e tem nome acessível', () => {
    const aoAlternar = vi.fn()
    const b = montarBotaoVendedor(aoAlternar)
    const botao = b.shadowRoot!.querySelector('button')!
    expect(botao.getAttribute('aria-label')).toBe('Abrir FCS SPY Vendedor')
    botao.click()
    expect(aoAlternar).toHaveBeenCalledOnce()
  })
})
