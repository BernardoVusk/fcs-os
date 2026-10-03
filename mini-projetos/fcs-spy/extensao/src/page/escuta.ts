// Roda no contexto da página (world MAIN). Só observa respostas que a
// Shopee já recebeu. Nunca altera, atrasa ou refaz requisição.

export const MARCA = 'fcs-spy'
export type Rota = 'produto' | 'cards'
export type MensagemEscuta = { marca: string; rota: string; url: string; corpo: unknown }

const ROTA_PRODUTO = '/api/v4/pdp/get_pc'
// Marcador do formato de card de 2026: teste barato antes do JSON.parse.
const MARCADOR_CARD = '"item_card_display_sold_count"'

export function rotaDe(url: string): Rota | null {
  if (url.includes(ROTA_PRODUTO)) return 'produto'
  if (url.startsWith('/api/') || /^https:\/\/([a-z0-9-]+\.)*shopee\.com\.br\/api\//.test(url)) return 'cards'
  return null
}

export function temCards(texto: string): boolean {
  return texto.includes(MARCADOR_CARD)
}

export type Regras = {
  marca: string
  rotaDe(url: string): string | null
  exigeJson(rota: string): boolean
  aceitaTexto(rota: string, texto: string): boolean
  limparUrl?(url: string): string
}

export const REGRAS_COMPRADOR: Regras = {
  marca: MARCA,
  rotaDe,
  exigeJson: rota => rota === 'cards',
  aceitaTexto: (rota, texto) => rota !== 'cards' || temCards(texto),
}

type JanelaEscutavel = {
  fetch: typeof fetch
  postMessage: (msg: unknown, origem: string) => void
  location: { origin: string }
  XMLHttpRequest: typeof XMLHttpRequest
}

export function instalarEscuta(w: JanelaEscutavel, regras: Regras = REGRAS_COMPRADOR): void {
  const publicar = (rota: string, url: string, corpo: unknown) => {
    const msg: MensagemEscuta = { marca: regras.marca, rota, url: regras.limparUrl ? regras.limparUrl(url) : url, corpo }
    w.postMessage(msg, w.location.origin)
  }
  const publicarTexto = (rota: string, url: string, texto: string) => {
    try {
      if (!regras.aceitaTexto(rota, texto)) return
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
      const rota = regras.rotaDe(url)
      const json = (resposta.headers.get('content-type') ?? '').includes('json')
      if (rota && (!regras.exigeJson(rota) || json)) resposta.clone().text().then(t => publicarTexto(rota, url, t), () => {})
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
      const rota = regras.rotaDe(url)
      if (rota) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === 'json') {
              if (regras.aceitaTexto(rota, JSON.stringify(this.response))) publicar(rota, url, this.response)
            }
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
