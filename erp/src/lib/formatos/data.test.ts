import { describe, it, expect } from "vitest";
import { formatarData, formatarDataHora, isoParaLocal, localParaIso } from "./data";

describe("data", () => {
  it("mostra datas em horário de São Paulo", () => {
    expect(formatarData("2026-10-11")).toBe("11/10/2026");
    expect(formatarDataHora("2026-10-12T01:30:00Z")).toBe("11/10/2026 22:30");
    expect(formatarData(null)).toBe("");
  });
});

describe("datas locais de São Paulo", () => {
  it("converte datetime-local para UTC e volta", () => {
    expect(localParaIso("2026-10-18T14:30")).toBe("2026-10-18T17:30:00.000Z");
    expect(localParaIso("2026-10-18")).toBe("2026-10-18T03:00:00.000Z");
    expect(localParaIso("18/10/2026")).toBeNull();
    expect(isoParaLocal("2026-10-18T17:30:00.000Z")).toBe("2026-10-18T14:30");
  });
});
