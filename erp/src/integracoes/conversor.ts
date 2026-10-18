import { resolverLinkCurto, type Opcoes } from "./http";
import { gerarLinkShopee, type CredShopee } from "./shopee";
import { gerarLinkAwin, type CredAwin } from "./awin";
import { HOSTS_PLATAFORMA } from "@/dominio/ofertas/plataformas";
import { lerUrlOferta, type AnuncianteAwin, type UrlLida } from "@/dominio/ofertas/urls";
import {
  clickrefsAwin,
  linkAmazon,
  linkColadoAceito,
  subIdsShopee,
  tagAmazonValida,
  type Atribuicao,
  type OrigemLink,
} from "@/dominio/ofertas/links-afiliado";

/**
 * Conversão de um link de produto em link de afiliado nosso. Nunca devolve o link de origem:
 * sem conversão possível e sem link colado, o resultado é erro com motivo.
 */

export type Credenciais = {
  shopee?: CredShopee | null;
  awin?: CredAwin | null;
  amazon?: { tag: string } | null;
};

export type ResultadoConversao =
  { ok: true; url: string; origem: OrigemLink } | { ok: false; erro: string; detalhe?: string };

type Extras = { buscar?: typeof fetch; resolver?: Opcoes["resolver"] };

/** Link curto (s.shopee, amzn.to, tidd.ly) resolvido até a página do produto, já lida. */
export async function resolverParaProduto(
  lida: UrlLida,
  anunciantes: AnuncianteAwin[] = [],
  extras: Extras = {},
): Promise<{ ok: true; lida: UrlLida } | { ok: false; erro: string }> {
  let alvo = lida;
  if (lida.linkCurto || (lida.plataforma === "awin" && lida.host.endsWith("tidd.ly"))) {
    const hosts = [...HOSTS_PLATAFORMA[lida.plataforma], ...anunciantes.flatMap((a) => a.dominios)];
    const r = await resolverLinkCurto(lida.url, { hosts, ...extras });
    if (!r.ok) return r;
    const relida = lerUrlOferta(r.final, anunciantes);
    if (!relida.ok) return relida;
    alvo = relida.lida;
  }
  // Link de rastreio da Awin (awin1.com/cread.php) leva o destino em ued e o anunciante em awinmid.
  if (alvo.plataforma === "awin" && alvo.host.endsWith("awin1.com")) {
    const u = new URL(alvo.url);
    const destino = u.searchParams.get("ued");
    const mid = Number(u.searchParams.get("awinmid"));
    if (!destino || !Number.isInteger(mid)) return { ok: false, erro: "produto_nao_identificado" };
    const relida = lerUrlOferta(destino, anunciantes);
    if (!relida.ok) return relida;
    alvo = { ...relida.lida, ids: { ...relida.lida.ids, anuncianteAwin: mid } };
  }
  return { ok: true, lida: alvo };
}

export async function converterLink(
  pedido: {
    lida: UrlLida;
    atribuicao: Atribuicao & { tagAmazon?: string | null };
    linkColado?: string | null;
    anunciantes?: AnuncianteAwin[];
  },
  cred: Credenciais,
  extras: Extras = {},
): Promise<ResultadoConversao> {
  const { lida, atribuicao } = pedido;
  const anunciantes = pedido.anunciantes ?? [];
  const colado = pedido.linkColado?.trim();
  if (colado) {
    return linkColadoAceito(
      lida.plataforma,
      colado,
      anunciantes.flatMap((a) => a.dominios),
    )
      ? { ok: true, url: colado, origem: "colado" }
      : { ok: false, erro: "link_colado_invalido" };
  }
  if (lida.plataforma === "mercado_livre") return { ok: false, erro: "link_manual_obrigatorio" };

  const resolvido = await resolverParaProduto(lida, anunciantes, extras);
  if (!resolvido.ok) return resolvido;
  const alvo = resolvido.lida;

  if (alvo.plataforma === "shopee") {
    if (!cred.shopee) return { ok: false, erro: "conversao_indisponivel" };
    if (!alvo.ids.itemId) return { ok: false, erro: "produto_nao_identificado" };
    const r = await gerarLinkShopee(cred.shopee, alvo.url, subIdsShopee(atribuicao), extras);
    return r.ok ? { ok: true, url: r.dados, origem: "api" } : r;
  }
  if (alvo.plataforma === "amazon") {
    const tag = atribuicao.tagAmazon?.trim() || cred.amazon?.tag;
    if (!tag || !tagAmazonValida(tag)) return { ok: false, erro: "conversao_indisponivel" };
    if (!alvo.ids.asin) return { ok: false, erro: "produto_nao_identificado" };
    return { ok: true, url: linkAmazon(alvo.ids.asin, tag), origem: "tag" };
  }
  if (alvo.plataforma === "awin") {
    if (!cred.awin) return { ok: false, erro: "conversao_indisponivel" };
    const anunciante = alvo.ids.anuncianteAwin;
    if (!anunciante) return { ok: false, erro: "anunciante_desconhecido" };
    const r = await gerarLinkAwin(
      cred.awin,
      anunciante,
      alvo.url,
      clickrefsAwin(atribuicao),
      extras,
    );
    return r.ok ? { ok: true, url: r.dados.curta ?? r.dados.url, origem: "api" } : r;
  }
  return { ok: false, erro: "link_manual_obrigatorio" };
}
