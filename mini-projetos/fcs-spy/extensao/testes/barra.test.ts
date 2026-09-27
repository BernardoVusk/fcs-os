// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { montarBarra, aplicarLigado, instalarEstiloGlobal, sincronizarBarra, ATRIBUTO_BARRA, ATRIBUTO_DESLIGADO } from '../src/ui/barra'

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
  // Card da Shopee tem height: 100%. Sem essa regra o painel sai do bloco
  // e fica atrás da fileira seguinte (conferido no Chrome em 27/09/2026).
  it('bloco com card vira coluna e o card da Shopee ocupa só o que sobra', () => {
    instalarEstiloGlobal(document)
    const css = document.getElementById('fcs-spy-estilo')!.textContent!
    expect(css).toContain(':has(> [data-fcs-spy-card]) { display: flex !important; flex-direction: column !important; }')
    expect(css).toContain(':has(> [data-fcs-spy-card]) > :not([data-fcs-spy-card]) { height: auto !important; flex: 1 1 auto !important; }')
    expect(css).toContain('[data-fcs-spy-card] { display: block; }')
  })
})

// Achado da checagem de 27/09/2026: a barra aparecia no carrinho, sem card para ordenar.
describe('sincronizarBarra', () => {
  const criar = () => montarBarra(vi.fn(), vi.fn())
  const barras = () => document.querySelectorAll(`[${ATRIBUTO_BARRA}]`)

  it('sem card na página, sem barra', () => {
    document.body.innerHTML = '<ul><li>carrinho</li></ul>'
    sincronizarBarra(document, criar)
    expect(barras()).toHaveLength(0)
  })
  it('com card, cria a barra uma vez só', () => {
    document.body.innerHTML = '<ul><li><div data-fcs-spy-card="1"></div></li></ul>'
    sincronizarBarra(document, criar)
    sincronizarBarra(document, criar)
    expect(barras()).toHaveLength(1)
  })
  it('cards somem, barra some e a camada volta a ficar ligada', () => {
    document.body.innerHTML = '<ul><li><div data-fcs-spy-card="1"></div></li></ul>'
    sincronizarBarra(document, criar)
    aplicarLigado(document, false)
    document.querySelector('ul')!.remove()
    sincronizarBarra(document, criar)
    expect(barras()).toHaveLength(0)
    expect(document.documentElement.hasAttribute(ATRIBUTO_DESLIGADO)).toBe(false)
  })
})
