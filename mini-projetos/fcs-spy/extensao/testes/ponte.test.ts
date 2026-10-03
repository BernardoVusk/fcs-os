// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { ouvirEscuta } from '../src/content/ponte'

const enviar = (data: unknown, source: Window | null = window) =>
  window.dispatchEvent(new MessageEvent('message', { data, source }))

describe('ouvirEscuta', () => {
  it('entrega mensagem válida da escuta', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido)
    const msg = { marca: 'fcs-spy', rota: 'cards', url: 'u', corpo: { items: [] } }
    enviar(msg)
    expect(recebido).toHaveBeenCalledWith(msg)
    parar()
  })
  it('ignora outra marca, rota inválida e outra janela', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido)
    enviar({ marca: 'outra', rota: 'cards' })
    enviar({ marca: 'fcs-spy', rota: 'carrinho' })
    enviar({ marca: 'fcs-spy', rota: 'busca' })
    enviar(null)
    enviar({ marca: 'fcs-spy', rota: 'cards', url: 'u', corpo: {} }, null)
    expect(recebido).not.toHaveBeenCalled()
    parar()
  })
  it('parar remove o ouvinte', () => {
    const recebido = vi.fn()
    ouvirEscuta(window, recebido)()
    enviar({ marca: 'fcs-spy', rota: 'cards', url: 'u', corpo: {} })
    expect(recebido).not.toHaveBeenCalled()
  })
  it('filtro do vendedor aceita a marca e os tipos dele', () => {
    const recebido = vi.fn()
    const m = { marca: 'fcs-spy-vendedor', rota: 'produtos', url: 'u', corpo: {} }
    const parar = ouvirEscuta(window, recebido, { marca: 'fcs-spy-vendedor', rotas: ['produtos'] })
    enviar(m)
    enviar({ marca: 'fcs-spy', rota: 'cards', url: 'u', corpo: {} })
    enviar({ ...m, rota: 'indicadores' })
    enviar({ ...m, rota: ['produtos'] as unknown as string })
    expect(recebido).toHaveBeenCalledOnce()
    expect(recebido).toHaveBeenCalledWith(m)
    parar()
  })
  it('filtro do comprador não recebe mensagem do vendedor', () => {
    const recebido = vi.fn()
    const parar = ouvirEscuta(window, recebido)
    enviar({ marca: 'fcs-spy-vendedor', rota: 'produtos', url: 'u', corpo: {} })
    expect(recebido).not.toHaveBeenCalled()
    parar()
  })
})
