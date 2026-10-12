import { describe, expect, it } from "vitest";
import casos from "./casos.json";
import { calcularCustoPeca, validarEntradas } from "./custo-peca";
import { custoHoraImpressora, custoHoraTotal } from "./impressora";
import type { DadosImpressora, EntradasPeca } from "./tipos";

type Caso = (typeof casos.casos)[number];
const porId = (id: string) => casos.casos.find((c) => c.id === id)!;
const impressoraAnexo = custoHoraImpressora(casos.impressora_anexo, casos.tarifa_kwh);

function peca(c: Caso): EntradasPeca {
  const base =
    typeof c.peca === "string" ? (porId(c.peca).peca as Exclude<Caso["peca"], string>) : c.peca;
  const impressora =
    "impressora" in c && c.impressora
      ? custoHoraImpressora(c.impressora as DadosImpressora, casos.tarifa_kwh)
      : impressoraAnexo;
  return {
    ...base,
    fixo: { ...base.fixo, metodo: base.fixo.metodo as EntradasPeca["fixo"]["metodo"] },
    impressora,
  };
}

describe("custo por hora da impressora", () => {
  it("deriva depreciação, manutenção, consumíveis e energia do Anexo A", () => {
    expect(impressoraAnexo).toEqual(casos.custo_hora_anexo);
    expect(custoHoraTotal(impressoraAnexo)).toEqual({ maquina: 0.8, comEnergia: 0.914 });
  });
  it("recusa vida útil ou horas anuais zero e residual maior que a aquisição", () => {
    expect(() =>
      custoHoraImpressora({ ...casos.impressora_anexo, vida_util_horas: 0 }, 0.95),
    ).toThrow("impressora_sem_vida_util");
    expect(() =>
      custoHoraImpressora({ ...casos.impressora_anexo, horas_produtivas_ano: 0 }, 0.95),
    ).toThrow("impressora_sem_horas_ano");
    expect(() =>
      custoHoraImpressora({ ...casos.impressora_anexo, valor_residual: 9000 }, 0.95),
    ).toThrow("residual_maior_que_aquisicao");
  });
});

describe("A1: peça simples sem falha, sem desperdício, sem fixo", () => {
  const c = porId("A1");
  const r = calcularCustoPeca(peca(c));
  it("reproduz cada componente e o custo total", () => {
    expect(r.componentes).toEqual(c.esperado.componentes);
    expect(r.custo_total).toBe(c.esperado.custo_total);
    expect(r.custo_variavel).toBe(c.esperado.custo_total);
    expect(r.fator_falha).toBe(1);
  });
  it("com f = 0 e w = 0 o total é a soma simples dos componentes", () => {
    const soma = Object.values(r.componentes).reduce((a, b) => a + b, 0);
    expect(Math.round(soma * 10000) / 10000).toBe(r.custo_total);
  });
});

