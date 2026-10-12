import Decimal from "decimal.js";

const D = (v: number | string) => new Decimal(v);
const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
const r6 = (d: Decimal) => d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();

/** Taxas do canal como frações sobre o preço e fixos por item vendido. */
export type TaxasCanal = {
  comissao_pct: number;
  taxa_pagamento_pct: number;
  imposto_pct: number;
  ads_pct: number;
  taxa_fixa_item: number;
  frete_subsidio: number;
};

export type BasePreco = {
  /** C, de preferência o valor exato do cálculo de custo. */
  custo_total: number | string;
  /** Parcela de C que é fixo rateado (para a margem de contribuição). */
  fixo_rateado: number | string;
  complementares_pedido: number;
  canal: TaxasCanal;
};

export type AvaliacaoPreco = {
  preco: number;
  /** P x t + F: comissão, pagamento, imposto, ads e fixos por item. */
  taxas_no_preco: number;
  lucro: number;
  /** lucro / preço, fração. */
  margem: number;
  /** lucro / custo, fração. */
  markup_efetivo: number;
  margem_contribuicao: number;
  resultado_liquido: number;
};

export type PrecoViavel = {
  viavel: true;
  preco: number;
  preco_exato: string;
  aviso: "margem_sensivel" | null;
  avaliacao: AvaliacaoPreco;
};
export type PrecoInviavel = {
  viavel: false;
  motivo: "percentuais_sobre_preco_excedem_100";
  soma_percentuais: number;
  margem_maxima_exclusiva: number;
  preco: null;
};
export type ResultadoPreco = PrecoViavel | PrecoInviavel;

export const MOTIVO_INVIAVEL_ROTULO: Record<PrecoInviavel["motivo"], string> = {
  percentuais_sobre_preco_excedem_100:
    "As taxas percentuais mais a margem pedida chegam a 100 % do preço ou passam disso; não existe preço que feche.",
};

/** t: soma das frações sobre o preço. */
export function somaPercentuais(c: TaxasCanal): number {
  return r6(D(c.comissao_pct).plus(c.taxa_pagamento_pct).plus(c.imposto_pct).plus(c.ads_pct));
}

/** F: fixos por unidade vendida. */
export function fixosPorUnidade(b: BasePreco): number {
  return r4(D(b.canal.taxa_fixa_item).plus(b.canal.frete_subsidio).plus(b.complementares_pedido));
}

function t(b: BasePreco) {
  return D(b.canal.comissao_pct)
    .plus(b.canal.taxa_pagamento_pct)
    .plus(b.canal.imposto_pct)
    .plus(b.canal.ads_pct);
}
function F(b: BasePreco) {
  return D(b.canal.taxa_fixa_item).plus(b.canal.frete_subsidio).plus(b.complementares_pedido);
}

/** Lucro, margem e markup efetivos num preço dado (já arredondado ou não). */
export function avaliarPreco(b: BasePreco, preco: number | string): AvaliacaoPreco {
  const P = D(preco);
  const C = D(b.custo_total);
  const fixo = D(b.fixo_rateado);
  const umMenosT = D(1).minus(t(b));
  const liquido = P.times(umMenosT);
  const lucro = liquido.minus(C).minus(F(b));
  const contribuicao = liquido.minus(F(b)).minus(C.minus(fixo));
  return {
    preco: P.toDecimalPlaces(2).toNumber(),
    taxas_no_preco: r4(P.times(t(b)).plus(F(b))),
    lucro: r4(lucro),
    margem: P.gt(0) ? r6(lucro.div(P)) : 0,
    markup_efetivo: C.gt(0) ? r6(lucro.div(C)) : 0,
    margem_contribuicao: r4(contribuicao),
    resultado_liquido: r4(contribuicao.minus(fixo)),
  };
}

function inviavel(b: BasePreco, margem: number): PrecoInviavel {
  return {
    viavel: false,
    motivo: "percentuais_sobre_preco_excedem_100",
    soma_percentuais: r4(t(b).plus(margem)),
    margem_maxima_exclusiva: r4(D(1).minus(t(b))),
    preco: null,
  };
}

/** Preço sugerido arredonda para cima a 2 casas: a meta é um piso. Margens exibidas são recalculadas no preço arredondado. */
function fechar(b: BasePreco, exato: Decimal, denominador: Decimal): PrecoViavel {
  const preco = exato.toDecimalPlaces(2, Decimal.ROUND_CEIL);
  return {
    viavel: true,
    preco: preco.toNumber(),
    preco_exato: exato.toString(),
    aviso: denominador.lt("0.10") ? "margem_sensivel" : null,
    avaliacao: avaliarPreco(b, preco.toString()),
  };
}

/** P0 = (C + F) / (1 - t). */
export function precoEquilibrio(b: BasePreco): ResultadoPreco {
  const den = D(1).minus(t(b));
  if (den.lte(0)) return inviavel(b, 0);
  return fechar(b, D(b.custo_total).plus(F(b)).div(den), den);
}

/** Pm = (C + F) / (1 - t - m); lucro = m x preço. */
export function precoPorMargem(b: BasePreco, margem: number): ResultadoPreco {
  const den = D(1).minus(t(b)).minus(margem);
  if (den.lte(0)) return inviavel(b, margem);
  return fechar(b, D(b.custo_total).plus(F(b)).div(den), den);
}

/** Pk = (C x (1 + k) + F) / (1 - t); lucro = k x custo. */
export function precoPorMarkup(b: BasePreco, markup: number): ResultadoPreco {
  const den = D(1).minus(t(b));
  if (den.lte(0)) return inviavel(b, 0);
  return fechar(b, D(b.custo_total).times(D(1).plus(markup)).plus(F(b)).div(den), den);
}

export type Cenarios = {
  t: number;
  F: number;
  equilibrio: ResultadoPreco;
  margem: ResultadoPreco | null;
  markup: ResultadoPreco | null;
};

export function cenarios(
  b: BasePreco,
  alvos: { margem: number | null; markup: number | null },
): Cenarios {
  return {
    t: somaPercentuais(b.canal),
    F: fixosPorUnidade(b),
    equilibrio: precoEquilibrio(b),
    margem: alvos.margem == null ? null : precoPorMargem(b, alvos.margem),
    markup: alvos.markup == null ? null : precoPorMarkup(b, alvos.markup),
  };
}

/** Sem taxas, markup k equivale a margem k/(1+k); com taxas, compare pelos preços. */
export function markupParaMargem(k: number): number {
  return r6(D(k).div(D(1).plus(k)));
}
export function margemParaMarkup(m: number): number {
  return r6(D(m).div(D(1).minus(m)));
}
