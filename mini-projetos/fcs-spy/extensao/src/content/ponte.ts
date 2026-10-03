import { MARCA, type MensagemEscuta } from '../page/escuta'

export type FiltroEscuta = { marca: string; rotas: string[] }
const FILTRO_COMPRADOR: FiltroEscuta = { marca: MARCA, rotas: ['produto', 'cards'] }

export function ouvirEscuta(w: Window, aoReceber: (m: MensagemEscuta) => void, filtro: FiltroEscuta = FILTRO_COMPRADOR): () => void {
  const ouvinte = (ev: MessageEvent) => {
    if (ev.source !== w) return
    const d = ev.data as Partial<MensagemEscuta> | null
    if (!d || d.marca !== filtro.marca || typeof d.rota !== 'string' || !filtro.rotas.includes(d.rota)) return
    aoReceber(d as MensagemEscuta)
  }
  w.addEventListener('message', ouvinte)
  return () => w.removeEventListener('message', ouvinte)
}
