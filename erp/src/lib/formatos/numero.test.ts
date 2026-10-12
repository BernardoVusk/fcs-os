import { describe, it, expect } from "vitest";
import { formatarNumero, lerNumeroPt, percentualParaFracao, numeroParaCampo } from "./numero";

describe("numero", () => {
  it("lê número no formato brasileiro e no americano", () => {
    expect(lerNumeroPt("1.234,56")).toBe(1234.56);
    expect(lerNumeroPt("14,5")).toBe(14.5);
    expect(lerNumeroPt("1234.56")).toBe(1234.56);
    expect(lerNumeroPt("4")).toBe(4);
    expect(lerNumeroPt("")).toBeNull();
    expect(lerNumeroPt("abc")).toBeNull();
    expect(lerNumeroPt("-1")).toBe(-1);
  });
  it("converte percentual digitado em fração com 6 casas", () => {
    expect(percentualParaFracao("14,5")).toBe(0.145);
    expect(percentualParaFracao("20")).toBe(0.2);
    expect(percentualParaFracao("0,0001")).toBe(0.000001);
    expect(percentualParaFracao("")).toBeNull();
  });
  it("formata com separadores brasileiros", () => {
    expect(formatarNumero(1234.5, 2)).toBe("1.234,50");
    expect(formatarNumero(null)).toBe("Sem dados");
  });
});

describe("campos numéricos (Fase 3)", () => {
  it("lê milhar com ponto sem vírgula como pt-BR e devolve valor sem agrupamento para inputs", () => {
    expect(lerNumeroPt("1.000")).toBe(1000);
    expect(lerNumeroPt("12.345.678")).toBe(12345678);
    expect(lerNumeroPt("0.125")).toBe(0.125);
    expect(lerNumeroPt("1.5")).toBe(1.5);
    expect(lerNumeroPt("1.000,50")).toBe(1000.5);
    expect(numeroParaCampo(1000, 0)).toBe("1000");
    expect(numeroParaCampo(0.10165, 6)).toBe("0,10165");
    expect(numeroParaCampo(95, 2)).toBe("95");
    expect(numeroParaCampo(null)).toBe("");
  });
});
