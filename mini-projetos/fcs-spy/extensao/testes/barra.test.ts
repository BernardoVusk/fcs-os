// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarBarra, aplicarLigado, instalarEstiloGlobal, ATRIBUTO_BARRA, ATRIBUTO_DESLIGADO } from '../src/ui/barra'

describe('montarBarra', () => {
  it('escolher critério chama aoOrdenar', () => {
    const aoOrdenar = vi.fn()
    const host = montarBarra(aoOrdenar, vi.fn())
    expect(host.hasAttribute(ATRIBUTO_BARRA)).toBe(true)
    const select = host.shadowRoot!.querySelector('select')!
    expect(select.options[0].textContent).toBe('Ordenar os itens desta página')
    select.value = 'faturamento30d'
    select.dispatchEvent(new Event('change'))
    expect(aoOrdenar).toHaveBeenCalledWith('faturamento30d')
  })
  it('botão alterna ligado e desligado', () => {
    const aoAlternar = vi.fn()
    const host = montarBarra(vi.fn(), aoAlternar)
    const botao = host.shadowRoot!.querySelector('button')!
    expect(botao.textContent).toBe('Desligar')
    botao.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(false)
    expect(botao.textContent).toBe('Ligar')
    botao.click()
    expect(aoAlternar).toHaveBeenLastCalledWith(true)
  })
})

describe('aplicarLigado e estilo global', () => {
  it('marca o html quando desligado', () => {
    aplicarLigado(document, false)
    expect(document.documentElement.hasAttribute(ATRIBUTO_DESLIGADO)).toBe(true)
    aplicarLigado(document, true)
    expect(document.documentElement.hasAttribute(ATRIBUTO_DESLIGADO)).toBe(false)
  })
  it('instala o estilo uma vez só', () => {
    instalarEstiloGlobal(document)
    instalarEstiloGlobal(document)
    expect(document.querySelectorAll('#fcs-spy-estilo')).toHaveLength(1)
  })
})
