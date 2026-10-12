import { describe, expect, it } from "vitest";
import casos from "@/dominio/custos/casos.json";
import { calcularCustoPeca } from "@/dominio/custos/custo-peca";
import { custoHoraImpressora } from "@/dominio/custos/impressora";
import type { DadosImpressora, EntradasPeca } from "@/dominio/custos/tipos";
import {
  avaliarPreco,
  cenarios,
  margemParaMarkup,
  markupParaMargem,
  precoEquilibrio,
  precoPorMargem,
  precoPorMarkup,
  somaPercentuais,
  type BasePreco,
  type TaxasCanal,
} from "./preco";

type Caso = (typeof casos.casos)[number];
const porId = (id: string) => casos.casos.find((c) => c.id === id)!;
const pct = (fracao: number) => Math.round(fracao * 10000) / 100;

function entradas(c: Caso): EntradasPeca {
  const base =
    typeof c.peca === "string" ? (porId(c.peca).peca as Exclude<Caso["peca"], string>) : c.peca;
  const impressora =
    "impressora" in c && c.impressora
      ? custoHoraImpressora(c.impressora as DadosImpressora, casos.tarifa_kwh)
      : custoHoraImpressora(casos.impressora_anexo, casos.tarifa_kwh);
  return {
    ...base,
    fixo: { ...base.fixo, metodo: base.fixo.metodo as EntradasPeca["fixo"]["metodo"] },
    impressora,
  };
}
function canal(c: Caso): TaxasCanal {
  return (typeof c.canal === "string" ? porId(c.canal).canal : c.canal) as TaxasCanal;
}
function base(c: Caso, canalAlt?: TaxasCanal): BasePreco {
  const custo = calcularCustoPeca(entradas(c));
  return {
    custo_total: custo.exato.custo_total,
    fixo_rateado: custo.exato.fixo_rateado,
    complementares_pedido: entradas(c).complementares_pedido,
    canal: canalAlt ?? canal(c),
  };
}

describe("A1: equilíbrio e margem com taxa fixa no numerador e percentuais no denominador", () => {
  const c = porId("A1");
  const e = c.esperado as {
    t: number;
    F: number;
    preco_equilibrio: number;
    preco_margem: number;
    taxas_no_preco: number;
    margem_contribuicao: number;
    margem_pct: number;
  };
  const b = base(c);
  it("t, F, P0 e Pm", () => {
    const r = cenarios(b, { margem: c.margem_alvo, markup: null });
    expect(r.t).toBe(e.t);
    expect(r.F).toBe(e.F);
    expect(r.equilibrio.preco).toBe(e.preco_equilibrio);
    expect(r.margem!.preco).toBe(e.preco_margem);
  });
  it("taxas no preço, margem de contribuição e margem efetiva no preço arredondado", () => {
    const a = avaliarPreco(b, e.preco_margem);
    expect(a.taxas_no_preco).toBe(e.taxas_no_preco);
    expect(a.margem_contribuicao).toBe(e.margem_contribuicao);
    expect(pct(a.margem)).toBe(e.margem_pct);
    expect(a.margem).toBeGreaterThanOrEqual(c.margem_alvo!);
  });
  it("no preço de equilíbrio o lucro é zero ou o resíduo do arredondamento para cima", () => {
    const a = avaliarPreco(b, e.preco_equilibrio);
    expect(a.lucro).toBeGreaterThanOrEqual(0);
    expect(a.lucro).toBeLessThan(0.01);
  });
});

describe("A2: preço arredonda para cima porque a meta é um piso", () => {
  const c = porId("A2");
  const e = c.esperado as {
    preco_equilibrio: number;
    preco_margem: number;
    margem_contribuicao: number;
    resultado_liquido: number;
    margem_pct: number;
    controle_preco_abaixo: { preco: number; margem_pct: number };
  };
  const b = base(c);
  it("P0, Pm, margem de contribuição e resultado líquido", () => {
    expect(precoEquilibrio(b).preco).toBe(e.preco_equilibrio);
    const pm = precoPorMargem(b, c.margem_alvo!);
    expect(pm.preco).toBe(e.preco_margem);
    expect(pm.viavel && pm.preco_exato.startsWith("32.0739")).toBe(true);
    const a = avaliarPreco(b, e.preco_margem);
    expect(a.margem_contribuicao).toBe(e.margem_contribuicao);
    expect(a.resultado_liquido).toBe(e.resultado_liquido);
    expect(pct(a.margem)).toBe(e.margem_pct);
  });
  it("arredondar para o mais próximo entregaria 19,99 %, abaixo da meta (controle negativo)", () => {
    const abaixo = avaliarPreco(b, e.controle_preco_abaixo.preco);
    expect(pct(abaixo.margem)).toBe(e.controle_preco_abaixo.margem_pct);
    expect(abaixo.margem).toBeLessThan(c.margem_alvo!);
  });
});

