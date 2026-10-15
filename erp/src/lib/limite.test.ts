import { describe, it, expect } from "vitest";
import { Limitador } from "./limite";

describe("Limitador", () => {
  it("bloqueia a partir do máximo e libera quando a janela passa", () => {
    const l = new Limitador(3, 1000);
    expect(l.permitir("a", 0).permitido).toBe(true);
    expect(l.permitir("a", 10).permitido).toBe(true);
    expect(l.permitir("a", 20)).toEqual({ permitido: true, restante: 0 });
    expect(l.permitir("a", 30).permitido).toBe(false);
    expect(l.permitir("b", 30).permitido).toBe(true);
    expect(l.permitir("a", 1011).permitido).toBe(true);
  });
});
