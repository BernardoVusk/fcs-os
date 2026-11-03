import Decimal from "decimal.js";
import { avaliarPreco, precoPorMargem, type BasePreco } from "./preco";
import type { FaixaTaxa, Plataforma } from "./tabelas-marketplace";

const D = (v: number | string) => new Decimal(v);
const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
const r6 = (d: Decimal) => d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();

/** Faixa com piso e comissão já decididos. `de` e `ate` em reais, inclusivos. */
export type FaixaResolvida = {
  de: number;
  ate: number | null;
  comissao_pct: number;
  fixo: number | "metade_do_preco";
};

export type OpcoesPlataforma = {
  /** Comissão da categoria (fração), para plataforma que cobra por categoria. */
  comissao_categoria?: number | null;
  /** false quando o envio não cobra o fixo (Mercado Livre em Coleta, Agência ou Full). */
  cobrar_fixo?: boolean;
};

/** Faixas da plataforma com piso calculado (teto anterior + 0,01) e comissão da categoria aplicada. */
export function resolverFaixas(p: Plataforma, o: OpcoesPlataforma = {}): FaixaResolvida[] {
  const categoria = o.comissao_categoria ?? p.comissao_categoria?.padrao ?? 0;
  const semFixo = p.fixo_depende_do_envio && o.cobrar_fixo === false;
  return p.faixas.map((f: FaixaTaxa, i) => ({
    de: i === 0 ? 0 : r4(D(p.faixas[i - 1].ate!).plus("0.01")),
    ate: f.ate,
    comissao_pct: f.comissao_pct ?? categoria,
    fixo: semFixo ? 0 : f.fixo,
  }));
}

/** Uma faixa só, para quando a pessoa digita a comissão e o fixo à mão. */
export function faixaManual(comissao_pct: number, fixo: number): FaixaResolvida[] {
  return [{ de: 0, ate: null, comissao_pct, fixo }];
}

export type EntradaMarketplace = {
  /** C: custo de produção por unidade. */
  custo: number | string;
  imposto_pct: number;
  /** Frete pago pelo vendedor e outros fixos por pedido, em reais. */
  extras_pedido: number;
};

export type DetalhePreco = {
  preco: number;
  custo: number;
  comissao: number;
  fixo: number;
  imposto: number;
  extras_pedido: number;
  /** Lucro por venda sem anúncio. */
  lucro: number;
  /** lucro / preço, fração. */
  margem: number;
};

export type PrecoMarketplace =
  | {
      viavel: true;
      preco: number;
      faixa: FaixaResolvida;
      /** O preço da meta caiu no vão entre faixas e subiu para o piso da faixa seguinte. */
      no_piso_da_faixa: boolean;
      detalhe: DetalhePreco;
    }
  | { viavel: false; preco: null };

/** "Metade do preço" vira +0,50 na parte percentual e fixo zero, para caber na fórmula de preco.ts. */
function base(e: EntradaMarketplace, f: FaixaResolvida): BasePreco {
  const metade = f.fixo === "metade_do_preco";
  return {
    custo_total: e.custo,
    fixo_rateado: 0,
    complementares_pedido: 0,
    canal: {
      comissao_pct: metade ? r6(D(f.comissao_pct).plus("0.5")) : f.comissao_pct,
      taxa_pagamento_pct: 0,
      imposto_pct: e.imposto_pct,
      ads_pct: 0,
      taxa_fixa_item: metade ? 0 : (f.fixo as number),
      frete_subsidio: e.extras_pedido,
    },
  };
}

/** Quanto cada taxa leva num preço dado, dentro de uma faixa. */
export function detalharPreco(
  e: EntradaMarketplace,
  f: FaixaResolvida,
  preco: number | string,
): DetalhePreco {
  const P = D(preco);
  const av = avaliarPreco(base(e, f), P.toString());
  return {
    preco: P.toDecimalPlaces(2).toNumber(),
    custo: r4(D(e.custo)),
    comissao: r4(P.times(f.comissao_pct)),
    fixo: r4(f.fixo === "metade_do_preco" ? P.div(2) : D(f.fixo)),
    imposto: r4(P.times(e.imposto_pct)),
    extras_pedido: r4(D(e.extras_pedido)),
    lucro: av.lucro,
    margem: av.margem,
  };
}

/** Faixa em que um preço cai. */
export function faixaDoPreco(faixas: FaixaResolvida[], preco: number): FaixaResolvida {
  return faixas.find((f) => f.ate == null || preco <= f.ate) ?? faixas[faixas.length - 1];
}

/**
 * Menor preço com a margem m, com taxas que dependem da faixa do próprio preço.
 * Em cada faixa, da mais barata para a mais cara: Pm = (C + F) / (1 - t - m) com as taxas dela.
 * Pm dentro da faixa: é a resposta. Pm abaixo do piso (vão entre faixas): o piso, que já passa da meta.
 * Pm acima do teto, ou t + m >= 1: nenhum preço desta faixa fecha, segue para a próxima.
 */
export function precoComFaixas(
  e: EntradaMarketplace,
  faixas: FaixaResolvida[],
  margem: number,
): PrecoMarketplace {
  for (const f of faixas) {
    const r = precoPorMargem(base(e, f), margem);
    if (!r.viavel) continue;
    if (f.ate != null && r.preco > f.ate) continue;
    const noPiso = r.preco < f.de;
    const preco = noPiso ? f.de : r.preco;
    return {
      viavel: true,
      preco,
      faixa: f,
      no_piso_da_faixa: noPiso,
      detalhe: detalharPreco(e, f, preco),
    };
  }
  return { viavel: false, preco: null };
}

/** Preço em que o lucro é zero. */
export function equilibrioComFaixas(
  e: EntradaMarketplace,
  faixas: FaixaResolvida[],
): PrecoMarketplace {
  return precoComFaixas(e, faixas, 0);
}

export type Roas = {
  /** Receita / gasto em que o anúncio come todo o lucro: P / L. */
  minimo: number | null;
  /** Receita / gasto que ainda deixa a margem pós-anúncio: P / (L - mA x P). */
  ideal: number | null;
  acos_maximo: number | null;
  acos_ideal: number | null;
  /** Gasto de anúncio por venda no empate (L) e no ideal (L - mA x P). */
  gasto_maximo: number | null;
  gasto_ideal: number | null;
};

const SEM_ROAS: Roas = {
  minimo: null,
  ideal: null,
  acos_maximo: null,
  acos_ideal: null,
  gasto_maximo: null,
  gasto_ideal: null,
};

/** ROAS sobre o preço de venda. Sem lucro antes do anúncio, ou margem pós-anúncio que não cabe, não há número. */
export function calcularRoas(preco: number, lucro: number, margemPosAnuncio: number): Roas {
  const P = D(preco);
  const L = D(lucro);
  if (P.lte(0) || L.lte(0)) return SEM_ROAS;
  const folga = L.minus(P.times(margemPosAnuncio));
  const ideal = folga.gt(0) ? P.div(folga) : null;
  return {
    minimo: r4(P.div(L)),
    ideal: ideal ? r4(ideal) : null,
    acos_maximo: r6(L.div(P)),
    acos_ideal: folga.gt(0) ? r6(folga.div(P)) : null,
    gasto_maximo: r4(L),
    gasto_ideal: folga.gt(0) ? r4(folga) : null,
  };
}
