import type { TipoVendedor } from './rotas'
import type { Indicadores, OrigemVendas, ProdutoVendedor, Campanha, Afiliados, FerramentaMarketing } from './tipos'
import { traduzirIndicadores, traduzirOrigens, traduzirProdutos, traduzirCampanhas, traduzirAfiliados, traduzirMarketing, ferramentaDaUrl } from './traduzir'
import { areaLocal, type Area } from '../dados/area'

export type Periodo = { inicio: number | null; fim: number | null; tipo: string | null }
export type Coleta<T> = { lidoEm: number; periodo: Periodo; dados: T }
export type Coletas = {
  indicadores?: Coleta<Indicadores>
  origens?: Coleta<OrigemVendas>
  produtos?: Coleta<ProdutoVendedor[]>
  campanhas?: Coleta<Campanha[]>
  afiliados?: Coleta<Afiliados>
  marketing?: Record<string, Coleta<FerramentaMarketing>>
}

export const CHAVE_VENDEDOR = 'vendedor'

const inteiroOuNull = (v: string | null) => (v !== null && /^\d+$/.test(v) ? Number(v) : null)

export function periodoDaUrl(url: string): Periodo {
  try {
    const u = new URL(url, 'https://seller.shopee.com.br')
    return { inicio: inteiroOuNull(u.searchParams.get('start_time')), fim: inteiroOuNull(u.searchParams.get('end_time')), tipo: u.searchParams.get('period') }
  } catch {
    return { inicio: null, fim: null, tipo: null }
  }
}

export function mesmoPeriodo(a: Periodo, b: Periodo): boolean {
  return a.inicio === b.inicio && a.fim === b.fim && a.tipo === b.tipo
}

// Cada página da Performance do Produto traz 10 itens: juntamos as páginas do mesmo período.
export function juntarProdutos(antes: Coleta<ProdutoVendedor[]> | undefined, nova: Coleta<ProdutoVendedor[]>): Coleta<ProdutoVendedor[]> {
  if (!antes || !mesmoPeriodo(antes.periodo, nova.periodo)) return nova
  const porId = new Map(antes.dados.map(p => [p.itemId, p]))
  for (const p of nova.dados) porId.set(p.itemId, p)
  return { ...nova, dados: [...porId.values()] }
}

export async function lerColetas(area: Area = areaLocal()): Promise<Coletas> {
  const v = (await area.get(CHAVE_VENDEDOR))[CHAVE_VENDEDOR]
  return v && typeof v === 'object' ? (v as Coletas) : {}
}

async function gravar(tipo: TipoVendedor, url: string, json: unknown, agora: number, area: Area = areaLocal()): Promise<boolean> {
  const periodo = periodoDaUrl(url)
  const atual = await lerColetas(area)
  const nova = <T>(dados: T): Coleta<T> => ({ lidoEm: agora, periodo, dados })
  switch (tipo) {
    case 'indicadores': { const d = traduzirIndicadores(json); if (!d) return false; atual.indicadores = nova(d); break }
    case 'origens': { const d = traduzirOrigens(json); if (!d) return false; atual.origens = nova(d); break }
    case 'produtos': { const d = traduzirProdutos(json); if (!d) return false; atual.produtos = juntarProdutos(atual.produtos, nova(d)); break }
    case 'campanhas': { const d = traduzirCampanhas(json); if (!d) return false; atual.campanhas = nova(d); break }
    case 'afiliados': { const d = traduzirAfiliados(json); if (!d) return false; atual.afiliados = nova(d); break }
    case 'marketing': {
      const ferramenta = ferramentaDaUrl(url)
      const d = ferramenta ? traduzirMarketing(json, ferramenta) : null
      if (!ferramenta || !d) return false
      atual.marketing = { ...(atual.marketing ?? {}), [ferramenta]: nova(d) }
      break
    }
  }
  await area.set({ [CHAVE_VENDEDOR]: atual })
  return true
}

// Respostas chegam ao mesmo tempo (visão geral): gravar em fila evita que uma leitura antiga apague a outra.
let fila: Promise<unknown> = Promise.resolve()
export function gravarColeta(tipo: TipoVendedor, url: string, json: unknown, agora: number, area: Area = areaLocal()): Promise<boolean> {
  const r = fila.then(() => gravar(tipo, url, json, agora, area))
  fila = r.catch(() => {})
  return r
}
