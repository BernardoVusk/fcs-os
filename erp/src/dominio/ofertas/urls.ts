import { HOSTS_LINK_CURTO, HOSTS_PLATAFORMA, hostNaLista, type Plataforma } from "./plataformas";

/**
 * Leitura de URL de oferta: identifica a plataforma por host (nunca por texto solto), extrai o
 * id do produto e diz se o link já carrega atribuição de afiliado. Não busca nada na rede:
 * link curto volta marcado para o adaptador resolver com segurança.
 */

export type AnuncianteAwin = { advertiserId: number; dominios: string[] };

export type UrlLida = {
  plataforma: Plataforma;
  url: string;
  host: string;
  linkCurto: boolean;
  jaAfiliado: boolean;
  chaveProduto: string | null;
  ids: { shopId?: string; itemId?: string; mlb?: string; asin?: string; anuncianteAwin?: number };
};

export type ErroUrl = "url_invalida" | "url_nao_https" | "plataforma_desconhecida";

const SHOPEE = [/-i\.(\d+)\.(\d+)/, /\/product\/(\d+)\/(\d+)/];
const ASIN = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/exec\/obidos\/(?:asin|ASIN)\/([A-Z0-9]{10})/,
];
const MLB = /\bMLB-?(\d{6,})\b/i;

function plataformaDoHost(
  host: string,
  awin: AnuncianteAwin[],
): { p: Plataforma; anunciante?: number } | null {
  for (const p of ["shopee", "mercado_livre", "amazon", "awin"] as const)
    if (hostNaLista(host, HOSTS_PLATAFORMA[p])) return { p };
  const a = awin.find((x) => hostNaLista(host, x.dominios));
  return a ? { p: "awin", anunciante: a.advertiserId } : null;
}

export function lerUrlOferta(
  entrada: string,
  anunciantesAwin: AnuncianteAwin[] = [],
): { ok: true; lida: UrlLida } | { ok: false; erro: ErroUrl } {
  let url: URL;
  try {
    url = new URL(entrada.trim());
  } catch {
    return { ok: false, erro: "url_invalida" };
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return { ok: false, erro: "url_nao_https" };
  if (url.username || url.password) return { ok: false, erro: "url_invalida" };
  url.hash = "";
  const host = url.hostname.toLowerCase();
  const achou = plataformaDoHost(host, anunciantesAwin);
  if (!achou) return { ok: false, erro: "plataforma_desconhecida" };
  const linkCurto = hostNaLista(host, HOSTS_LINK_CURTO);
  const texto = decodeURIComponent(url.pathname) + url.search;
  const lida: UrlLida = {
    plataforma: achou.p,
    url: url.toString(),
    host,
    linkCurto,
    jaAfiliado: false,
    chaveProduto: null,
    ids: {},
  };

  if (achou.p === "shopee") {
    const m = SHOPEE.map((r) => url.pathname.match(r)).find(Boolean);
    if (m) {
      lida.ids = { shopId: m[1], itemId: m[2] };
      lida.chaveProduto = `shopee:${m[1]}:${m[2]}`;
    }
    lida.jaAfiliado =
      linkCurto ||
      url.searchParams.get("utm_medium") === "affiliates" ||
      (url.searchParams.get("utm_source") ?? "").startsWith("an_");
  } else if (achou.p === "amazon") {
    const m = ASIN.map((r) => url.pathname.match(r)).find(Boolean);
    if (m) {
      const asin = m[1].toUpperCase();
      lida.ids = { asin };
      lida.chaveProduto = `amazon:${asin}`;
    }
    lida.jaAfiliado = linkCurto || url.searchParams.has("tag");
  } else if (achou.p === "mercado_livre") {
    const m = texto.match(MLB);
    if (m) {
      lida.ids = { mlb: `MLB${m[1]}` };
      lida.chaveProduto = `mercado_livre:MLB${m[1]}`;
    }
    lida.jaAfiliado =
      url.pathname.startsWith("/sec/") ||
      url.searchParams.has("matt_tool") ||
      url.searchParams.has("matt_word");
  } else {
    if (achou.anunciante) {
      lida.ids = { anuncianteAwin: achou.anunciante };
      lida.chaveProduto = `awin:${achou.anunciante}:${host}${url.pathname.replace(/\/+$/, "")}`;
    }
    lida.jaAfiliado = hostNaLista(host, HOSTS_PLATAFORMA.awin);
  }
  return { ok: true, lida };
}

/** Domínio sem www., para mostrar ao usuário de onde é o link. */
export function dominioCurto(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Todas as URLs http(s) de um texto livre (mensagem de grupo de origem), na ordem. */
export function urlsDoTexto(texto: string): string[] {
  const achadas = texto.match(/https?:\/\/[^\s<>"'`)\]]+/gi) ?? [];
  return achadas.map((u) => u.replace(/[.,;:!?]+$/, ""));
}
