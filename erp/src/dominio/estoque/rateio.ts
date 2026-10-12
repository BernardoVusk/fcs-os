import Decimal from "decimal.js";

export type LinhaRateio = { id: string; valor: number; quantidade: number };

/**
 * Rateia um total (frete, desconto do pedido, outros encargos) entre linhas por valor
 * ou por quantidade. Parcelas com 4 casas; a linha de maior base absorve o resíduo
 * para que a soma feche exatamente. Espelha confirmar_compra no banco.
 */
export function ratear(
  linhas: LinhaRateio[],
  total: number,
  metodo: "valor" | "quantidade" = "valor",
): Record<string, number> {
  const saida: Record<string, number> = {};
  if (linhas.length === 0) return saida;
  const base = (l: LinhaRateio) => new Decimal(metodo === "quantidade" ? l.quantidade : l.valor);
  const soma = linhas.reduce((acc, l) => acc.plus(base(l)), new Decimal(0));
  if (soma.lte(0)) {
    for (const l of linhas) saida[l.id] = 0;
    return saida;
  }
  let distribuido = new Decimal(0);
  for (const l of linhas) {
    const parcela = new Decimal(total)
      .times(base(l))
      .div(soma)
      .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
    saida[l.id] = parcela.toNumber();
    distribuido = distribuido.plus(parcela);
  }
  const maior = [...linhas].sort((a, b) => base(b).minus(base(a)).toNumber())[0];
  saida[maior.id] = new Decimal(saida[maior.id])
    .plus(new Decimal(total).minus(distribuido))
    .toDecimalPlaces(4)
    .toNumber();
  return saida;
}

export type LinhaCompra = LinhaRateio & { descontoItem: number; quantidadeBase: number };

/** Custo de aquisição (landed) por linha e por unidade base, com frete e descontos rateados. */
export function landedPorLinha(
  linhas: LinhaCompra[],
  cabecalho: {
    frete: number;
    descontoTotal: number;
    outrosCustos: number;
    precoIncluiFrete: boolean;
    metodo?: "valor" | "quantidade";
  },
): Record<string, { landed: number; custoUnitario: number }> {
  const frete = ratear(linhas, cabecalho.precoIncluiFrete ? 0 : cabecalho.frete, cabecalho.metodo);
  const desconto = ratear(linhas, cabecalho.descontoTotal, cabecalho.metodo);
  const outros = ratear(linhas, cabecalho.outrosCustos, cabecalho.metodo);
  const saida: Record<string, { landed: number; custoUnitario: number }> = {};
  for (const l of linhas) {
    const landed = new Decimal(l.valor)
      .minus(desconto[l.id])
      .plus(frete[l.id])
      .plus(outros[l.id])
      .toDecimalPlaces(4);
    saida[l.id] = {
      landed: landed.toNumber(),
      custoUnitario:
        l.quantidadeBase > 0 ? landed.div(l.quantidadeBase).toDecimalPlaces(6).toNumber() : 0,
    };
  }
  return saida;
}
