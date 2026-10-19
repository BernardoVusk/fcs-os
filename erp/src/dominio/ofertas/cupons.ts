import type { Tom } from "./tom";

export type CupomVigencia = {
  status: string;
  inicio_em: string | null;
  fim_em: string | null;
  validade_confirmada: boolean;
};

export type SituacaoCupom =
  "vigente" | "sem_validade" | "futuro" | "vencido" | "pausado" | "expirado" | "removido";

export const SITUACAO_CUPOM_ROTULO: Record<SituacaoCupom, string> = {
  vigente: "Vigente",
  sem_validade: "Vigente, validade não confirmada",
  futuro: "Ainda não começou",
  vencido: "Vencido",
  pausado: "Pausado",
  expirado: "Marcado como expirado",
  removido: "Removido",
};

export const TOM_SITUACAO_CUPOM: Record<SituacaoCupom, Tom> = {
  vigente: "sucesso",
  sem_validade: "alerta",
  futuro: "info",
  vencido: "erro",
  pausado: "neutro",
  expirado: "neutro",
  removido: "neutro",
};

/** Mesma regra de app.ofe_cupom_vigente no banco, mais o aviso de validade não confirmada. */
export function situacaoCupom(c: CupomVigencia, agora = new Date()): SituacaoCupom {
  if (c.status === "pausado" || c.status === "expirado" || c.status === "removido") return c.status;
  const t = agora.getTime();
  if (c.inicio_em && Date.parse(c.inicio_em) > t) return "futuro";
  if (c.fim_em && Date.parse(c.fim_em) <= t) return "vencido";
  if (!c.fim_em || !c.validade_confirmada) return "sem_validade";
  return "vigente";
}

export function cupomPodeSair(c: CupomVigencia, agora = new Date()): boolean {
  const s = situacaoCupom(c, agora);
  return s === "vigente" || s === "sem_validade";
}

/** Vence em até `dias` dias (para o card do painel e o alerta). */
export function venceEmBreve(c: CupomVigencia, dias = 7, agora = new Date()): boolean {
  if (!c.fim_em || !cupomPodeSair(c, agora)) return false;
  return Date.parse(c.fim_em) - agora.getTime() <= dias * 86_400_000;
}

/** Cupom só entra numa oferta da mesma plataforma (regra de compatibilidade cadastrada). */
export function cupomCompativel(
  cupom: { plataforma: string },
  oferta: { plataforma: string },
): boolean {
  return cupom.plataforma === oferta.plataforma;
}

/** Colunas do CSV de cupons (documentadas na tela). Só plataforma e descrição são obrigatórias. */
export const COLUNAS_CSV_CUPONS = [
  "plataforma",
  "codigo",
  "descricao",
  "beneficio",
  "valor_minimo",
  "inicio",
  "fim",
  "url",
  "regras",
] as const;

export type LinhaCupomCsv = {
  linha: number;
  plataforma: "shopee" | "mercado_livre" | "amazon" | "awin";
  codigo: string | null;
  descricao: string;
  beneficio: string | null;
  valor_minimo: number | null;
  inicio: string | null;
  fim: string | null;
  url: string | null;
  regras: string | null;
};

const PLATAFORMA_CSV: Record<string, LinhaCupomCsv["plataforma"]> = {
  shopee: "shopee",
  "mercado livre": "mercado_livre",
  mercado_livre: "mercado_livre",
  mercadolivre: "mercado_livre",
  amazon: "amazon",
  awin: "awin",
};

/** Data aaaa-mm-dd ou dd/mm/aaaa (fim do dia em São Paulo para o fim; início do dia para o início). */
export function dataCupom(v: string, fimDoDia: boolean): string | null {
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : [];
  if (!a) return null;
  const t = Date.parse(`${a}-${m}-${d}T${fimDoDia ? "23:59:59" : "00:00:00"}-03:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function lerCsvCupons(matriz: string[][]): {
  linhas: LinhaCupomCsv[];
  ignoradas: { linha: number; motivo: string }[];
} {
  const cab = (matriz[0] ?? []).map((c) => c.trim().toLowerCase());
  const idx = (n: string) => cab.indexOf(n);
  const linhas: LinhaCupomCsv[] = [];
  const ignoradas: { linha: number; motivo: string }[] = [];
  for (let k = 1; k < matriz.length; k++) {
    const r = matriz[k];
    const v = (n: string) => (idx(n) >= 0 ? (r[idx(n)] ?? "").trim() : "");
    const plataforma = PLATAFORMA_CSV[v("plataforma").toLowerCase()];
    if (!plataforma) {
      ignoradas.push({ linha: k, motivo: "plataforma inválida" });
      continue;
    }
    const descricao = v("descricao");
    if (!descricao) {
      ignoradas.push({ linha: k, motivo: "sem descrição" });
      continue;
    }
    const fim = v("fim") ? dataCupom(v("fim"), true) : null;
    const inicio = v("inicio") ? dataCupom(v("inicio"), false) : null;
    if ((v("fim") && !fim) || (v("inicio") && !inicio)) {
      ignoradas.push({ linha: k, motivo: "data inválida" });
      continue;
    }
    const minimo = v("valor_minimo")
      ? Number(v("valor_minimo").replace(/\./g, "").replace(",", "."))
      : null;
    const url = v("url");
    linhas.push({
      linha: k,
      plataforma,
      codigo: v("codigo").toUpperCase().slice(0, 60) || null,
      descricao: descricao.slice(0, 300),
      beneficio: v("beneficio").slice(0, 200) || null,
      valor_minimo: minimo !== null && Number.isFinite(minimo) && minimo >= 0 ? minimo : null,
      inicio,
      fim,
      url: /^https:\/\//.test(url) ? url.slice(0, 2000) : null,
      regras: v("regras").slice(0, 2000) || null,
    });
  }
  return { linhas, ignoradas };
}
