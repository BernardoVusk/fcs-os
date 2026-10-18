import { requisitarJson, type Opcoes } from "./http";

/**
 * API da Awin para publishers (help.awin.com/apidocs): token do usuário em Authorization:
 * Bearer, limite de 20 chamadas por minuto. Link Builder, programas, promoções e transações.
 */

const BASE = "https://api.awin.com";
const HOSTS = ["api.awin.com"];

export type CredAwin = { publisher_id: string; api_token: string };
export type ResultadoAwin<T> =
  { ok: true; dados: T } | { ok: false; erro: string; detalhe?: string };

async function chamar<T>(
  cred: CredAwin,
  caminho: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<T>> {
  const r = await requisitarJson(
    `${BASE}${caminho}`,
    {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${cred.api_token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    },
    { hosts: HOSTS, maxBytes: 5_000_000, ...opcoes },
  );
  if (!r.ok) return { ok: false, erro: r.erro };
  if (r.status === 401 || r.status === 403)
    return { ok: false, erro: "credencial_recusada", detalhe: `HTTP ${r.status}` };
  if (r.status === 429) return { ok: false, erro: "limite_de_chamadas" };
  if (r.status >= 400) {
    const msg = (r.dados as { description?: string; error?: string } | null) ?? {};
    return {
      ok: false,
      erro: "awin_recusou",
      detalhe: `HTTP ${r.status} ${msg.description ?? msg.error ?? ""}`.trim().slice(0, 300),
    };
  }
  return { ok: true, dados: r.dados as T };
}

/** O token precisa enxergar a conta de publisher informada. */
export async function testarAwin(
  cred: CredAwin,
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<{ conta: string }>> {
  const r = await chamar<{
    accounts?: { accountId: number; accountName?: string; accountType?: string }[];
  }>(cred, "/accounts", {}, opcoes);
  if (!r.ok) return r;
  const conta = r.dados.accounts?.find((a) => String(a.accountId) === cred.publisher_id);
  if (!conta) return { ok: false, erro: "awin_conta_nao_encontrada" };
  return { ok: true, dados: { conta: conta.accountName ?? cred.publisher_id } };
}

export type ProgramaAwin = {
  advertiserId: number;
  nome: string;
  dominios: string[];
  deeplink: boolean;
};

type ProgramaBruto = {
  id?: number;
  name?: string;
  displayUrl?: string;
  validDomains?: { domain?: string }[];
  deeplinkEnabled?: boolean;
};

function dominioLimpo(d: string): string | null {
  const h = d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? h : null;
}

export function programaDoBruto(p: ProgramaBruto): ProgramaAwin | null {
  if (!p.id || !p.name) return null;
  const dominios = new Set<string>();
  for (const d of p.validDomains ?? []) {
    const limpo = d.domain ? dominioLimpo(d.domain) : null;
    if (limpo) dominios.add(limpo);
  }
  const exibido = p.displayUrl ? dominioLimpo(p.displayUrl) : null;
  if (exibido) dominios.add(exibido);
  return {
    advertiserId: p.id,
    nome: p.name.slice(0, 160),
    dominios: [...dominios],
    deeplink: p.deeplinkEnabled !== false,
  };
}

/** Anunciantes com parceria aceita, para reconhecer o domínio de uma URL colada. */
export async function listarProgramasAwin(
  cred: CredAwin,
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<ProgramaAwin[]>> {
  const r = await chamar<ProgramaBruto[]>(
    cred,
    `/publishers/${cred.publisher_id}/programmes?relationship=joined`,
    {},
    opcoes,
  );
  if (!r.ok) return r;
  return {
    ok: true,
    dados: (Array.isArray(r.dados) ? r.dados : [])
      .map(programaDoBruto)
      .filter((p): p is ProgramaAwin => !!p),
  };
}

export async function gerarLinkAwin(
  cred: CredAwin,
  advertiserId: number,
  destino: string,
  clickrefs: Record<string, string>,
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<{ url: string; curta: string | null }>> {
  const r = await chamar<{ url?: string; shortUrl?: string }>(
    cred,
    `/publishers/${cred.publisher_id}/linkbuilder/generate`,
    {
      method: "POST",
      body: { advertiserId, destinationUrl: destino, parameters: clickrefs, shorten: true },
    },
    opcoes,
  );
  if (!r.ok) {
    if (r.detalhe?.includes("deeplinkNotPermitted"))
      return { ok: false, erro: "awin_deeplink_bloqueado" };
    return r;
  }
  const url = r.dados.url;
  if (!url || !/^https:\/\//.test(url)) return { ok: false, erro: "awin_sem_link" };
  const curta = r.dados.shortUrl && /^https:\/\//.test(r.dados.shortUrl) ? r.dados.shortUrl : null;
  return { ok: true, dados: { url, curta } };
}

export type CupomAwin = {
  promotionId: number;
  anunciante: string;
  advertiserId: number;
  codigo: string | null;
  titulo: string;
  descricao: string | null;
  termos: string | null;
  inicio: string | null;
  fim: string | null;
  urlRastreio: string | null;
};

type PromocaoBruta = {
  promotionId?: number;
  title?: string;
  description?: string;
  terms?: string;
  startDate?: string;
  endDate?: string;
  urlTracking?: string;
  advertiser?: { id?: number; name?: string };
  voucher?: { code?: string | null };
};

export function cupomDoBruto(p: PromocaoBruta): CupomAwin | null {
  if (!p.promotionId || !p.advertiser?.id) return null;
  return {
    promotionId: p.promotionId,
    advertiserId: p.advertiser.id,
    anunciante: (p.advertiser.name ?? "").slice(0, 160),
    codigo: p.voucher?.code?.trim() ? p.voucher.code.trim().slice(0, 60) : null,
    titulo: (p.title ?? "").slice(0, 200),
    descricao: p.description ? p.description.slice(0, 1000) : null,
    termos: p.terms ? p.terms.slice(0, 2000) : null,
    inicio: p.startDate ?? null,
    fim: p.endDate ?? null,
    urlRastreio: p.urlTracking && /^https:\/\//.test(p.urlTracking) ? p.urlTracking : null,
  };
}

/** Cupons (voucher) ativos dos anunciantes com parceria, região BR. */
export async function listarCuponsAwin(
  cred: CredAwin,
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<CupomAwin[]>> {
  const r = await chamar<{ data?: PromocaoBruta[] }>(
    cred,
    `/publisher/${cred.publisher_id}/promotions`,
    {
      method: "POST",
      body: {
        filters: { membership: "joined", regionCodes: ["BR"], type: "voucher", status: "active" },
        pagination: { page: 1, pageSize: 200 },
      },
    },
    opcoes,
  );
  if (!r.ok) return r;
  return {
    ok: true,
    dados: (r.dados.data ?? []).map(cupomDoBruto).filter((c): c is CupomAwin => !!c),
  };
}

export type TransacaoAwin = {
  id: string;
  advertiserId: number | null;
  data: string;
  status: string;
  venda: string | null;
  comissao: string | null;
  moeda: string | null;
  clickrefs: string[];
};

type TransacaoBruta = {
  id?: number | string;
  advertiserId?: number;
  transactionDate?: string;
  commissionStatus?: string;
  saleAmount?: { amount?: number; currency?: string };
  commissionAmount?: { amount?: number; currency?: string };
  clickRefs?: Record<string, string | null>;
};

/** Transações de um intervalo de até 31 dias (limite da API). */
export async function listarTransacoesAwin(
  cred: CredAwin,
  inicio: string,
  fim: string,
  opcoes: Partial<Opcoes> = {},
): Promise<ResultadoAwin<TransacaoAwin[]>> {
  const q = new URLSearchParams({
    startDate: inicio,
    endDate: fim,
    timezone: "America/Sao_Paulo",
    dateType: "transaction",
  });
  const r = await chamar<TransacaoBruta[]>(
    cred,
    `/publishers/${cred.publisher_id}/transactions/?${q}`,
    {},
    opcoes,
  );
  if (!r.ok) return r;
  const lista = Array.isArray(r.dados) ? r.dados : [];
  return {
    ok: true,
    dados: lista
      .filter((t) => t.id !== undefined && t.transactionDate)
      .map((t) => ({
        id: String(t.id),
        advertiserId: t.advertiserId ?? null,
        data: t.transactionDate!,
        status: t.commissionStatus ?? "desconhecido",
        venda: typeof t.saleAmount?.amount === "number" ? t.saleAmount.amount.toFixed(2) : null,
        comissao:
          typeof t.commissionAmount?.amount === "number"
            ? t.commissionAmount.amount.toFixed(2)
            : null,
        moeda: t.commissionAmount?.currency ?? t.saleAmount?.currency ?? null,
        clickrefs: Object.values(t.clickRefs ?? {}).filter((v): v is string => !!v),
      })),
  };
}
