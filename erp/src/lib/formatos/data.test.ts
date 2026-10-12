import { describe, it, expect } from "vitest";
import { formatarData, formatarDataHora } from "./data";

describe("data", () => {
  it("mostra datas em horário de São Paulo", () => {
    expect(formatarData("2026-10-11")).toBe("11/10/2026");
    expect(formatarDataHora("2026-10-12T01:30:00Z")).toBe("11/10/2026 22:30");
    expect(formatarData(null)).toBe("");
  });
});
