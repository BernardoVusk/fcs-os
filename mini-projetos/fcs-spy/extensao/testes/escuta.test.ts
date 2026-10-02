import { describe, it, expect, vi } from 'vitest'
import { rotaDe, temCards, instalarEscuta, MARCA } from '../src/page/escuta'

const BUSCA = 'https://shopee.com.br/api/v4/search/search_items?keyword=miniatura%20f1&limit=60'

class XHRFalso {
  responseType = ''
  responseText = ''
  response: unknown = null
  ouvintes: (() => void)[] = []
  open(_metodo: string, _url: string) {}
  addEventListener(_tipo: string, f: () => void) { this.ouvintes.push(f) }
}

function janelaFalsa(corpo: string, tipo = 'application/json') {
  const postMessage = vi.fn()
  // Subclasse nova por teste: instalarEscuta troca o open do protótipo.
  class XHRDoTeste extends XHRFalso {}
  const w = {
    postMessage,
    location: { origin: 'https://shopee.com.br' },
    fetch: vi.fn(async () => new Response(corpo, { headers: { 'content-type': tipo } })),
    XMLHttpRequest: XHRDoTeste,
  }
  instalarEscuta(w as unknown as Parameters<typeof instalarEscuta>[0])
  return { w: w as unknown as { fetch: typeof fetch; XMLHttpRequest: typeof XHRFalso }, postMessage }
}

describe('rotaDe', () => {
  it('produto continua com rota própria', () => {
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/get_pc?item_id=1&shop_id=2')).toBe('produto')
  })
  it('qualquer outra API vira candidata a cards', () => {
    expect(rotaDe(BUSCA)).toBe('cards')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/hot_sales/get_item_cards?item_id=1')).toBe('cards')
    expect(rotaDe('https://shopee.com.br/api/v4/homepage/get_daily_discover?limit=60')).toBe('cards')
  })
  it('fora de /api/ não interessa', () => {
    expect(rotaDe('https://shopee.com.br/search?keyword=x')).toBeNull()
    expect(rotaDe('https://deo.shopeemobile.com/x.js')).toBeNull()
  })
})

describe('temCards', () => {
  it('só textos com o marcador de card', () => {
    expect(temCards('{"items":[{"item_data":{"item_card_display_sold_count":{}}}]}')).toBe(true)
    expect(temCards('{"subcart":1}')).toBe(false)
  })
})

describe('instalarEscuta: fetch', () => {
  it('publica o JSON da busca e devolve a resposta intacta', async () => {
    const { w, postMessage } = janelaFalsa('{"items":[{"item_card_display_sold_count":{}}]}')
    const r = await w.fetch(BUSCA)
    expect(await r.json()).toEqual({ items: [{ item_card_display_sold_count: {} }] })
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'cards', url: BUSCA, corpo: { items: [{ item_card_display_sold_count: {} }] } },
      'https://shopee.com.br',
    )
  })
  it('não publica rota que não interessa', async () => {
    const { w, postMessage } = janelaFalsa('{}')
    await w.fetch('https://shopee.com.br/search?keyword=x')
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
  it('API sem marcador de card não é publicada', async () => {
    const { w, postMessage } = janelaFalsa('{"subcart":1}')
    await w.fetch('https://shopee.com.br/api/v4/web/subcart')
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
  it('resposta text/html com o marcador não é publicada', async () => {
    const { w, postMessage } = janelaFalsa('{"item_card_display_sold_count":{}}', 'text/html')
    await w.fetch(BUSCA)
    await new Promise(r => setTimeout(r, 10))
    expect(postMessage).not.toHaveBeenCalled()
  })
  it('JSON inválido não quebra nada', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { w, postMessage } = janelaFalsa('<html>')
    const r = await w.fetch(BUSCA)
    expect(await r.text()).toBe('<html>')
    await new Promise(res => setTimeout(res, 10))
    expect(postMessage).not.toHaveBeenCalled()
    aviso.mockRestore()
  })
})

describe('instalarEscuta: XMLHttpRequest', () => {
  it('publica resposta de texto no load', () => {
    const { w, postMessage } = janelaFalsa('{}')
    const x = new w.XMLHttpRequest()
    x.open('GET', BUSCA)
    x.responseText = '{"items":[{"item_card_display_sold_count":{}}]}'
    x.ouvintes.forEach(f => f())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'cards', url: BUSCA, corpo: { items: [{ item_card_display_sold_count: {} }] } },
      'https://shopee.com.br',
    )
  })
  it('publica resposta json no load', () => {
    const { w, postMessage } = janelaFalsa('{}')
    const x = new w.XMLHttpRequest()
    x.open('GET', BUSCA)
    x.responseType = 'json'
    x.response = { items: [{ item_card_display_sold_count: {} }] }
    x.ouvintes.forEach(f => f())
    expect(postMessage.mock.calls[0][0].corpo).toEqual({ items: [{ item_card_display_sold_count: {} }] })
  })
})
