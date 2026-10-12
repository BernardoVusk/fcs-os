import { describe, it, expect } from "vitest";
import { lerTema } from "./tema";

describe("lerTema", () => {
  it("escuro é o padrão", () => {
    expect(lerTema(undefined)).toBe("escuro");
    expect(lerTema("qualquer")).toBe("escuro");
    expect(lerTema("claro")).toBe("claro");
  });
});
