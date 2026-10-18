import { createHash } from "node:crypto";
import { requisitarJson, type Opcoes } from "./http";
import { decimalOuNulo, produtoVazio, type DadosProduto } from "@/dominio/ofertas/produto";

/**
 * Open API de afiliados da Shopee Brasil (GraphQL). Assinatura: SHA256(AppId + Timestamp +
 * corpo + Secret) no cabeçalho Authorization. Nomes de campos e consultas seguem a documentação
 * do portal (exige login) conferida por SDKs públicos; o teste de conexão confirma na conta real.
 */

export const ENDPOINT_SHOPEE = "https://open-api.affiliate.shopee.com.br/graphql";
const HOSTS = ["open-api.affiliate.shopee.com.br"];

export type CredShopee = { app_id: string; secret: string };
export type ResultadoShopee<T> =
  { ok: true; dados: T } | { ok: false; erro: string; detalhe?: string };

export function assinaturaShopee(
  appId: string,
  timestamp: number,
  corpo: string,
  secret: string,
): string {
  return createHash("sha256").update(`${appId}${timestamp}${corpo}${secret}`).digest("hex");
}

type RespostaGraphql = {
  data?: Record<string, unknown>;
  errors?: { message?: string; extensions?: { code?: number } }[];
};

async function chamar<T>(
  cred: CredShopee,
  query: string,
  opcoes: Partial<Opcoes> = {},
  agora = () => Math.floor(Date.now() / 1000),
): Promise<ResultadoShopee<T>> {
  const corpo = JSON.stringify({ query });
  const ts = agora();
  const r = await requisitarJson(
    ENDPOINT_SHOPEE,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `SHA256 Credential=${cred.app_id}, Timestamp=${ts}, Signature=${assinaturaShopee(cred.app_id, ts, corpo, cred.secret)}`,
      },
      body: corpo,
    },
    { hosts: HOSTS, ...opcoes },
  );
  if (!r.ok) return { ok: false, erro: r.erro };
  const resposta = r.dados as RespostaGraphql;
  if (resposta?.errors?.length) {
    const e = resposta.errors[0];
    const codigo = e.extensions?.code;
    return {
      ok: false,
      erro: codigo === 10030 || r.status === 429 ? "limite_de_chamadas" : "shopee_recusou",
      detalhe: `${codigo ?? ""} ${e.message ?? ""}`.trim().slice(0, 300),
    };
  }
  if (r.status >= 400 || !resposta?.data)
    return { ok: false, erro: "shopee_recusou", detalhe: `HTTP ${r.status}` };
  return { ok: true, dados: resposta.data as T };
}

const texto = (v: string) => JSON.stringify(v);

/** Chamada mínima que só passa com AppID e Secret válidos. */
export async function testarShopee(cred: CredShopee, opcoes: Partial<Opcoes> = {}) {
  return chamar<{ shopeeOfferV2: unknown }>(
    cred,
    "{ shopeeOfferV2(page: 1, limit: 1) { pageInfo { page limit hasNextPage } } }",
    opcoes,
  );
}

export async function gerarLinkShopee(
  cred: CredShopee,
  urlOrigem: string,
  subIds: string[],
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoShopee<string>> {
  const ids = subIds.slice(0, 5).map(texto).join(", ");
  const r = await chamar<{ generateShortLink?: { shortLink?: string } }>(
    cred,
    `mutation { generateShortLink(input: { originUrl: ${texto(urlOrigem)}, subIds: [${ids}] }) { shortLink } }`,
    opcoes,
  );
  if (!r.ok) return r;
  const link = r.dados.generateShortLink?.shortLink;
  if (!link || !/^https:\/\//.test(link)) return { ok: false, erro: "shopee_sem_link" };
  return { ok: true, dados: link };
}

type NoProduto = {
  productName?: string;
  imageUrl?: string;
  priceMin?: string | number;
  priceMax?: string | number;
  priceDiscountRate?: number | string;
  ratingStar?: string | number;
  shopName?: string;
};

/** Converte um nó de productOfferV2 sem inventar campo que a API não mandou. */
export function produtoDoNoShopee(no: NoProduto, agora = new Date()): DadosProduto {
  const p = produtoVazio();
  const min = decimalOuNulo(no.priceMin);
  const max = decimalOuNulo(no.priceMax);
  if (no.productName) {
    p.titulo = String(no.productName).slice(0, 300);
    p.fontes.titulo = "api_shopee";
  }
  if (no.imageUrl && /^https:\/\//.test(no.imageUrl)) {
    p.imagem_url = no.imageUrl;
    p.fontes.imagem_url = "api_shopee";
  }
  if (min) {
    p.preco_atual = min;
    p.preco_variavel = !!max && max !== min;
    p.fontes.preco_atual = "api_shopee";
  }
  const taxa = Number(no.priceDiscountRate);
  if (Number.isFinite(taxa) && taxa > 0 && taxa < 100) {
    p.desconto = (taxa / 100).toFixed(4);
    p.fontes.desconto = "api_shopee";
  }
  const nota = Number(no.ratingStar);
  if (Number.isFinite(nota) && nota > 0 && nota <= 5) {
    p.avaliacao = nota.toFixed(1);
    p.fontes.avaliacao = "api_shopee";
  }
  if (no.shopName) {
    p.loja = String(no.shopName).slice(0, 120);
    p.fontes.loja = "api_shopee";
  }
  p.atualizado_em = agora.toISOString();
  return p;
}

export async function buscarProdutoShopee(
  cred: CredShopee,
  ids: { shopId: string; itemId: string },
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoShopee<DadosProduto>> {
  if (!/^\d+$/.test(ids.itemId) || !/^\d+$/.test(ids.shopId))
    return { ok: false, erro: "url_invalida" };
  const r = await chamar<{ productOfferV2?: { nodes?: NoProduto[] } }>(
    cred,
    `{ productOfferV2(itemId: ${ids.itemId}, shopId: ${ids.shopId}, page: 1, limit: 1) { nodes { productName imageUrl priceMin priceMax priceDiscountRate ratingStar shopName } } }`,
    opcoes,
  );
  if (!r.ok) return r;
  const no = r.dados.productOfferV2?.nodes?.[0];
  if (!no) return { ok: false, erro: "produto_nao_encontrado" };
  return { ok: true, dados: produtoDoNoShopee(no) };
}
