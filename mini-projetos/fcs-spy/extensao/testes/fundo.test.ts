import { describe, it, expect, vi } from 'vitest'
import { instalarFundo, MENSAGEM_ABRIR_OPCOES } from '../src/fundo/fundo'

function apiFalsa() {
  let aoClicar: () => void = () => {}
  let aoReceber: (m: unknown) => void = () => {}
  const openOptionsPage = vi.fn(async () => {})
  const api = {
    action: { onClicked: { addListener: (f: () => void) => { aoClicar = f } } },
    runtime: { openOptionsPage, onMessage: { addListener: (f: (m: unknown) => void) => { aoReceber = f } } },
  }
  instalarFundo(api)
  return { clicarIcone: () => aoClicar(), receber: (m: unknown) => aoReceber(m), openOptionsPage }
}

describe('instalarFundo', () => {
  it('clicar no ícone abre as configurações', () => {
    const f = apiFalsa()
    f.clicarIcone()
    expect(f.openOptionsPage).toHaveBeenCalledOnce()
  })
  it('mensagem do botão Custos abre as configurações', () => {
    const f = apiFalsa()
    f.receber({ tipo: MENSAGEM_ABRIR_OPCOES })
    expect(f.openOptionsPage).toHaveBeenCalledOnce()
  })
  it('outras mensagens são ignoradas', () => {
    const f = apiFalsa()
    f.receber({ tipo: 'outra' })
    f.receber(null)
    f.receber('fcs-spy:abrir-opcoes')
    expect(f.openOptionsPage).not.toHaveBeenCalled()
  })
})
