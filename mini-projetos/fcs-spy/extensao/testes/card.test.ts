// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  montarCard, linkDoProduto, containerDoCard, anexarCard, textoHistorico, ATRIBUTO_CARD,
  mapaDeLinks, chaveDoProduto, chipHistorico,
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
    expect(t).toContain('390 dias')
    expect(t).toContain('R$\u00a03,92')
    expect(t).toContain('1.151')
    expect(t).toContain('4.595')
    expect(t).toContain('R$\u00a011,4\u00a0mil')
    expect(t).toContain('R$ 45.490,50')
    expect(t).toContain('R$\u00a0380')
    expect(t).toContain('10% R$ 2,93')
    expect(host.shadowRoot!.querySelectorAll('.est').length).toBeGreaterThan(0)
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
  it('ponto de estimativa tem texto para leitor de tela', () => {
    const r = card(anuncio()).shadowRoot!
    const soLeitor = [...r.querySelectorAll('.so-leitor')]
    expect(soLeitor.length).toBeGreaterThan(0)
    expect(soLeitor.some(s => s.textContent?.trim() === '(estimativa)')).toBe(true)
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
    expect(textoHistorico({ dias: 7, difVendas30d: 120, difPreco: -2, seta: 'sobe' }))
      .toBe('subindo: +120 vendas 30D em 7 dias, preço -R$ 2,00')
    expect(textoHistorico({ dias: 1, difVendas30d: -5, difPreco: 1.5, seta: 'cai' }))
      .toBe('caindo: -5 vendas 30D em 1 dia, preço +R$ 1,50')
    expect(textoHistorico({ dias: 3, difVendas30d: null, difPreco: 0.9, seta: null }))
      .toBe('sem dado de vendas, última leitura há 3 dias, preço +R$ 0,90')
  })
})

describe('card v2', () => {
  const raiz = (h: HTMLElement) => h.shadowRoot!

  it('ver mais abre e fecha os detalhes', () => {
    const r = raiz(card(anuncio()))
    const detalhes = r.querySelector<HTMLElement>('.detalhes')!
    const mais = r.querySelector<HTMLButtonElement>('.mais')!
    expect(detalhes.hidden).toBe(true)
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.textContent).toBe('ver mais')
    mais.click()
    expect(detalhes.hidden).toBe(false)
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    expect(mais.textContent).toBe('fechar')
  })
  it('recebe e dias no ar têm título explicativo', () => {
    const r = raiz(card(anuncio()))
    expect(r.querySelector('[title="Dias no ar"]')!.textContent).toBe('390 dias')
    expect(r.querySelector('[title^="Quanto o vendedor recebe"]')!.textContent).toBe('R$\u00a03,92')
  })
  it('chip de tendência leva a frase completa no title', () => {
    const h = { dias: 7, difVendas30d: 120, difPreco: -2, seta: 'sobe' as const }
    const chip = raiz(card(anuncio(), h)).querySelector<HTMLElement>('.chip')!
    expect(chip.className).toBe('chip sobe')
    expect(chip.textContent).toBe('+120')
    expect(chip.title).toBe(textoHistorico(h))
  })
  it('copiar tem nome acessível e ícones estão presentes', () => {
    const r = raiz(card(anuncio()))
    expect(r.querySelector('button[aria-label="Copiar nome da loja"]')).not.toBeNull()
    expect(r.querySelectorAll('svg.ic').length).toBeGreaterThan(4)
  })
})

