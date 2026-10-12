import { describe, it, expect } from "vitest";
import { formatarNumero, lerNumeroPt, percentualParaFracao } from "./numero";

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
