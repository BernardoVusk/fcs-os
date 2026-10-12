import { describe, expect, it } from "vitest";
import { custoRealizado, podeTransitar } from "./custo-realizado";
import { cargaPorImpressora, formatarCodigoOrdem } from "./carga";

const impressora = { depreciacao: 0.5, manutencao: 0.2, consumiveis: 0.1, energia: 0.114 };

describe("custo realizado da ordem", () => {
  it("material ao custo do lote, horas reais, mão de obra e complementares; perdas absorvidas pelas boas", () => {
    const r = custoRealizado({
      consumos: [
        { insumo_id: "pla", lote_id: "l1", quantidade: 350, custo_unitario: 0.10165 },
        { insumo_id: "pla", lote_id: "l2", quantidade: 50, custo_unitario: 0.12837 },
      ],
      horas_maquina: 8.5,
      impressora,
      minutos_mao_de_obra: 45,
      custo_hora_mao_obra: 30,
      complementares_por_peca: 0.4,
      quantidade_aprovada: 9,
      quantidade_perdida: 1,
    });
    expect(r.material).toBe(41.996);
    expect(r.maquina).toBe(6.8);
    expect(r.energia).toBe(0.969);
    expect(r.mao_de_obra).toBe(22.5);
    expect(r.complementares).toBe(3.6);
    expect(r.total).toBe(75.865);
    expect(r.por_peca_boa).toBe(8.4294);
    expect(r.perda_producao).toBe(0);
  });
  it("sem peça aprovada, tudo vira perda de produção e não há custo por peça", () => {
    const r = custoRealizado({
      consumos: [{ insumo_id: "pla", lote_id: "l1", quantidade: 100, custo_unitario: 0.1 }],
      horas_maquina: 2,
      impressora,
      minutos_mao_de_obra: 10,
      custo_hora_mao_obra: 30,
      complementares_por_peca: 0.4,
      quantidade_aprovada: 0,
      quantidade_perdida: 2,
    });
    expect(r.complementares).toBe(0);
    expect(r.por_peca_boa).toBeNull();
    expect(r.perda_producao).toBe(r.total);
    expect(r.total).toBe(16.828);
  });
  it("sem impressora não há custo de máquina nem energia", () => {
    const r = custoRealizado({
      consumos: [],
      horas_maquina: 3,
      impressora: null,
      minutos_mao_de_obra: 0,
      custo_hora_mao_obra: 30,
      complementares_por_peca: 0,
      quantidade_aprovada: 1,
      quantidade_perdida: 0,
    });
    expect(r.total).toBe(0);
  });
});

describe("transições e carga", () => {
  it("transições permitidas", () => {
    expect(podeTransitar("fila", "imprimindo")).toBe(true);
    expect(podeTransitar("fila", "concluida")).toBe(false);
    expect(podeTransitar("concluida", "acabamento")).toBe(true);
    expect(podeTransitar("cancelada", "concluida")).toBe(false);
  });
  it("carga por impressora soma só ordens abertas e aponta excesso e atrasos", () => {
    const carga = cargaPorImpressora(
      [
        {
          id: "1",
          impressora_id: "a",
          status: "fila",
          tempo_previsto_min: 300,
          prazo: "2026-10-10",
        },
        {
          id: "2",
          impressora_id: "a",
          status: "imprimindo",
          tempo_previsto_min: 240,
          prazo: "2026-10-20",
        },
        { id: "3", impressora_id: "a", status: "concluida", tempo_previsto_min: 999, prazo: null },
        { id: "4", impressora_id: null, status: "fila", tempo_previsto_min: 60, prazo: null },
      ],
      { a: 8 },
      "2026-10-12",
    );
    expect(carga).toEqual([
      {
        impressora_id: "a",
        ordens: 2,
        minutos_previstos: 540,
        horas_disponiveis: 8,
        excesso_min: 60,
        atrasadas: 1,
      },
      {
        impressora_id: null,
        ordens: 1,
        minutos_previstos: 60,
        horas_disponiveis: null,
        excesso_min: 0,
        atrasadas: 0,
      },
    ]);
    expect(formatarCodigoOrdem(7)).toBe("OP-0007");
  });
});
