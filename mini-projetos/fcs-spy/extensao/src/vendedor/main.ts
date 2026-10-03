import { ouvirEscuta } from '../content/ponte'
import { MARCA_VENDEDOR, TIPOS_VENDEDOR, mensagemValida, type TipoVendedor } from './rotas'
import { gravarColeta, lerColetas, CHAVE_VENDEDOR } from './coleta'
import { montarPainelVendedor, montarBotaoVendedor, ATRIBUTO_VENDEDOR } from './painel-vendedor'
import { areaLocal } from '../dados/area'

function iniciar(): void {
  const area = areaLocal()
  let aberto = false
  let geracao = 0

  // Logo no início, para não perder a primeira resposta da página.
  ouvirEscuta(window, msg => {
    if (!mensagemValida(msg)) return
    gravarColeta(msg.rota as TipoVendedor, msg.url, msg.corpo, Date.now(), area)
      .catch(e => console.warn('[FCS SPY] coleta', e))
  }, { marca: MARCA_VENDEDOR, rotas: TIPOS_VENDEDOR })

  async function desenhar() {
    const minha = ++geracao
    document.querySelector(`[${ATRIBUTO_VENDEDOR}]`)?.remove()
    if (!aberto) return
    const coletas = await lerColetas(area)
    if (minha !== geracao || !aberto) return
    document.querySelector(`[${ATRIBUTO_VENDEDOR}]`)?.remove()
    document.body.append(montarPainelVendedor(coletas, Date.now()))
  }

  function montarBotao() {
    if (!document.body) return
    document.body.append(montarBotaoVendedor(() => {
      aberto = !aberto
      desenhar().catch(e => console.warn('[FCS SPY] painel vendedor', e))
    }))
  }

  try {
    chrome.storage.onChanged.addListener((mudancas, nome) => {
      if (nome === 'local' && mudancas[CHAVE_VENDEDOR] && aberto) desenhar().catch(e => console.warn('[FCS SPY] painel vendedor', e))
    })
  } catch (e) {
    console.warn('[FCS SPY] painel vendedor', e)
  }

  if (document.body) montarBotao()
  else document.addEventListener('DOMContentLoaded', montarBotao, { once: true })
}

iniciar()