describe('chipHistorico', () => {
  it('estados', () => {
    expect(chipHistorico(null)).toEqual({ classe: 'novo', texto: '1ª leitura', icone: null })
    expect(chipHistorico('indisponivel')).toEqual({ classe: 'novo', texto: 'sem histórico', icone: null })
    expect(chipHistorico({ dias: 1, difVendas30d: null, difPreco: 0, seta: null }))
      .toEqual({ classe: 'novo', texto: 'sem dado', icone: null })
    expect(chipHistorico({ dias: 1, difVendas30d: 1200, difPreco: 0, seta: 'sobe' }))
      .toEqual({ classe: 'sobe', texto: '+1.200', icone: 'sobe' })
    expect(chipHistorico({ dias: 1, difVendas30d: -40, difPreco: 0, seta: 'cai' }))
      .toEqual({ classe: 'cai', texto: '-40', icone: 'cai' })
    expect(chipHistorico({ dias: 1, difVendas30d: 0, difPreco: 0, seta: 'estavel' }))
      .toEqual({ classe: 'estavel', texto: '0', icone: null })
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

describe('containerDoCard', () => {
  it('li com um produto só devolve o li', () => {
    document.body.innerHTML = `<ul><li id="um"><a href="/Produto-i.2.1">p</a></li></ul>`
    const link = document.querySelector('a')!
    expect(containerDoCard(link)!.id).toBe('um')
  })
  it('li com dois produtos distintos devolve o parentElement do link', () => {
    document.body.innerHTML = `
      <ul><li id="dupla">
        <div id="cont-a"><a id="a" href="/Produto-i.2.1">p</a></div>
        <div id="cont-b"><a id="b" href="/Outro-i.2.2">q</a></div>
      </li></ul>`
    const linkA = document.getElementById('a') as HTMLAnchorElement
    expect(containerDoCard(linkA)).toBe(linkA.parentElement)
    expect(containerDoCard(linkA)!.id).toBe('cont-a')
  })
  it('sem li devolve o parentElement', () => {
    document.body.innerHTML = `<div id="pai"><a href="/Produto-i.2.1">p</a></div>`
    const link = document.querySelector('a')!
    expect(containerDoCard(link)!.id).toBe('pai')
  })
})

describe('chaveDoProduto', () => {
  it('junta shopId e itemId com ponto', () => {
    expect(chaveDoProduto({ shopId: '2', itemId: '1' })).toBe('2.1')
  })
})

describe('mapaDeLinks', () => {
  it('mapa com os dois padrões de URL', () => {
    document.body.innerHTML = `
      <ul>
        <li><a href="/Produto-i.2.1">p</a></li>
        <li><a href="/product/3/4">q</a></li>
      </ul>`
    const mapa = mapaDeLinks(document)
    expect(mapa.size).toBe(2)
    expect(mapa.get('2.1')?.textContent).toBe('p')
    expect(mapa.get('3.4')?.textContent).toBe('q')
  })

  it('id parecido em chaves distintas', () => {
    document.body.innerHTML = `
      <ul>
        <li><a href="/Produto-i.2.1">p</a></li>
        <li><a href="/Outro-i.2.10">q</a></li>
      </ul>`
    const mapa = mapaDeLinks(document)
    expect(mapa.size).toBe(2)
    expect(mapa.get('2.1')?.textContent).toBe('p')
    expect(mapa.get('2.10')?.textContent).toBe('q')
  })

  it('primeiro link vence quando o mesmo produto aparece duas vezes', () => {
    document.body.innerHTML = `
      <ul>
        <li><a href="/Produto-i.2.1">primeiro</a></li>
        <li><a href="/Produto-i.2.1">segundo</a></li>
      </ul>`
    const mapa = mapaDeLinks(document)
    expect(mapa.size).toBe(1)
    expect(mapa.get('2.1')?.textContent).toBe('primeiro')
  })
})

describe('cor da faixa no card', () => {
  const raiz = (a: Anuncio) => card(a).shadowRoot!
  it('número e borda na cor da faixa, com título explicativo', () => {
    const r = raiz(anuncio({ vendas30d: 1151 }))
    const numero = r.querySelector<HTMLElement>('.heroi .grande')!
    expect(numero.classList.contains('cor-alta')).toBe(true)
    expect(numero.title).toBe('Vendas altas: 300 ou mais no mês')
    expect(r.querySelector('.card')!.classList.contains('faixa-alta')).toBe(true)
  })
  it('média e baixa', () => {
    expect(raiz(anuncio({ vendas30d: 188 })).querySelector('.card')!.classList.contains('faixa-media')).toBe(true)
    expect(raiz(anuncio({ vendas30d: 12 })).querySelector('.card')!.classList.contains('faixa-baixa')).toBe(true)
  })
  it('sem vendas 30D o card fica neutro', () => {
    const r = raiz(anuncio({ vendas30d: null }))
    expect(r.querySelector('.card')!.className).toBe('card')
    expect(r.querySelector('.heroi .grande')!.className).toBe('grande num')
  })
})
