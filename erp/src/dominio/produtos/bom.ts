import Decimal from "decimal.js";

export const PAPEIS_BOM = ["impressao", "complementar", "embalagem", "acabamento"] as const;
export type PapelBom = (typeof PAPEIS_BOM)[number];
export const PAPEL_BOM_ROTULO: Record<PapelBom, string> = {
  impressao: "Material de impressão",
  complementar: "Complementar",
  embalagem: "Embalagem",
  acabamento: "Acabamento",
};

export type ItemBom = {
  insumo_id: string;
  nome?: string;
  quantidade: number;
  papel: PapelBom;
  /** Por peça entra no custo da peça; por pedido entra nos fixos por venda (F). */
  por: "peca" | "pedido";
  /** Custo de reposição do insumo na unidade da quantidade. Null = não configurado. */
  custo_unitario: number | null;
};

export type ResumoBom = {
  por_peca: number;
  por_pedido: number;
  /** Insumos complementares sem custo: bloqueiam o cálculo. */
  sem_custo: string[];
  linhas: {
    insumo_id: string;
    nome?: string;
    papel: PapelBom;
    por: "peca" | "pedido";
    quantidade: number;
    custo: number | null;
  }[];
};

/**
 * Soma os complementares da BOM (tudo que não é material de impressão; o filamento vem da ficha).
 * quantidade x custo de reposição, 4 casas, separado por peça e por pedido.
 */
export function resumirBom(itens: ItemBom[]): ResumoBom {
  let peca = new Decimal(0);
  let pedido = new Decimal(0);
  const semCusto: string[] = [];
  const linhas: ResumoBom["linhas"] = [];
  for (const i of itens) {
    if (i.papel === "impressao") continue;
    if (i.custo_unitario == null) {
      semCusto.push(i.nome ?? i.insumo_id);
      linhas.push({
        insumo_id: i.insumo_id,
        nome: i.nome,
        papel: i.papel,
        por: i.por,
        quantidade: i.quantidade,
        custo: null,
      });
      continue;
    }
    const custo = new Decimal(i.quantidade).times(i.custo_unitario);
    if (i.por === "pedido") pedido = pedido.plus(custo);
    else peca = peca.plus(custo);
    linhas.push({
      insumo_id: i.insumo_id,
      nome: i.nome,
      papel: i.papel,
      por: i.por,
      quantidade: i.quantidade,
      custo: custo.toDecimalPlaces(4).toNumber(),
    });
  }
  return {
    por_peca: peca.toDecimalPlaces(4).toNumber(),
    por_pedido: pedido.toDecimalPlaces(4).toNumber(),
    sem_custo: semCusto,
    linhas,
  };
}
