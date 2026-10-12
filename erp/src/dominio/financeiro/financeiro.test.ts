import { describe, expect, it } from "vitest";
import {
  estadoDe,
  estaAtrasado,
  podeCancelar,
  podeEstornar,
  podeRealizar,
  saldoRestante,
  validarRealizacao,
} from "./estados";
import { saldoProjetado, serieProjecao, totaisAbertos, type LancamentoProjecao } from "./projecao";
import { dreGerencial } from "./dre";
import { ocorrencias } from "./recorrencia";

const base = {
  valor_previsto: 100,
  valor_realizado: 0,
  cancelado_em: null,
  estornado_em: null,
  encerrado_em: null,
};

describe("máquina de estados do lançamento", () => {
  it("planejado, parcial, realizado, cancelado e estornado; parcial não cancela; realizado só estorna", () => {
    expect(estadoDe(base)).toBe("planejado");
    expect(estadoDe({ ...base, valor_realizado: 40 })).toBe("parcial");
    expect(estadoDe({ ...base, valor_realizado: 100 })).toBe("realizado");
    expect(estadoDe({ ...base, valor_realizado: 99.996 })).toBe("realizado");
    expect(estadoDe({ ...base, valor_realizado: 40, encerrado_em: "2026-10-12" })).toBe(
      "realizado",
    );
    expect(estadoDe({ ...base, cancelado_em: "2026-10-12" })).toBe("cancelado");
    expect(estadoDe({ ...base, valor_realizado: 100, estornado_em: "2026-10-12" })).toBe(
      "estornado",
    );
    expect(podeCancelar("parcial")).toBe(false);
    expect(podeCancelar("planejado")).toBe(true);
    expect(podeEstornar("realizado")).toBe(true);
    expect(podeEstornar("parcial")).toBe(false);
    expect(podeRealizar("cancelado")).toBe(false);
    expect(saldoRestante({ valor_previsto: 100, valor_realizado: 40 })).toBe(60);
    expect(saldoRestante({ valor_previsto: 100, valor_realizado: 120 })).toBe(0);
  });
  it("valida realização e deriva atraso", () => {
    expect(validarRealizacao(base, 100)).toBeNull();
    expect(validarRealizacao(base, 100.004)).toBeNull();
    expect(validarRealizacao(base, 100.01)).toBe("valor_acima_do_restante");
    expect(validarRealizacao(base, 0)).toBe("valor_invalido");
    expect(validarRealizacao({ ...base, cancelado_em: "x" }, 10)).toBe("lancamento_nao_aberto");
    expect(estaAtrasado({ ...base, data_prevista: "2026-10-01" }, "2026-10-12")).toBe(true);
    expect(
      estaAtrasado({ ...base, valor_realizado: 100, data_prevista: "2026-10-01" }, "2026-10-12"),
    ).toBe(false);
  });
});

describe("projeção de caixa", () => {
  const hoje = "2026-10-12";
  const lancs: LancamentoProjecao[] = [
    { ...base, tipo: "receita", valor_previsto: 62.37, data_prevista: "2026-10-19" },
    { ...base, tipo: "despesa", valor_previsto: 200, data_prevista: "2026-10-05" },
    {
      ...base,
      tipo: "despesa",
      valor_previsto: 50,
      valor_realizado: 20,
      data_prevista: "2026-10-20",
    },
    { ...base, tipo: "despesa", valor_previsto: 999, data_prevista: "2026-12-01" },
    { ...base, tipo: "transferencia", valor_previsto: 500, data_prevista: "2026-10-13" },
    {
      ...base,
      tipo: "despesa",
      valor_previsto: 10,
      cancelado_em: "x",
      data_prevista: "2026-10-13",
    },
  ];
  it("atrasados entram hoje, transferências e cancelados ficam fora", () => {
    expect(saldoProjetado(1000, lancs, hoje, hoje)).toBe(800);
    expect(saldoProjetado(1000, lancs, "2026-10-19", hoje)).toBe(862.37);
    expect(saldoProjetado(1000, lancs, "2026-10-31", hoje)).toBe(832.37);
    expect(saldoProjetado(1000, lancs, "2026-12-31", hoje)).toBe(-166.63);
    const serie = serieProjecao(1000, lancs, hoje, 7);
    expect(serie[0]).toEqual({ data: hoje, saldo: 800 });
    expect(serie[7]).toEqual({ data: "2026-10-19", saldo: 862.37 });
  });
  it("invariante: realizar um lançamento move o valor do projetado para o caixa sem mudar a soma", () => {
    const antes = saldoProjetado(1000, lancs, "2026-12-31", hoje);
    const depois = lancs.map((l) =>
      l.valor_previsto === 200 ? { ...l, valor_realizado: 200 } : l,
    );
    expect(saldoProjetado(800, depois, "2026-12-31", hoje)).toBe(antes);
  });
  it("totais vencidos e próximos", () => {
    const t = totaisAbertos(lancs, hoje);
    expect(t.vencidos).toEqual({ receber: 0, pagar: 200 });
    expect(t.proximos7).toEqual({ receber: 62.37, pagar: 0 });
    expect(t.proximos30).toEqual({ receber: 62.37, pagar: 30 });
  });
});

