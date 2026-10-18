import { HOSTS_PLATAFORMA, hostNaLista, type Plataforma } from "./plataformas";

/**
 * Montagem e conferência de links de afiliado. Atribuição por grupo usa os parâmetros oficiais
 * de cada programa (sub ID na Shopee, clickref na Awin, ID de rastreamento na Amazon); nunca um
 * redirecionador próprio, que Amazon e Mercado Livre proíbem.
 */

export type OrigemLink = "api" | "tag" | "colado";

export const ORIGEM_LINK_ROTULO: Record<OrigemLink, string> = {
  api: "Gerado pela API oficial",
  tag: "Montado com o ID de associado",
  colado: "Colado manualmente, não verificado pelo sistema",
};

/** Só letras e números, sem acento: aceito por sub ID da Shopee e clickref da Awin. */
export function codigoRastreio(texto: string, max = 40): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, max);
}

/** Código curto e estável de um registro (8 primeiros caracteres do uuid). */
export function codigoCurto(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

export type Atribuicao = {
  grupoId?: string | null;
  campanha?: string | null;
  ofertaId?: string | null;
};

/** Até 5 sub IDs na Shopee: g<grupo>, c<campanha>, o<oferta>. */
export function subIdsShopee(a: Atribuicao): string[] {
  return [
    a.grupoId ? `g${codigoCurto(a.grupoId)}` : "",
    a.campanha ? `c${codigoRastreio(a.campanha, 30)}` : "",
    a.ofertaId ? `o${codigoCurto(a.ofertaId)}` : "",
  ].filter((s) => s.length > 1);
}

/** clickref = grupo, clickref2 = oferta, clickref3 = campanha. */
export function clickrefsAwin(a: Atribuicao): Record<string, string> {
  const r: Record<string, string> = {};
  if (a.grupoId) r.clickref = `g${codigoCurto(a.grupoId)}`;
  if (a.ofertaId) r.clickref2 = `o${codigoCurto(a.ofertaId)}`;
  if (a.campanha) r.clickref3 = `c${codigoRastreio(a.campanha, 30)}`;
  return r;
}

const TAG_AMAZON = /^[a-z0-9][a-z0-9-]{1,40}-2\d$/;

export function tagAmazonValida(tag: string): boolean {
  return TAG_AMAZON.test(tag);
}

/** Link canônico da Amazon com a tag (ID de associado ou de rastreamento do grupo). */
export function linkAmazon(asin: string, tag: string): string {
  if (!/^[A-Z0-9]{10}$/.test(asin)) throw new Error("asin_invalido");
  if (!tagAmazonValida(tag)) throw new Error("tag_invalida");
  return `https://www.amazon.com.br/dp/${asin}?tag=${tag}`;
}

/** Link colado precisa ser da própria plataforma e em https. */
export function linkColadoAceito(
  plataforma: Plataforma,
  link: string,
  dominiosAwin: string[] = [],
): boolean {
  try {
    const u = new URL(link.trim());
    if (u.protocol !== "https:" || u.username || u.password) return false;
    const hosts =
      plataforma === "awin"
        ? [...HOSTS_PLATAFORMA.awin, ...dominiosAwin]
        : HOSTS_PLATAFORMA[plataforma];
    return hostNaLista(u.hostname, hosts);
  } catch {
    return false;
  }
}
