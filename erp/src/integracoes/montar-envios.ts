import { converterLink, type Credenciais } from "./conversor";
import type { Opcoes } from "./http";
import { lerUrlOferta, type AnuncianteAwin } from "@/dominio/ofertas/urls";
import { LIMITE_MENSAGEM, renderizarModelo } from "@/dominio/ofertas/modelos";
import {
  valoresDaOferta,
  valoresDoCupom,
  type CupomMensagem,
  type OfertaMensagem,
} from "@/dominio/ofertas/mensagem";
import type { OrigemLink } from "@/dominio/ofertas/links-afiliado";

/**
 * Um envio por grupo: link de afiliado do grupo (sub ID, clickref ou ID de rastreamento) e texto
 * renderizado. Tudo ou nada: se um grupo não tem link de afiliado, nenhum envio é montado.
 */

export type GrupoEnvio = {
  id: string;
  nome: string;
  campanha: string | null;
  tag_amazon: string | null;
};
export type OfertaEnvio = OfertaMensagem & {
  id: string;
  url_original: string;
  url_produto: string | null;
  link_colado: string | null;
  campanha: string | null;
};
export type LinkPronto = { url: string; origem: OrigemLink };
export type EnvioMontado = {
  grupo_id: string;
  texto: string;
  link_url: string | null;
  link_origem: OrigemLink | null;
};
export type ResultadoMontagem =
  | { ok: true; envios: EnvioMontado[]; links: (LinkPronto & { grupo_id: string })[] }
  | { ok: false; erro: string; grupo?: string; detalhe?: string };

function renderizar(corpo: string, valores: Parameters<typeof renderizarModelo>[1]) {
  const r = renderizarModelo(corpo, valores);
  if (r.erros.length) return { ok: false as const, erro: r.erros[0].split(":")[0] };
  if (r.ausentes.length)
    return { ok: false as const, erro: "variaveis_ausentes", detalhe: r.ausentes.join(", ") };
  if (r.texto.length > LIMITE_MENSAGEM) return { ok: false as const, erro: "mensagem_longa" };
  return { ok: true as const, texto: r.texto };
}

export async function montarEnviosOferta(
  p: {
    oferta: OfertaEnvio;
    cupom: CupomMensagem | null;
    corpo: string;
    grupos: GrupoEnvio[];
    cred: Credenciais;
    anunciantes: AnuncianteAwin[];
    linksExistentes: Map<string, LinkPronto>;
  },
  extras: { buscar?: typeof fetch; resolver?: Opcoes["resolver"] } = {},
): Promise<ResultadoMontagem> {
  if (!p.oferta.titulo?.trim()) return { ok: false, erro: "titulo_produto_obrigatorio" };
  const envios: EnvioMontado[] = [];
  const links: (LinkPronto & { grupo_id: string })[] = [];
  const lida = lerUrlOferta(p.oferta.url_produto ?? p.oferta.url_original, p.anunciantes);
  for (const g of p.grupos) {
    let link = p.oferta.link_colado
      ? { url: p.oferta.link_colado, origem: "colado" as const }
      : p.linksExistentes.get(g.id);
    if (!link) {
      if (!lida.ok) return { ok: false, erro: lida.erro, grupo: g.nome };
      const r = await converterLink(
        {
          lida: lida.lida,
          atribuicao: {
            grupoId: g.id,
            ofertaId: p.oferta.id,
            campanha: p.oferta.campanha ?? g.campanha,
            tagAmazon: g.tag_amazon,
          },
          anunciantes: p.anunciantes,
        },
        p.cred,
        extras,
      );
      if (!r.ok) return { ok: false, erro: r.erro, grupo: g.nome, detalhe: r.detalhe };
      link = { url: r.url, origem: r.origem };
      links.push({ ...link, grupo_id: g.id });
    }
    const t = renderizar(p.corpo, valoresDaOferta(p.oferta, link.url, p.cupom));
    if (!t.ok) return { ...t, grupo: g.nome };
    envios.push({ grupo_id: g.id, texto: t.texto, link_url: link.url, link_origem: link.origem });
  }
  return { ok: true, envios, links };
}

export function montarEnviosCupom(p: {
  cupom: CupomMensagem;
  corpo: string;
  grupos: GrupoEnvio[];
  link: LinkPronto | null;
}): ResultadoMontagem {
  const envios: EnvioMontado[] = [];
  for (const g of p.grupos) {
    const t = renderizar(p.corpo, valoresDoCupom(p.cupom, p.link?.url ?? null));
    if (!t.ok) return { ...t, grupo: g.nome };
    envios.push({
      grupo_id: g.id,
      texto: t.texto,
      link_url: p.link?.url ?? null,
      link_origem: p.link?.origem ?? null,
    });
  }
  return { ok: true, envios, links: [] };
}
