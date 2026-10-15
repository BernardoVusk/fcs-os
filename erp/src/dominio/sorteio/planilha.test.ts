import { describe, expect, it } from "vitest";
import { tabelaInscricoes } from "./planilha";

describe("tabelaInscricoes", () => {
  it("monta cabeçalho e linhas com telefone formatado e produto de Outro", () => {
    const t = tabelaInscricoes([
      {
        criado_em: "2026-10-15T18:00:00Z",
        aceita_contato: true,
        origem: "panfleto",
        produto_outro: null,
        cliente: { nome: "Ana", email: "ana@exemplo.com", telefone: "31999999999" },
        produto: { nome: "Pista F1" },
        canal: { nome: "Shopee" },
      },
      {
        criado_em: "2026-10-16T18:00:00Z",
        aceita_contato: false,
        origem: "outro",
        produto_outro: "Vaso",
        cliente: { nome: "Bia", email: null, telefone: null },
        produto: null,
        canal: null,
      },
    ]);
    expect(t.cabecalho).toEqual([
      "Nome",
      "E-mail",
      "Telefone",
      "Produto",
      "Canal",
      "Aceita contato",
      "Origem",
      "Data",
    ]);
    expect(t.linhas).toEqual([
      [
        "Ana",
        "ana@exemplo.com",
        "(31) 99999-9999",
        "Pista F1",
        "Shopee",
        true,
        "panfleto",
        "15/10/2026 15:00",
      ],
      ["Bia", "", "", "Vaso", "", false, "outro", "16/10/2026 15:00"],
    ]);
  });
});
