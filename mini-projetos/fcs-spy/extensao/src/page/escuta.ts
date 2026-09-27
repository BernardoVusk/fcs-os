// Roda no contexto da página (world MAIN). Só observa respostas que a
// Shopee já recebeu. Nunca altera, atrasa ou refaz requisição.

export const MARCA = 'fcs-spy'
export type Rota = 'busca' | 'vitrine' | 'produto'
export type MensagemEscuta = { marca: typeof MARCA; rota: Rota; url: string; corpo: unknown }

const ROTAS: [string, Rota][] = [
  ['/api/v4/search/search_items', 'busca'],
  ['/api/v4/pdp/hot_sales/get_item_cards', 'vitrine'],
  ['/api/v4/pdp/get_pc', 'produto'],
]

export function rotaDe(url: string): Rota | null {
  for (const [trecho, rota] of ROTAS) if (url.includes(trecho)) return rota
  return null
}

type JanelaEscutavel = {
  fetch: typeof fetch
  postMessage: (msg: unknown, origem: string) => void
  location: { origin: string }
  XMLHttpRequest: typeof XMLHttpRequest
}

export function instalarEscuta(w: JanelaEscutavel): void {
  const publicar = (rota: Rota, url: string, corpo: unknown) => {
    const msg: MensagemEscuta = { marca: MARCA, rota, url, corpo }
    w.postMessage(msg, w.location.origin)
  }
  const publicarTexto = (rota: Rota, url: string, texto: string) => {
    try {
      publicar(rota, url, JSON.parse(texto))
    } catch (e) {
      console.warn('[FCS SPY] resposta ilegível', rota, e)
    }
  }

  const fetchOriginal = w.fetch
  w.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const resposta = await fetchOriginal.apply(w, args)
    try {
      const entrada = args[0]
      const url = resposta.url || (typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url)
      const rota = rotaDe(url)
      if (rota) resposta.clone().text().then(t => publicarTexto(rota, url, t), () => {})
    } catch (e) {
      console.warn('[FCS SPY] escuta fetch', e)
    }
    return resposta
  }

  const proto = w.XMLHttpRequest.prototype
  const openOriginal = proto.open as (...a: unknown[]) => void
  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    try {
      const url = String(args[1])
      const rota = rotaDe(url)
      if (rota) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === 'json') publicar(rota, url, this.response)
            else if (this.responseType === '' || this.responseType === 'text') publicarTexto(rota, url, this.responseText)
          } catch (e) {
            console.warn('[FCS SPY] escuta xhr', e)
          }
        })
      }
    } catch (e) {
      console.warn('[FCS SPY] escuta xhr', e)
    }
    return openOriginal.apply(this, args)
  } as typeof proto.open
}
