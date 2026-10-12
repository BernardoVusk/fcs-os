import Decimal from "decimal.js";

const D = (v: number | string | Decimal | null | undefined) => new Decimal(v ?? 0);
const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
const r6 = (d: Decimal) => d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();

export type ItemResumo = {
  quantidade: number;
  preco_unitario: number;
  /** Desconto total da linha, bancado pelo vendedor. */
  desconto?: number | null;
  custo_unitario_estimado: number | null;
  custo_unitario_realizado: number | null;
};

export type TaxasPedido = {
  comissao_pct: number;
  taxa_pagamento_pct: number;
  taxa_fixa_item: number;
  /** Imposto estimado sobre a base de vendas: análise, nunca lançamento. Null = não configurado. */
  imposto_pct: number | null;
};

export type EntradasResumo = {
  itens: ItemResumo[];
  /** Cupom ou desconto bancado pelo vendedor (não o da plataforma). */
  descontos_vendedor: number;
  frete_cobrado: number;
  /** Frete pago pela empresa (subsídio ou envio próprio). */
  frete_pago: number;
  taxas: TaxasPedido;
  /** Quando o canal informa as taxas reais, elas prevalecem sobre as calculadas. */
  taxas_informadas?: { taxas_canal: number | null; taxas_pagamento: number | null } | null;
};

export type ResumoPedido = {
  itens: number;
  receita_bruta: number;
  base_vendas: number;
  base_taxas: number;
  comissao: number;
  taxa_pagamento: number;
  taxa_fixa: number;
  taxas_canal: number;
  origem_taxas: "calculadas" | "canal";
  valor_a_receber: number;
  imposto_estimado: number | null;
  receita_liquida: number | null;
  custo_estimado: number | null;
  resultado_estimado: number | null;
  margem_estimada: number | null;
  custo_realizado: number | null;
  resultado_real: number | null;
};

/**
 * Resultado de um pedido (spec 7.7 e caso C1).
 * base_taxas = receita bruta menos descontos do vendedor (frete fora); base_vendas soma o frete cobrado.
 * valor_a_receber = base_vendas menos taxas menos frete pago. Custo estimado e realizado só quando todos os itens têm.
 */
export function resumirPedido(e: EntradasResumo): ResumoPedido {
  const quantidade = e.itens.reduce((acc, i) => acc + i.quantidade, 0);
  const receitaBruta = e.itens.reduce(
    (acc, i) => acc.plus(D(i.quantidade).times(i.preco_unitario)),
    new Decimal(0),
  );
  const descontosItens = e.itens.reduce((acc, i) => acc.plus(D(i.desconto)), new Decimal(0));
  const baseTaxas = receitaBruta.minus(descontosItens).minus(D(e.descontos_vendedor));
  const baseVendas = baseTaxas.plus(D(e.frete_cobrado));
  const comissaoCalc = D(
    baseTaxas.times(e.taxas.comissao_pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  );
  const pagamentoCalc = D(
    baseTaxas.times(e.taxas.taxa_pagamento_pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  );
  const fixa = D(e.taxas.taxa_fixa_item).times(quantidade);
  const informadas =
    e.taxas_informadas &&
    (e.taxas_informadas.taxas_canal != null || e.taxas_informadas.taxas_pagamento != null);
  const comissao =
    informadas && e.taxas_informadas!.taxas_canal != null
      ? D(e.taxas_informadas!.taxas_canal)
      : comissaoCalc.plus(fixa);
  const pagamento =
    informadas && e.taxas_informadas!.taxas_pagamento != null
      ? D(e.taxas_informadas!.taxas_pagamento)
      : pagamentoCalc;
  const taxasCanal = informadas
    ? comissao.plus(pagamento)
    : comissaoCalc.plus(pagamentoCalc).plus(fixa);
  const valorAReceber = baseVendas.minus(taxasCanal).minus(D(e.frete_pago));
  const imposto =
    e.taxas.imposto_pct == null
      ? null
      : baseVendas.times(e.taxas.imposto_pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const receitaLiquida = imposto == null ? null : valorAReceber.minus(imposto);
  const temEstimado = e.itens.length > 0 && e.itens.every((i) => i.custo_unitario_estimado != null);
  const temRealizado =
    e.itens.length > 0 && e.itens.every((i) => i.custo_unitario_realizado != null);
  const custoEstimado = temEstimado
    ? e.itens.reduce(
        (acc, i) => acc.plus(D(i.custo_unitario_estimado).times(i.quantidade)),
        new Decimal(0),
      )
    : null;
  const custoRealizado = temRealizado
    ? e.itens.reduce(
        (acc, i) => acc.plus(D(i.custo_unitario_realizado).times(i.quantidade)),
        new Decimal(0),
      )
    : null;
  const resultadoEst =
    receitaLiquida != null && custoEstimado != null
      ? receitaLiquida.minus(custoEstimado.toDecimalPlaces(2, Decimal.ROUND_HALF_UP))
      : null;
  const resultadoReal =
    receitaLiquida != null && custoRealizado != null
      ? receitaLiquida.minus(custoRealizado.toDecimalPlaces(2, Decimal.ROUND_HALF_UP))
      : null;
  return {
    itens: quantidade,
    receita_bruta: r2(receitaBruta),
    base_vendas: r2(baseVendas),
    base_taxas: r2(baseTaxas),
    comissao: r2(informadas ? comissao : comissaoCalc),
    taxa_pagamento: r2(pagamento),
    taxa_fixa: r2(informadas ? new Decimal(0) : fixa),
    taxas_canal: r2(taxasCanal),
    origem_taxas: informadas ? "canal" : "calculadas",
    valor_a_receber: r2(valorAReceber),
    imposto_estimado: imposto == null ? null : r2(imposto),
    receita_liquida: receitaLiquida == null ? null : r2(receitaLiquida),
    custo_estimado: custoEstimado == null ? null : r2(custoEstimado),
    resultado_estimado: resultadoEst == null ? null : r2(resultadoEst),
    margem_estimada:
      resultadoEst == null || baseVendas.lte(0) ? null : r6(resultadoEst.div(baseVendas)),
    custo_realizado: custoRealizado == null ? null : r2(custoRealizado),
    resultado_real: resultadoReal == null ? null : r2(resultadoReal),
  };
}
