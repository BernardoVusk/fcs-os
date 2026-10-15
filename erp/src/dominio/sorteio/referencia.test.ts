import { describe, expect, it } from "vitest";
import { referenciaAtual, referenciaValida, rotuloReferencia } from "./referencia";

describe("referencia do sorteio", () => {
  it("usa o mês de São Paulo, não o UTC", () => {
    // 01/11 02:30 UTC ainda é 31/10 às 23:30 em São Paulo.
    expect(referenciaAtual(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10");
    expect(referenciaAtual(new Date("2026-11-01T03:30:00Z"))).toBe("2026-11");
  });
  it("valida o formato AAAA-MM com mês de 01 a 12", () => {
    expect(referenciaValida("2026-10")).toBe(true);
    expect(referenciaValida("2026-13")).toBe(false);
    expect(referenciaValida("2026-1")).toBe(false);
    expect(referenciaValida("")).toBe(false);
    expect(referenciaValida(undefined)).toBe(false);
  });
  it("rotula em português", () => {
    expect(rotuloReferencia("2026-10")).toBe("outubro de 2026");
  });
});
