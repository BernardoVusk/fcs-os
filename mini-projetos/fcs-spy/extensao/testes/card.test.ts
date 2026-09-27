// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  montarCard, linkDoProduto, containerDoCard, anexarCard, textoHistorico, ATRIBUTO_CARD,
} from '../src/ui/card'
import { calcularMetricas } from '../src/nucleo/metricas'
import { CONFIG_PADRAO } from '../src/dados/config'
import { anuncio } from './fabrica'
import type { Anuncio } from '../src/nucleo/tipos'

const hoje = new Date('2026-09-27T12:00:00Z')
const card = (a: Anuncio, historico: Parameters<typeof textoHistorico>[0] = null) =>
  montarCard({ anuncio: a, metricas: calcularMetricas(a, CONFIG_PADRAO, hoje), historico })
const texto = (host: HTMLElement) => host.shadowRoot!.textContent ?? ''

describe('montarCard', () => {
  it('mostra as métricas conferidas', () => {
    const host = card(anuncio())
    const t = texto(host)
    expect(host.getAttribute(ATRIBUTO_CARD)).toBe('1')
    expect(t).toContain('390 dias no ar')
    expect(t).toContain('recebe R$ 3,92')
    expect(t).toContain('1.151')
    expect(t).toContain('4.595')
    expect(t).toContain('R$ 11.394,90')
    expect(t).toContain('R$ 45.490,50')
    expect(t).toContain('R$ 379,83')
    expect(t).toContain('10% R$ 2,93')
    expect(t).toContain('est.')
    expect(t).toContain('primeira leitura')
    expect(t).toContain('Loja Teste')
  })
  it('campo nulo vira sem dado', () => {
    const t = texto(card(anuncio({ vendas30d: null, criadoEm: null })))
    expect(t).toContain('sem dado')
  })
  it('selos só quando existem', () => {
    expect(texto(card(anuncio()))).not.toContain('Indicado')
    const t = texto(card(anuncio({ selos: { ads: true, indicado: true, lojaOficial: false } })))
    expect(t).toContain('Indicado')
    expect(t).toContain('Ads')
  })
  it('sem travessão e sem emoji', () => {
    const t = texto(card(anuncio()))
    expect(t).not.toMatch(/[–—]/)
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('textoHistorico', () => {
  it('estados', () => {
    expect(textoHistorico(null)).toBe('primeira leitura')
    expect(textoHistorico('indisponivel')).toBe('histórico indisponível')
    expect(textoHistorico({ dias: 7, difVendas30d: 120, difPreco: 0, seta: 'sobe' }))
      .toBe('subindo: +120 vendas 30D em 7 dias')
    expect(textoHistorico({ dias: 1, difVendas30d: -5, difPreco: 0, seta: 'cai' }))
      .toBe('caindo: -5 vendas 30D em 1 dia')
    expect(textoHistorico({ dias: 2, difVendas30d: 0, difPreco: 0, seta: 'estavel' }))
      .toBe('estável: 0 vendas 30D em 2 dias')
    expect(textoHistorico({ dias: 3, difVendas30d: null, difPreco: 0, seta: null }))
      .toBe('sem dado de vendas, última leitura há 3 dias')
  })
})

describe('localizar e anexar', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li id="um"><a href="/Produto-i.2.1?sp_atk=x">p</a></li>
        <li id="dez"><a href="/Outro-i.2.10">q</a></li>
      </ul>`
  })
  it('acha o link exato, não o de id parecido', () => {
    expect(linkDoProduto(document, { shopId: '2', itemId: '1' })?.textContent).toBe('p')
    expect(linkDoProduto(document, { shopId: '2', itemId: '10' })?.textContent).toBe('q')
    expect(linkDoProduto(document, { shopId: '2', itemId: '3' })).toBeNull()
  })
  it('container é o li, e anexar não duplica', () => {
    const container = containerDoCard(linkDoProduto(document, { shopId: '2', itemId: '1' })!)!
    expect(container.id).toBe('um')
    anexarCard(container, card(anuncio()))
    anexarCard(container, card(anuncio()))
    expect(container.querySelectorAll(`[${ATRIBUTO_CARD}]`)).toHaveLength(1)
  })
})
