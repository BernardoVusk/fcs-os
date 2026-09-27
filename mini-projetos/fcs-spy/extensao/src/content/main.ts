import { ouvirEscuta } from './ponte'
import type { MensagemEscuta } from '../page/escuta'
import { traduzirBusca, traduzirVitrine, traduzirProduto } from '../shopee/traduzir'
import { idDaUrl } from '../shopee/url'
import { calcularMetricas } from '../nucleo/metricas'
import type { Anuncio, Config, Tendencia, Variacoes } from '../nucleo/tipos'
import { lerConfig, CONFIG_PADRAO, CHAVE_CONFIG } from '../dados/config'
import { areaLocal } from '../dados/area'
import { gravarLeituras, leituraDe, ultimaLeitura } from '../dados/historico'
import { montarCard, anexarCard, mapaDeLinks, chaveDoProduto, containerDoCard, ATRIBUTO_CARD, type EstadoHistorico } from '../ui/card'
import { ordenar, reordenarNaPagina, type Criterio } from '../ui/ordenar'
import { montarBarra, aplicarLigado, instalarEstiloGlobal, sincronizarBarra } from '../ui/barra'
import { montarPainel, ATRIBUTO_PAINEL } from '../ui/painel'
import { licencaValida } from '../licenca/licenca'
import { lembrar } from './vistos'
import { MENSAGEM_ABRIR_OPCOES } from '../fundo/fundo'

type Visto = { anuncio: Anuncio; historico: EstadoHistorico }

async function iniciar(): Promise<void> {
  if (!(await licencaValida())) return

  const area = areaLocal()
  let config: Config = CONFIG_PADRAO
  let configCarregada = false
  const vistos = new Map<string, Visto>()
  const desenhados = new Map<string, HTMLElement>()
  let variacoes: Variacoes | null = null
  let urlDoPainel: string | null = null
  let desenhandoPainel = false
  let timerDesenho: ReturnType<typeof setTimeout> | null = null
  let inicioPendente = 0

  // Logo no início, antes de ler a configuração, para não perder a primeira resposta da busca.
  ouvirEscuta(window, msg => {
    receber(msg).catch(e => console.warn('[FCS SPY] resposta', e))
  })

  config = await lerConfig(area)
  configCarregada = true
  agendar() // pega o que já chegou em vistos enquanto a configuração ainda carregava
  chrome.storage.onChanged.addListener((mudancas, nome) => {
    if (nome !== 'local' || !mudancas[CHAVE_CONFIG]) return
    lerConfig(area)
      .then(c => {
        config = c
        redesenharTudo()
      })
      .catch(e => console.warn('[FCS SPY] configuração', e))
  })

  async function receber(msg: MensagemEscuta) {
    if (msg.rota === 'produto') {
      variacoes = traduzirProduto(msg.corpo)
      urlDoPainel = null
      agendar()
      return
    }
    const anuncios = msg.rota === 'busca' ? traduzirBusca(msg.corpo) : traduzirVitrine(msg.corpo)
    if (!anuncios.length) return
    let tendencias: Map<string, Tendencia | null> | null = null
    try {
      tendencias = await gravarLeituras(anuncios.map(a => leituraDe(a, new Date())), area)
    } catch (e) {
      console.warn('[FCS SPY] histórico indisponível', e)
    }
    for (const a of anuncios) {
      const removidas = lembrar(vistos, a.itemId, { anuncio: a, historico: tendencias ? (tendencias.get(a.itemId) ?? null) : 'indisponivel' })
      desenhados.get(a.itemId)?.remove()
      desenhados.delete(a.itemId)
      for (const k of removidas) {
        desenhados.get(k)?.remove()
        desenhados.delete(k)
      }
    }
    agendar()
  }

  function agendar() {
    const agora = Date.now()
    if (timerDesenho === null) inicioPendente = agora // primeira chamada da janela pendente
    else if (agora - inicioPendente < 1000) clearTimeout(timerDesenho) // ainda no teto: reinicia os 250 ms
    else return // teto de 1 s: deixa o timer pendente disparar em vez de esticar de novo
    timerDesenho = setTimeout(() => {
      timerDesenho = null
      try {
        desenhar()
      } catch (e) {
        console.warn('[FCS SPY] desenho', e)
      }
    }, 250)
  }

  function redesenharTudo() {
    document.querySelectorAll(`[${ATRIBUTO_CARD}]`).forEach(e => e.remove())
    document.querySelector(`[${ATRIBUTO_PAINEL}]`)?.remove()
    desenhados.clear()
    urlDoPainel = null
    agendar()
  }

  function desenhar() {
    if (!configCarregada || !document.body) return
    instalarEstiloGlobal(document)
    const hoje = new Date()
    const links = mapaDeLinks(document) // um querySelectorAll só por ciclo, não um por item
    for (const { anuncio, historico } of vistos.values()) {
      if (desenhados.get(anuncio.itemId)?.isConnected) continue
      const link = links.get(chaveDoProduto(anuncio))
      if (!link) continue
      const container = containerDoCard(link)
      if (!container || container.querySelector(`[${ATRIBUTO_CARD}="${anuncio.itemId}"]`)) continue
      const card = montarCard({ anuncio, metricas: calcularMetricas(anuncio, config, hoje), historico })
      anexarCard(container, card)
      desenhados.set(anuncio.itemId, card)
    }
    sincronizarBarra(document, () => montarBarra(ordenarPagina, ligado => aplicarLigado(document, ligado)))
    desenharPainel().catch(e => console.warn('[FCS SPY] painel', e))
  }

  function ordenarPagina(c: Criterio) {
    const links = mapaDeLinks(document)
    const presentes = [...vistos.values()].map(v => v.anuncio).filter(a => links.has(chaveDoProduto(a)))
    const containers = ordenar(presentes, c)
      .map(a => containerDoCard(links.get(chaveDoProduto(a))!))
      .filter((x): x is HTMLElement => x !== null)
    reordenarNaPagina(containers)
  }

  async function desenharPainel() {
    const id = idDaUrl(location.href)
    const atual = document.querySelector(`[${ATRIBUTO_PAINEL}]`)
    if (!id) {
      atual?.remove()
      urlDoPainel = null
      return
    }
    if ((atual && urlDoPainel === location.href) || desenhandoPainel) return
    desenhandoPainel = true
    urlDoPainel = location.href
    try {
      let leitura = null
      try {
        leitura = await ultimaLeitura(id.itemId, area)
      } catch (e) {
        console.warn('[FCS SPY] histórico indisponível', e)
      }
      document.querySelector(`[${ATRIBUTO_PAINEL}]`)?.remove()
      document.body.append(montarPainel({
        config,
        preco: vistos.get(id.itemId)?.anuncio.preco ?? null,
        variacoes: variacoes?.itemId === id.itemId ? variacoes : null,
        leitura,
        aoAbrirCustos: () => {
          chrome.runtime.sendMessage({ tipo: MENSAGEM_ABRIR_OPCOES }).catch(e => console.warn('[FCS SPY] custos', e))
        },
      }))
    } finally {
      desenhandoPainel = false
    }
  }

  new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true })
}

iniciar().catch(e => console.warn('[FCS SPY]', e))
