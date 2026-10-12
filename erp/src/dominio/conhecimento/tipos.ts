export const TIPOS_CONHECIMENTO = ["procedimento", "solucao", "decisao", "referencia", "perfil_impressao", "nota"] as const;
export type TipoConhecimento = (typeof TIPOS_CONHECIMENTO)[number];
export const TIPO_CONHECIMENTO_ROTULO: Record<TipoConhecimento, string> = {
  procedimento: "Procedimento",
  solucao: "Solução",
  decisao: "Decisão",
  referencia: "Referência",
  perfil_impressao: "Perfil de impressão",
  nota: "Nota",
};

export const CONFIDENCIALIDADES = ["interno", "restrito"] as const;
export type Confidencialidade = (typeof CONFIDENCIALIDADES)[number];
export const CONFIDENCIALIDADE_ROTULO: Record<Confidencialidade, string> = {
  interno: "Interno (toda a equipe)",
  restrito: "Restrito (só o dono)",
};

export const STATUS_CONHECIMENTO = ["rascunho", "ativo", "arquivado"] as const;
export type StatusConhecimento = (typeof STATUS_CONHECIMENTO)[number];
export const STATUS_CONHECIMENTO_ROTULO: Record<StatusConhecimento, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  arquivado: "Arquivado",
};

export const TIPOS_RELACAO = ["relacionado", "substitui", "deriva_de"] as const;
export type TipoRelacao = (typeof TIPOS_RELACAO)[number];
export const TIPO_RELACAO_ROTULO: Record<TipoRelacao, string> = {
  relacionado: "Relacionado a",
  substitui: "Substitui",
  deriva_de: "Deriva de",
};

/** Campos estruturados de uma decisão (guardados em `estrutura`). */
export type EstruturaDecisao = { contexto: string; alternativas: string[]; decisao: string; consequencias: string };

/** Lê e separa tags digitadas: "petg, ender 3 , PETG" vira ["petg", "ender 3"]. */
export function lerTags(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const parte of texto.split(/[,;\n]/)) {
    const tag = parte.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
    if (tag && !vistas.has(tag)) {
      vistas.add(tag);
      saida.push(tag);
    }
  }
  return saida.slice(0, 20);
}
