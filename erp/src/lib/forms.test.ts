import { describe, it, expect } from "vitest";
import { z } from "zod";
import { campoFracao, campoInteiro, campoValor, errosDoZod, lerCampos } from "./forms";

describe("forms", () => {
  it("errosDoZod guarda o primeiro erro de cada campo", () => {
    const schema = z.object({
      nome: z.string().min(1, { error: "nome_obrigatorio" }),
      email: z.email({ error: "email_invalido" }),
    });
    const r = schema.safeParse({ nome: "", email: "x" });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(errosDoZod(r.error).erros).toEqual({
        nome: "nome_obrigatorio",
        email: "email_invalido",
      });
  });
  it("lerCampos devolve string aparada e vazio para ausente", () => {
    const fd = new FormData();
    fd.set("nome", "  Shopee ");
    expect(lerCampos(fd, ["nome", "tipo"] as const)).toEqual({ nome: "Shopee", tipo: "" });
  });
});

describe("campos numéricos", () => {
  it("percentual digitado vira fração; vazio vira null; texto vira erro", () => {
    expect(campoFracao.safeParse("14,5").data).toBe(0.145);
    expect(campoFracao.safeParse("").data).toBeNull();
    expect(campoFracao.safeParse("abc").success).toBe(false);
    expect(campoFracao.safeParse("100").success).toBe(false);
  });
  it("valor e inteiro", () => {
    expect(campoValor.safeParse("4,00").data).toBe(4);
    expect(campoInteiro.safeParse("7").data).toBe(7);
    expect(campoInteiro.safeParse("7,5").success).toBe(false);
  });
});
