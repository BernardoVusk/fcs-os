import { describe, it, expect, vi } from 'vitest'
import busca from './amostras/busca-miniatura-f1.json'
import vitrine from './amostras/hot-sales-miniatura-f1.json'
import produto from './amostras/pdp-miniatura-f1.json'
import { traduzirBusca, traduzirVitrine, traduzirProduto, traduzirCard, acharCards } from '../src/shopee/traduzir'

describe('traduzirBusca com amostra real', () => {
  const anuncios = traduzirBusca(busca)

  it('traduz os 60 itens', () => {
    expect(anuncios).toHaveLength(60)
  })

  it('primeiro item com todos os campos', () => {
    expect(anuncios[0]).toEqual(expect.objectContaining({
      itemId: '58207314279',
      shopId: '1762381981',
      loja: 'Importadora Zenit',
      preco: 17.9,
      vendas30d: 196,
      vendasTotal: 1596,
      criadoEm: new Date(1774034515 * 1000),
      likes: 2545,
      reviews: 965,
      nota: 4.923316062176166,
      selos: { ads: null, indicado: true, lojaOficial: false },
    }))
    expect(anuncios[0].titulo).toContain('Miniatura F1 12cm')
  })

  it('segundo item', () => {
    expect(anuncios[1]).toEqual(expect.objectContaining({
      itemId: '58211960177', preco: 19.7, vendas30d: 1345, vendasTotal: 2572, reviews: 1459,
    }))
  })

  it('selos de vendedor', () => {
    expect(anuncios.filter(a => a.selos.indicado)).toHaveLength(34)
    const oficial = anuncios.find(a => a.itemId === '52562334012')!
    expect(oficial.selos).toEqual({ ads: null, indicado: false, lojaOficial: true })
  })
})

describe('traduzirCard', () => {
  it('ads true quando o tracking diz is_ads', () => {
    const item = { ...busca.items[0], search_item_tracking: JSON.stringify({ is_ads: true }) }
    expect(traduzirCard(item)!.selos.ads).toBe(true)
  })
  it('sem preço não vira anúncio', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.item_card_display_price = null
    expect(traduzirCard(item)).toBeNull()
  })
  it('campo ausente vira null', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.item_card_display_sold_count = null
    item.item_data.ctime = undefined
    const a = traduzirCard(item)!
    expect(a.vendas30d).toBeNull()
    expect(a.vendasTotal).toBeNull()
    expect(a.criadoEm).toBeNull()
  })
  it('itemid com aspas não vira anúncio', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.itemid = '1"]'
    expect(traduzirCard(item)).toBeNull()
  })
  it('shopid não numérico não vira anúncio', () => {
    const item = structuredClone(busca.items[0]) as any
    item.item_data.shopid = 'abc'
    expect(traduzirCard(item)).toBeNull()
  })
})

describe('formato inesperado', () => {
  it('devolve lista vazia e avisa no console', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirBusca({})).toEqual([])
    expect(traduzirBusca(null)).toEqual([])
    expect(aviso.mock.calls[0][0]).toContain('[FCS SPY]')
    aviso.mockRestore()
  })
})

describe('traduzirVitrine com amostra real', () => {
  it('traduz os 8 cards', () => {
    const anuncios = traduzirVitrine(vitrine)
    expect(anuncios).toHaveLength(8)
    expect(anuncios[0]).toEqual(expect.objectContaining({ itemId: '58213016622', vendas30d: 8, preco: 23.9 }))
  })
})

describe('traduzirProduto com amostra real', () => {
  it('lê as 5 variações com preço', () => {
    const v = traduzirProduto(produto)!
    expect(v.itemId).toBe('58207314279')
    expect(v.opcoes).toHaveLength(5)
    expect(v.opcoes).toContainEqual({ nome: 'Vermelho', preco: 29.9 })
    expect(v.opcoes).toContainEqual({ nome: 'Kit com 4', preco: 54.9 })
  })
  it('formato inesperado devolve null', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(traduzirProduto({ data: {} })).toBeNull()
    aviso.mockRestore()
  })
  it('item_id não numérico devolve null', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const item = structuredClone(produto) as any
    item.data.item.item_id = 'x'
    expect(traduzirProduto(item)).toBeNull()
    expect(aviso.mock.calls[0][0]).toContain('[FCS SPY]')
    aviso.mockRestore()
  })
})

describe('acharCards', () => {
  it('acha os mesmos cards da busca e da vitrine', () => {
    expect(acharCards(busca).map(a => a.itemId)).toEqual(traduzirBusca(busca).map(a => a.itemId))
    expect(acharCards(vitrine)).toHaveLength(8)
  })
  it('acha card aninhado em qualquer formato de resposta', () => {
    const resposta = { data: { sections: [{ data: { item: [busca.items[0]] } }, { outra: busca.items[1] }] } }
    expect(acharCards(resposta).map(a => a.itemId)).toEqual(['58207314279', '58211960177'])
  })
  it('array enorme de primitivos termina', () => {
    const r = acharCards({ a: new Array(100000).fill(1), b: busca.items[0] })
    expect([0, 1]).toContain(r.length)
    expect(acharCards(busca)).toHaveLength(60)
  })
  it('mesmo produto duas vezes fica uma só', () => {
    expect(acharCards({ a: [busca.items[0], busca.items[0]] })).toHaveLength(1)
  })
  it('para de descer além da profundidade máxima', () => {
    let fundo: unknown = busca.items[0]
    for (let i = 0; i < 20; i++) fundo = { x: fundo }
    expect(acharCards(fundo)).toEqual([])
  })
  it('lixo não quebra', () => {
    expect(acharCards(null)).toEqual([])
    expect(acharCards('texto')).toEqual([])
    expect(acharCards({ items: [null, 1, 'x', {}] })).toEqual([])
  })
})
