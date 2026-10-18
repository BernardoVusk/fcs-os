import { describe, expect, it } from "vitest";
import { intervaloPersonalizado } from "./periodo";

describe("intervalo personalizado", () => {
  it("inclui o dia final inteiro, em São Paulo", () => {
    expect(intervaloPersonalizado("2026-10-01", "2026-10-15")).toEqual({
      inicio: "2026-10-01T03:00:00.000Z",
      fim: "2026-10-16T03:00:00.000Z",
    });
  });
  it("recusa ordem invertida e formato errado", () => {
    expect(intervaloPersonalizado("2026-10-15", "2026-10-01")).toBeNull();
    expect(intervaloPersonalizado("01/10/2026", "2026-10-15")).toBeNull();
    expect(intervaloPersonalizado(undefined, "2026-10-15")).toBeNull();
  });
});
