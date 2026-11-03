import { describe, expect, it } from "vitest";
import { custoProducaoRapido, validarCustoRapido, type EntradasCustoRapido } from "./custo-rapido";

const zero: EntradasCustoRapido = {
  horas: 0,
  gramas: 0,
  filamento_kg: 0,
  energia_hora: 0,
  maquina_hora: 0,
  falha: 0,
  acabamento: 0,
  pintura: 0,
  fixacao: 0,
  extras: 0,
  embalagem: [],
};

describe("custo rápido no formato da planilha", () => {
  it("reproduz a aba Custo De Impressão: 3 h, 104,58 g a R$ 57/kg, energia 0,80/h, caixa e plástico bolha", () => {
    const c = custoProducaoRapido({
      ...zero,
      horas: 3,
      gramas: 104.58,
      filamento_kg: 57,
      energia_hora: 0.8,
      extras: 0.2,
      embalagem: [
        { quantidade: 1, custo_unitario: 1.38 },
        { quantidade: 1, custo_unitario: 0.5 },
      ],
    });
    expect(c.material).toBe(5.9611);
    expect(c.energia).toBe(2.4);
    expect(c.embalagem).toBe(1.88);
    expect(c.total).toBe(10.4411);
    expect(c.total_exato).toBe("10.44106");
  });

  it("falha repõe material, energia e máquina, e não toca em acabamento e embalagem", () => {
    const c = custoProducaoRapido({
      ...zero,
      horas: 1,
      gramas: 100,
      filamento_kg: 100,
      energia_hora: 2,
      maquina_hora: 3,
      falha: 0.2,
      acabamento: 5,
      embalagem: [{ quantidade: 2, custo_unitario: 1 }],
    });
    expect(c.falhas).toBe(3.75);
    expect(c.total).toBe(10 + 2 + 3 + 3.75 + 5 + 2);
  });

  it("recusa falha de 100 % e valor negativo", () => {
    expect(validarCustoRapido({ ...zero, falha: 1 })).toContain("taxa_falha_invalida");
    expect(validarCustoRapido({ ...zero, gramas: -1 })).toContain("valor_negativo");
    expect(
      validarCustoRapido({ ...zero, embalagem: [{ quantidade: 1, custo_unitario: -2 }] }),
    ).toContain("valor_negativo");
    expect(() => custoProducaoRapido({ ...zero, falha: 1 })).toThrow("taxa_falha_invalida");
  });
});
