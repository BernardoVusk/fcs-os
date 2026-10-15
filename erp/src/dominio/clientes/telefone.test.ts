import { describe, expect, it } from "vitest";
import { formatarTelefone, normalizarTelefone } from "./telefone";

describe("normalizarTelefone", () => {
  it("guarda só os dígitos de um celular com DDD", () => {
    expect(normalizarTelefone("(31) 99999-9999")).toBe("31999999999");
  });
  it("aceita fixo com 10 dígitos", () => {
    expect(normalizarTelefone("3133334444")).toBe("3133334444");
  });
  it("tira o 55 do país quando vem com ele", () => {
    expect(normalizarTelefone("+55 31 99999-9999")).toBe("31999999999");
    expect(normalizarTelefone("5531999999999")).toBe("31999999999");
    expect(normalizarTelefone("553133334444")).toBe("3133334444");
  });
  it("recusa número curto, longo ou vazio", () => {
    expect(normalizarTelefone("999")).toBeNull();
    expect(normalizarTelefone("")).toBeNull();
    expect(normalizarTelefone("31 99999 99999 9")).toBeNull();
    expect(normalizarTelefone(null)).toBeNull();
  });
});

describe("formatarTelefone", () => {
  it("formata celular e fixo", () => {
    expect(formatarTelefone("31999999999")).toBe("(31) 99999-9999");
    expect(formatarTelefone("3133334444")).toBe("(31) 3333-4444");
  });
  it("devolve o texto como veio quando não reconhece", () => {
    expect(formatarTelefone("abc")).toBe("abc");
    expect(formatarTelefone(null)).toBe("");
  });
});
