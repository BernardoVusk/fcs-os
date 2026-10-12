import Decimal from "decimal.js";

export type Lote = { quantidade: number; valor: number };

/** Custo médio ponderado dos lotes com saldo: soma dos valores / soma das quantidades, 6 casas. */
export function custoMedio(lotes: Lote[]): number | null {
  const comSaldo = lotes.filter((l) => l.quantidade > 0);
  const qtd = comSaldo.reduce((acc, l) => acc.plus(l.quantidade), new Decimal(0));
  if (qtd.lte(0)) return null;
  const valor = comSaldo.reduce((acc, l) => acc.plus(l.valor), new Decimal(0));
  return valor.div(qtd).toDecimalPlaces(6).toNumber();
}

/**
 * Valor de uma saída do lote: ao custo do lote; se zera o lote, leva o valor restante
 * para o lote fechar em 0,0000 sem resíduo.
 */
export function valorDaSaida(lote: Lote & { custoUnitario: number }, quantidade: number): number {
  if (quantidade >= lote.quantidade) return new Decimal(lote.valor).toDecimalPlaces(4).toNumber();
  return new Decimal(quantidade).times(lote.custoUnitario).toDecimalPlaces(4).toNumber();
}

export type OrigemCusto = "media" | "ultima_entrada" | "manual";

/** Custo que alimenta o motor de custos conforme a origem configurada no insumo. */
export function custoDeReposicao(insumo: {
  origem_custo: OrigemCusto;
  custo_medio: number | null;
  ultimo_custo: number | null;
  custo_manual: number | null;
}): { valor: number | null; origem: OrigemCusto } {
  if (insumo.origem_custo === "manual" && insumo.custo_manual != null)
    return { valor: insumo.custo_manual, origem: "manual" };
  if (insumo.origem_custo === "ultima_entrada" && insumo.ultimo_custo != null)
    return { valor: insumo.ultimo_custo, origem: "ultima_entrada" };
  if (insumo.custo_medio != null) return { valor: insumo.custo_medio, origem: "media" };
  if (insumo.ultimo_custo != null) return { valor: insumo.ultimo_custo, origem: "ultima_entrada" };
  return { valor: null, origem: insumo.origem_custo };
}
