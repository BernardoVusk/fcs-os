import { describe, expect, it } from "vitest";
import { CANAIS_SORTEIO, ORIGENS_SORTEIO, inscricaoSchema, origemSorteio } from "./inscricao";

const valida = {
  nome: "Ana Souza",
  email: "ana@exemplo.com",
  telefone: "(31) 99999-9999",
  canal: "shopee",
  produto_id: "4f0f7f4e-6c1a-4b0e-9e4a-1b2c3d4e5f60",
  produto_outro: "",
  aceita_contato: "on",
};

function erros(entrada: Record<string, string>) {
  const r = inscricaoSchema.safeParse(entrada);
  if (r.success) return {};
  const saida: Record<string, string> = {};
  for (const i of r.error.issues) {
    const campo = i.path.map(String).join(".");
    if (!(campo in saida)) saida[campo] = i.message;
  }
  return saida;
}

describe("inscricaoSchema", () => {
  it("aceita um cadastro completo e normaliza o telefone", () => {
    const r = inscricaoSchema.safeParse(valida);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.telefone).toBe("31999999999");
  });
  it("exige nome, e-mail válido, telefone válido, canal e consentimento", () => {
    expect(
      erros({ ...valida, nome: "A", email: "x", telefone: "12", canal: "", aceita_contato: "" }),
    ).toEqual({
      nome: "nome_obrigatorio",
      email: "email_invalido",
      telefone: "telefone_invalido",
      canal: "canal_obrigatorio",
      aceita_contato: "consentimento_obrigatorio",
    });
  });
  it("exige produto escolhido ou o texto de Outro", () => {
    expect(erros({ ...valida, produto_id: "" })).toEqual({ produto_id: "produto_obrigatorio" });
    expect(erros({ ...valida, produto_id: "outro" })).toEqual({
      produto_outro: "produto_obrigatorio",
    });
    const r = inscricaoSchema.safeParse({ ...valida, produto_id: "outro", produto_outro: "Vaso" });
    expect(r.success).toBe(true);
  });
  it("lista os três canais e as origens", () => {
    expect(CANAIS_SORTEIO.map((c) => c.tipo)).toEqual(["shopee", "mercado_livre", "tiktok_shop"]);
    expect(ORIGENS_SORTEIO).toEqual(["panfleto", "instagram", "outro"]);
    expect(origemSorteio("instagram")).toBe("instagram");
    expect(origemSorteio("qualquer")).toBe("panfleto");
    expect(origemSorteio(undefined)).toBe("panfleto");
  });
});
