import { describe, it, expect } from "vitest";
import { formatarMoeda, formatarPercentual } from "./moeda";

const semEspacoFixo = (s: string) => s.replace(/ /g, " ");

describe("moeda", () => {
  it("formata reais", () => {
    expect(semEspacoFixo(formatarMoeda(1234.5))).toBe("R$ 1.234,50");
    expect(semEspacoFixo(formatarMoeda("0.06", 4))).toBe("R$ 0,0600");
    expect(formatarMoeda(null)).toBe("Sem dados");
  });
  it("formata fração como percentual com 1 casa", () => {
    expect(semEspacoFixo(formatarPercentual(0.145))).toBe("14,5 %");
    expect(formatarPercentual(null)).toBe("Não configurado");
  });
});
