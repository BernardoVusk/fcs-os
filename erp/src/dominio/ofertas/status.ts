import type { Tom } from "./tom";

/** Rótulos e tons dos estados do módulo. Programado é derivado (aguardando com hora futura). */

export const STATUS_ENVIO = [
  "aguardando",
  "processando",
  "enviado",
  "incerto",
  "falhou",
  "cancelado",
  "ignorado",
] as const;
export type StatusEnvio = (typeof STATUS_ENVIO)[number];

export const STATUS_PUBLICACAO = [
  "rascunho",
  "aguardando",
  "programado",
  "processando",
  "enviado",
  "parcial",
  "incerto",
  "falhou",
  "cancelado",
  "ignorado",
] as const;
export type StatusPublicacao = (typeof STATUS_PUBLICACAO)[number];

export const STATUS_PUBLICACAO_ROTULO: Record<StatusPublicacao, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando",
  programado: "Programado",
  processando: "Processando",
  enviado: "Enviado",
  parcial: "Enviado em parte",
  incerto: "Incerto: conferir",
  falhou: "Falhou",
  cancelado: "Cancelado",
  ignorado: "Ignorado",
};

export const TOM_PUBLICACAO: Record<StatusPublicacao, Tom> = {
  rascunho: "neutro",
  aguardando: "info",
  programado: "info",
  processando: "info",
  enviado: "sucesso",
  parcial: "alerta",
  incerto: "alerta",
  falhou: "erro",
  cancelado: "neutro",
  ignorado: "neutro",
};

/** Estado de um envio como a tela mostra: aguardando com hora futura vira programado. */
export function statusExibido(
  status: StatusEnvio,
  agendadoPara: string,
  agora = new Date(),
): StatusPublicacao {
  if (status === "aguardando" && Date.parse(agendadoPara) > agora.getTime()) return "programado";
  return status;
}

export const MOTIVO_ROTULO: Record<string, string> = {
  pulado: "Pulado por você",
  cancelado_pelo_usuario: "Cancelado por você",
  nao_publicado_a_tempo: "Não foi publicado a tempo",
  sessao_desconectada: "Número desconectado",
  limite_do_numero: "Limite de envios do número",
  cupom_fora_da_vigencia: "Cupom fora da vigência",
  plataforma_bloqueada: "Plataforma sem canal liberado",
  sem_link_afiliado: "Sem link de afiliado",
  duplicado: "Oferta repetida no período",
  resultado_desconhecido: "Resultado desconhecido: conferir no grupo",
  falha_envio: "Falha no envio",
};

export const STATUS_OFERTA_ROTULO: Record<string, string> = {
  rascunho: "Rascunho",
  pronta: "Pronta",
  arquivada: "Arquivada",
};

export const FUNCAO_GRUPO = ["destino", "teste", "origem", "monitorado", "nenhuma"] as const;
export type FuncaoGrupo = (typeof FUNCAO_GRUPO)[number];
export const FUNCAO_GRUPO_ROTULO: Record<FuncaoGrupo, string> = {
  destino: "Destino (nosso grupo)",
  teste: "Teste controlado",
  origem: "Origem autorizada",
  monitorado: "Só monitorado",
  nenhuma: "Sem função",
};