describe("DRE gerencial", () => {
  it("exclui estornos, transferências e categorias embutidas no custo", () => {
    const dre = dreGerencial(
      [
        {
          tipo: "receita",
          data: "2026-10-05",
          valor: 500,
          categoria: { nome: "Vendas", natureza: "variavel", embutido_no_custo: false },
          estorno: false,
        },
        {
          tipo: "receita",
          data: "2026-10-06",
          valor: 50,
          categoria: { nome: "Vendas", natureza: "variavel", embutido_no_custo: false },
          estorno: true,
        },
        {
          tipo: "despesa",
          data: "2026-10-07",
          valor: 120,
          categoria: { nome: "Insumos", natureza: "variavel", embutido_no_custo: true },
          estorno: false,
        },
        {
          tipo: "despesa",
          data: "2026-10-08",
          valor: 80,
          categoria: { nome: "Software", natureza: "fixa", embutido_no_custo: false },
          estorno: false,
        },
        {
          tipo: "despesa",
          data: "2026-10-09",
          valor: 30,
          categoria: { nome: "Taxas de canal", natureza: "variavel", embutido_no_custo: false },
          estorno: false,
        },
        { tipo: "transferencia", data: "2026-10-09", valor: 300, categoria: null, estorno: false },
        { tipo: "despesa", data: "2026-11-01", valor: 999, categoria: null, estorno: false },
      ],
      "2026-10-01",
      "2026-10-31",
    );
    expect(dre.receitas).toBe(500);
    expect(dre.despesas_fixas).toBe(80);
    expect(dre.despesas_variaveis).toBe(30);
    expect(dre.resultado).toBe(390);
    expect(dre.embutidas_no_custo).toBe(120);
    expect(dre.linhas_despesa).toEqual([
      { categoria: "Software", natureza: "fixa", valor: 80 },
      { categoria: "Taxas de canal", natureza: "variavel", valor: 30 },
    ]);
  });
});

describe("recorrência", () => {
  it("mensal no dia 31 cai no último dia de fevereiro e volta ao 31 em março", () => {
    const o = ocorrencias(
      { frequencia: "mensal", dia: 31, inicio: "2026-01-31", fim: null },
      "2026-01-15",
      3,
    );
    expect(o.map((x) => x.data_prevista)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(o[1].competencia).toBe("2026-02");
  });
  it("respeita início futuro e fim; anual e semanal", () => {
    expect(
      ocorrencias(
        { frequencia: "mensal", dia: 10, inicio: "2026-12-01", fim: null },
        "2026-10-12",
        3,
      ).map((x) => x.data_prevista),
    ).toEqual(["2026-12-10", "2027-01-10"]);
    expect(
      ocorrencias(
        { frequencia: "mensal", dia: 10, inicio: "2026-01-01", fim: "2026-11-15" },
        "2026-10-12",
        3,
      ).map((x) => x.data_prevista),
    ).toEqual(["2026-10-10", "2026-11-10"]);
    expect(
      ocorrencias(
        { frequencia: "anual", dia: null, inicio: "2025-11-20", fim: null },
        "2026-10-12",
        3,
      ).map((x) => x.data_prevista),
    ).toEqual(["2026-11-20"]);
    expect(
      ocorrencias(
        { frequencia: "semanal", dia: null, inicio: "2026-10-05", fim: null },
        "2026-10-12",
        0,
      ).map((x) => x.data_prevista),
    ).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  });
});
