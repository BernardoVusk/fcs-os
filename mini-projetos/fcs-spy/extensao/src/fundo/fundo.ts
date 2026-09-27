// Service worker da extensão. Content script não pode abrir a tela de opções,
// então o ícone e o botão Custos do painel passam por aqui.

export const MENSAGEM_ABRIR_OPCOES = 'fcs-spy:abrir-opcoes'

type ApiFundo = {
  action: { onClicked: { addListener(f: () => void): void } }
  runtime: {
    openOptionsPage(): Promise<void> | void
    onMessage: { addListener(f: (m: unknown) => void): void }
  }
}

export function instalarFundo(api: ApiFundo): void {
  const abrirOpcoes = () => {
    Promise.resolve(api.runtime.openOptionsPage()).catch(e => console.warn('[FCS SPY] opções', e))
  }
  api.action.onClicked.addListener(abrirOpcoes)
  api.runtime.onMessage.addListener(m => {
    if ((m as { tipo?: unknown } | null)?.tipo === MENSAGEM_ABRIR_OPCOES) abrirOpcoes()
  })
}
