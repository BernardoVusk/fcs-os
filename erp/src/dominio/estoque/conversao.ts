export type Unidade = { codigo: string; base: string | null; fator_para_base: number };

/** Converte uma quantidade para a unidade base do insumo. null quando as unidades não se relacionam. */
export function paraBase(
  quantidade: number,
  unidade: string,
  unidadeBase: string,
  unidades: Unidade[],
): number | null {
  if (unidade === unidadeBase) return quantidade;
  const u = unidades.find((x) => x.codigo === unidade);
  if (!u || u.base !== unidadeBase) return null;
  return Math.round(quantidade * u.fator_para_base * 1000) / 1000;
}

/** Quantidade base de uma linha de compra: filamento em rolos usa o peso útil por rolo. */
export function quantidadeBaseDaLinha(
  linha: { quantidade: number; unidade: string; pesoUtilG: number | null },
  insumo: { tipo: string; unidade_base: string },
  unidades: Unidade[],
): number | null {
  if (insumo.tipo === "filamento" && linha.unidade === "un") {
    return linha.pesoUtilG && linha.pesoUtilG > 0
      ? Math.round(linha.quantidade * linha.pesoUtilG * 1000) / 1000
      : null;
  }
  return paraBase(linha.quantidade, linha.unidade, insumo.unidade_base, unidades);
}

export const TIPOS_INSUMO = [
  "filamento",
  "embalagem",
  "etiqueta",
  "caixa",
  "componente",
  "fixador",
  "peca_terceiro",
  "consumivel",
  "acabamento",
  "outro",
] as const;
export type TipoInsumo = (typeof TIPOS_INSUMO)[number];

export const TIPO_INSUMO_ROTULO: Record<TipoInsumo, string> = {
  filamento: "Filamento",
  embalagem: "Embalagem",
  etiqueta: "Etiqueta",
  caixa: "Caixa",
  componente: "Componente",
  fixador: "Fixador",
  peca_terceiro: "Peça de terceiro",
  consumivel: "Consumível",
  acabamento: "Acabamento",
  outro: "Outro",
};

export const TIPOS_MOVIMENTACAO = [
  "entrada",
  "consumo_producao",
  "saida",
  "ajuste",
  "perda",
  "devolucao",
  "estorno",
] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const TIPO_MOVIMENTACAO_ROTULO: Record<TipoMovimentacao, string> = {
  entrada: "Entrada",
  consumo_producao: "Consumo de produção",
  saida: "Saída",
  ajuste: "Ajuste",
  perda: "Perda",
  devolucao: "Devolução",
  estorno: "Estorno",
};

export const STATUS_COMPRA: Record<
  string,
  { rotulo: string; variante: "default" | "secondary" | "outline" }
> = {
  rascunho: { rotulo: "Rascunho", variante: "outline" },
  confirmada: { rotulo: "Confirmada", variante: "default" },
  cancelada: { rotulo: "Cancelada", variante: "secondary" },
};
