import { describe, it, expect, vi } from 'vitest'
import { rotaDe, instalarEscuta, MARCA } from '../src/page/escuta'

const BUSCA = 'https://shopee.com.br/api/v4/search/search_items?keyword=miniatura%20f1&limit=60'

class XHRFalso {
  responseType = ''
  responseText = ''
  response: unknown = null
  ouvintes: (() => void)[] = []
  open(_metodo: string, _url: string) {}
  addEventListener(_tipo: string, f: () => void) { this.ouvintes.push(f) }
}

function janelaFalsa(corpo: string) {
  const postMessage = vi.fn()
  // Subclasse nova por teste: instalarEscuta troca o open do protótipo.
  class XHRDoTeste extends XHRFalso {}
  const w = {
    postMessage,
    location: { origin: 'https://shopee.com.br' },
    fetch: vi.fn(async () => new Response(corpo)),
    XMLHttpRequest: XHRDoTeste,
  }
  instalarEscuta(w as unknown as Parameters<typeof instalarEscuta>[0])
  return { w: w as unknown as { fetch: typeof fetch; XMLHttpRequest: typeof XHRFalso }, postMessage }
}

describe('rotaDe', () => {
  it('reconhece as três rotas', () => {
    expect(rotaDe(BUSCA)).toBe('busca')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/hot_sales/get_item_cards?item_id=1')).toBe('vitrine')
    expect(rotaDe('https://shopee.com.br/api/v4/pdp/get_pc?item_id=1&shop_id=2')).toBe('produto')
  })
  it('ignora o resto', () => {
    expect(rotaDe('https://shopee.com.br/api/v4/web/subcart')).toBeNull()
  })
})

describe('instalarEscuta: fetch', () => {
  it('publica o JSON da busca e devolve a resposta intacta', async () => {
    const { w, postMessage } = janelaFalsa('{"items":[]}')
    const r = await w.fetch(BUSCA)
    expect(await r.json()).toEqual({ items: [] })
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'busca', url: BUSCA, corpo: { items: [] } },
      'https://shopee.com.br',
    )
  })
  it('não publica rota que não interessa', async () => {
    const { w, postMessage } = janelaFalsa('{}')
    await w.fetch('https://shopee.com.br/api/v4/web/subcart')
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
    x.responseText = '{"items":[1]}'
    x.ouvintes.forEach(f => f())
    expect(postMessage).toHaveBeenCalledWith(
      { marca: MARCA, rota: 'busca', url: BUSCA, corpo: { items: [1] } },
      'https://shopee.com.br',
    )
  })
  it('publica resposta json no load', () => {
    const { w, postMessage } = janelaFalsa('{}')
    const x = new w.XMLHttpRequest()
    x.open('GET', BUSCA)
    x.responseType = 'json'
    x.response = { items: [2] }
    x.ouvintes.forEach(f => f())
    expect(postMessage.mock.calls[0][0].corpo).toEqual({ items: [2] })
  })
})
