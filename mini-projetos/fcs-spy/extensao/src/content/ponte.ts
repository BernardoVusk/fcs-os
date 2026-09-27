import { MARCA, type MensagemEscuta, type Rota } from '../page/escuta'

const ROTAS_VALIDAS: Rota[] = ['busca', 'vitrine', 'produto']

export function ouvirEscuta(w: Window, aoReceber: (m: MensagemEscuta) => void): () => void {
  const ouvinte = (ev: MessageEvent) => {
    if (ev.source !== w) return
    const d = ev.data as Partial<MensagemEscuta> | null
    if (!d || d.marca !== MARCA || !ROTAS_VALIDAS.includes(d.rota as Rota)) return
    aoReceber(d as MensagemEscuta)
  }
  w.addEventListener('message', ouvinte)
  return () => w.removeEventListener('message', ouvinte)
}
