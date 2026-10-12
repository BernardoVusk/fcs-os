import { describe, it, expect } from "vitest";
import { landedPorLinha, ratear } from "./rateio";
import { custoDeReposicao, custoMedio, valorDaSaida } from "./custo-medio";
import { paraBase, quantidadeBaseDaLinha } from "./conversao";

const UNIDADES = [
  { codigo: "g", base: null, fator_para_base: 1 },
  { codigo: "kg", base: "g", fator_para_base: 1000 },
  { codigo: "un", base: null, fator_para_base: 1 },
];

describe("rateio (Anexo B1)", () => {
  const linhas = [
    { id: "pla", valor: 190, quantidade: 2 },
    { id: "petg", valor: 110, quantidade: 1 },
  ];
  it("rateia por valor com 4 casas e fecha a soma na maior linha", () => {
    expect(ratear(linhas, 30)).toEqual({ pla: 19, petg: 11 });
    expect(ratear(linhas, 25)).toEqual({ pla: 15.8333, petg: 9.1667 });
    const r = ratear(linhas, 25);
    expect(Math.round((r.pla + r.petg) * 10000) / 10000).toBe(25);
  });
  it("rateia por quantidade quando pedido", () => {
    expect(ratear(linhas, 30, "quantidade")).toEqual({ pla: 20, petg: 10 });
  });
  it("calcula o landed e o custo por grama", () => {
    const r = landedPorLinha(
      [
        { id: "pla", valor: 190, quantidade: 2, descontoItem: 0, quantidadeBase: 2000 },
        { id: "petg", valor: 110, quantidade: 1, descontoItem: 0, quantidadeBase: 1000 },
      ],
      { frete: 30, descontoTotal: 15, outrosCustos: 6, precoIncluiFrete: false },
    );
    expect(r.pla).toEqual({ landed: 203.3, custoUnitario: 0.10165 });
    expect(r.petg).toEqual({ landed: 117.7, custoUnitario: 0.1177 });
    expect(Math.round((r.pla.landed + r.petg.landed) * 10000) / 10000).toBe(321);
  });
  it("preço com frete incluso não soma o frete de novo", () => {
    const r = landedPorLinha(
      [{ id: "a", valor: 100, quantidade: 1, descontoItem: 0, quantidadeBase: 1000 }],
      {
        frete: 30,
        descontoTotal: 0,
        outrosCustos: 0,
        precoIncluiFrete: true,
      },
    );
    expect(r.a.landed).toBe(100);
    expect(r.a.custoUnitario).toBe(0.1);
  });
});

describe("custo médio e saída (Anexo B2)", () => {
  it("média ponderada após duas entradas e saída ao custo do lote", () => {
    expect(custoMedio([{ quantidade: 1000, valor: 101.65 }])).toBe(0.10165);
    expect(
      custoMedio([
        { quantidade: 1000, valor: 101.65 },
        { quantidade: 1000, valor: 128.37 },
      ]),
    ).toBe(0.11501);
    expect(valorDaSaida({ quantidade: 1000, valor: 101.65, custoUnitario: 0.10165 }, 350)).toBe(
      35.5775,
    );
    expect(
      custoMedio([
        { quantidade: 650, valor: 66.0725 },
        { quantidade: 1000, valor: 128.37 },
      ]),
    ).toBe(0.117844);
    expect(valorDaSaida({ quantidade: 650, valor: 66.0725, custoUnitario: 0.10165 }, 650)).toBe(
      66.0725,
    );
    expect(valorDaSaida({ quantidade: 1000, valor: 128.37, custoUnitario: 0.12837 }, 50)).toBe(
      6.4185,
    );
    expect(
      custoMedio([
        { quantidade: 0, valor: 0 },
        { quantidade: 950, valor: 121.9515 },
      ]),
    ).toBe(0.12837);
    expect(custoMedio([])).toBeNull();
  });
  it("valorar o consumo pela média reprova (controle negativo do Anexo)", () => {
    const media = custoMedio([
      { quantidade: 1000, valor: 101.65 },
      { quantidade: 1000, valor: 128.37 },
    ])!;
    expect(Math.round(350 * media * 10000) / 10000).toBe(40.2535);
    expect(valorDaSaida({ quantidade: 1000, valor: 101.65, custoUnitario: 0.10165 }, 350)).not.toBe(
      40.2535,
    );
  });
  it("custo de reposição segue a origem configurada", () => {
    expect(
      custoDeReposicao({
        origem_custo: "media",
        custo_medio: 0.11,
        ultimo_custo: 0.12,
        custo_manual: null,
      }),
    ).toEqual({ valor: 0.11, origem: "media" });
    expect(
      custoDeReposicao({
        origem_custo: "ultima_entrada",
        custo_medio: 0.11,
        ultimo_custo: 0.12,
        custo_manual: null,
      }),
    ).toEqual({
      valor: 0.12,
      origem: "ultima_entrada",
    });
    expect(
      custoDeReposicao({
        origem_custo: "manual",
        custo_medio: 0.11,
        ultimo_custo: 0.12,
        custo_manual: 0.1,
      }),
    ).toEqual({ valor: 0.1, origem: "manual" });
    expect(
      custoDeReposicao({
        origem_custo: "media",
        custo_medio: null,
        ultimo_custo: 0.12,
        custo_manual: null,
      }),
    ).toEqual({
      valor: 0.12,
      origem: "ultima_entrada",
    });
    expect(
      custoDeReposicao({
        origem_custo: "media",
        custo_medio: null,
        ultimo_custo: null,
        custo_manual: null,
      }).valor,
    ).toBeNull();
  });
});

describe("conversão", () => {
  it("converte para a base e trata filamento em rolos", () => {
    expect(paraBase(2, "kg", "g", UNIDADES)).toBe(2000);
    expect(paraBase(5, "un", "g", UNIDADES)).toBeNull();
    expect(paraBase(5, "g", "g", UNIDADES)).toBe(5);
    expect(
      quantidadeBaseDaLinha(
        { quantidade: 2, unidade: "un", pesoUtilG: 1000 },
        { tipo: "filamento", unidade_base: "g" },
        UNIDADES,
      ),
    ).toBe(2000);
    expect(
      quantidadeBaseDaLinha(
        { quantidade: 2, unidade: "un", pesoUtilG: null },
        { tipo: "filamento", unidade_base: "g" },
        UNIDADES,
      ),
    ).toBeNull();
    expect(
      quantidadeBaseDaLinha(
        { quantidade: 50, unidade: "un", pesoUtilG: null },
        { tipo: "embalagem", unidade_base: "un" },
        UNIDADES,
      ),
    ).toBe(50);
  });
});