describe("A3: inviável", () => {
  const c = porId("A3");
  const e = c.esperado as {
    t: number;
    preco_equilibrio: number;
    soma_percentuais: number;
    margem_maxima_exclusiva: number;
  };
  it("margem 50 % com t 0,50 devolve viavel false com explicação; equilíbrio ainda existe", () => {
    const b = base(c);
    expect(somaPercentuais(b.canal)).toBe(e.t);
    const pm = precoPorMargem(b, c.margem_alvo!);
    expect(pm).toEqual({
      viavel: false,
      motivo: "percentuais_sobre_preco_excedem_100",
      soma_percentuais: e.soma_percentuais,
      margem_maxima_exclusiva: e.margem_maxima_exclusiva,
      preco: null,
    });
    expect(precoEquilibrio(b).preco).toBe(e.preco_equilibrio);
  });
  it("com t 1,05 nem o equilíbrio existe", () => {
    const b = base(c, (c as { canal_t_105: TaxasCanal }).canal_t_105);
    const p0 = precoEquilibrio(b);
    expect(p0.viavel).toBe(false);
    expect(p0.preco).toBeNull();
    expect(precoPorMarkup(b, 0.3).viavel).toBe(false);
  });
  it("aviso margem_sensivel quando o denominador fica abaixo de 0,10", () => {
    const b = base(c);
    const pm = precoPorMargem(b, 0.45);
    expect(pm.viavel && pm.aviso).toBe("margem_sensivel");
    const folgado = precoPorMargem(b, 0.2);
    expect(folgado.viavel && folgado.aviso).toBeNull();
  });
});

describe("A4: markup não é margem", () => {
  const c = porId("A4");
  const e = c.esperado as {
    markup: {
      preco: number;
      lucro: number;
      lucro_sobre_custo_pct: number;
      lucro_sobre_preco_pct: number;
    };
    margem: typeof e.markup;
  };
  const b = base(c);
  it("markup 50 % dá lucro = 50 % do custo e margem de 21,64 %", () => {
    const pk = precoPorMarkup(b, 0.5);
    expect(pk.preco).toBe(e.markup.preco);
    expect(pk.viavel && pk.avaliacao.lucro).toBe(e.markup.lucro);
    expect(pk.viavel && pct(pk.avaliacao.markup_efetivo)).toBe(e.markup.lucro_sobre_custo_pct);
    expect(pk.viavel && pct(pk.avaliacao.margem)).toBe(e.markup.lucro_sobre_preco_pct);
  });
  it("margem 50 % dá lucro = 50 % do preço e markup de 232,58 %", () => {
    const pm = precoPorMargem(b, 0.5);
    expect(pm.preco).toBe(e.margem.preco);
    expect(pm.viavel && pm.avaliacao.lucro).toBe(e.margem.lucro);
    expect(pm.viavel && pct(pm.avaliacao.markup_efetivo)).toBe(e.margem.lucro_sobre_custo_pct);
    expect(pm.viavel && pct(pm.avaliacao.margem)).toBe(e.margem.lucro_sobre_preco_pct);
  });
  it("conversão sem taxas: markup 50 % = margem 33,3 %", () => {
    expect(markupParaMargem(0.5)).toBe(0.333333);
    expect(margemParaMarkup(0.25)).toBe(0.333333);
  });
});

describe("REF-7.4", () => {
  const c = porId("REF-7.4");
  const e = c.esperado as {
    preco_equilibrio: number;
    preco_margem: number;
    preco_markup: number;
    margem_pct_no_preco_margem: number;
    margem_pct_no_preco_markup: number;
  };
  it("47,49 de equilíbrio, 71,71 por margem de 25 % e 58,01 por markup de 25 %", () => {
    const r = cenarios(base(c), { margem: 0.25, markup: 0.25 });
    expect(r.equilibrio.preco).toBe(e.preco_equilibrio);
    expect(r.margem!.preco).toBe(e.preco_margem);
    expect(r.markup!.preco).toBe(e.preco_markup);
    expect(r.margem!.viavel && Math.round(r.margem!.avaliacao.margem * 1000) / 10).toBe(
      e.margem_pct_no_preco_margem,
    );
    expect(r.markup!.viavel && Math.round(r.markup!.avaliacao.margem * 1000) / 10).toBe(
      e.margem_pct_no_preco_markup,
    );
  });
});