describe("A2: mesa de 6 peças com falha, desperdício e fixo por hora", () => {
  const c = porId("A2");
  const e = c.esperado as Required<(typeof casos.casos)[1]["esperado"]>;
  const r = calcularCustoPeca(peca(c));
  it("peças boas, gramas e horas por peça boa", () => {
    expect(r.pecas_boas_por_tentativa).toBe(e.pecas_boas_por_tentativa);
    expect(r.gramas_por_peca_boa).toBe(e.gramas_por_peca_boa);
    expect(r.horas_por_peca_boa).toBe(e.horas_por_peca_boa);
  });
  it("componentes, variável, fixo rateado e total", () => {
    expect(r.componentes).toEqual(e.componentes);
    expect(r.custo_variavel).toBe(e.custo_variavel);
    expect(r.custo_total).toBe(e.custo_total);
  });
  it("falha não incide em acabamento, embalagem nem complementares (regressão)", () => {
    const semFalha = calcularCustoPeca({ ...peca(c), taxa_falha: 0 });
    expect(semFalha.componentes.acabamento).toBe(r.componentes.acabamento);
    expect(semFalha.componentes.embalagem).toBe(r.componentes.embalagem);
    expect(semFalha.componentes.complementares_peca).toBe(r.componentes.complementares_peca);
    expect(semFalha.componentes.material).toBeLessThan(r.componentes.material);
    expect(semFalha.componentes.fixo_rateado).toBeLessThan(r.componentes.fixo_rateado);
  });
  it("desperdício incide só no material e como (1 + w), nunca 1/(1 - w) nem no tempo (regressão)", () => {
    const semW = calcularCustoPeca({ ...peca(c), desperdicio: 0 });
    expect(r.componentes.material).toBe(
      Math.round(semW.componentes.material * 1.05 * 10000) / 10000,
    );
    expect(semW.componentes.depreciacao).toBe(r.componentes.depreciacao);
    expect(semW.horas_por_peca_boa).toBe(r.horas_por_peca_boa);
  });
  it("fixo por peça e fixo desligado", () => {
    const porPeca = calcularCustoPeca({
      ...peca(c),
      fixo: {
        metodo: "peca",
        custo_fixo_mensal: 300,
        horas_produtivas_mes: 0,
        volume_mensal_estimado: 120,
      },
    });
    expect(porPeca.componentes.fixo_rateado).toBe(2.5);
    const desligado = calcularCustoPeca({
      ...peca(c),
      fixo: {
        metodo: "desligado",
        custo_fixo_mensal: 300,
        horas_produtivas_mes: 0,
        volume_mensal_estimado: 0,
      },
    });
    expect(desligado.componentes.fixo_rateado).toBe(0);
    expect(desligado.custo_total).toBe(desligado.custo_variavel);
  });
});

describe("REF-7.4: caso de referência da spec", () => {
  const c = porId("REF-7.4");
  const r = calcularCustoPeca(peca(c));
  it("bate com a tabela da seção 7.4", () => {
    const e = c.esperado as unknown as {
      componentes: Record<string, number>;
      maquina: number;
      custo_total: number;
      custo_total_exato_prefixo: string;
    };
    for (const [k, v] of Object.entries(e.componentes))
      expect(r.componentes[k as keyof typeof r.componentes]).toBe(v);
    expect(Math.round((r.componentes.depreciacao + r.componentes.manutencao) * 10000) / 10000).toBe(
      e.maquina,
    );
    expect(r.custo_total).toBe(e.custo_total);
    expect(r.exato.custo_total.startsWith(e.custo_total_exato_prefixo)).toBe(true);
  });
});

describe("validação", () => {
  it("recusa f >= 1, w negativo, n fracionado e fixo sem base", () => {
    const base = peca(porId("A1"));
    expect(validarEntradas({ ...base, taxa_falha: 1 })).toContain("taxa_falha_invalida");
    expect(validarEntradas({ ...base, desperdicio: -0.1 })).toContain("desperdicio_invalido");
    expect(validarEntradas({ ...base, pecas_por_ciclo: 1.5 })).toContain(
      "pecas_por_ciclo_invalido",
    );
    expect(
      validarEntradas({
        ...base,
        fixo: {
          metodo: "hora",
          custo_fixo_mensal: 100,
          horas_produtivas_mes: 0,
          volume_mensal_estimado: 0,
        },
      }),
    ).toContain("fixo_sem_horas");
    expect(() => calcularCustoPeca({ ...base, taxa_falha: 1 })).toThrow("taxa_falha_invalida");
  });
  it("custo nunca é negativo", () => {
    const r = calcularCustoPeca({ ...peca(porId("A2")), peso_g: 0, tempo_ciclo_min: 0 });
    expect(Object.values(r.componentes).every((v) => v >= 0)).toBe(true);
  });
});

describe("componentes desligados", () => {
  it("componente desligado entra como zero sem mudar os outros", () => {
    const base = peca(porId("A2"));
    const r = calcularCustoPeca({ ...base, desligados: ["embalagem", "fixo_rateado"] });
    const cheio = calcularCustoPeca(base);
    expect(r.componentes.embalagem).toBe(0);
    expect(r.componentes.fixo_rateado).toBe(0);
    expect(r.componentes.material).toBe(cheio.componentes.material);
    expect(r.custo_total).toBeCloseTo(
      cheio.custo_total - cheio.componentes.embalagem - cheio.componentes.fixo_rateado,
      3,
    );
    expect(r.exato.fixo_rateado).toBe("0");
  });
});
