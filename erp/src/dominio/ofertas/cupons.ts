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
