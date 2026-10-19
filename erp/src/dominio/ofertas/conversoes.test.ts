import { describe, expect, it } from "vitest";
import {
  lerCliques,
  lerConversoes,
  lerDataRelatorio,
  lerValorRelatorio,
  separarCodigos,
} from "./conversoes";

describe("relatórios importados", () => {
  it("datas e valores nos formatos dos portais", () => {
    expect(lerDataRelatorio("05/10/2026 14:30")).toBe("2026-10-05T17:30:00.000Z");
    expect(lerDataRelatorio("2026-10-05")).toBe("2026-10-05T03:00:00.000Z");
    expect(lerDataRelatorio("2026-10-05T10:00:00Z")).toBe("2026-10-05T10:00:00.000Z");
    expect(lerDataRelatorio("ontem")).toBeNull();
    expect(lerValorRelatorio("R$ 1.234,56")).toBe("1234.56");
    expect(lerValorRelatorio("1,234.56")).toBe("1234.56");
    expect(lerValorRelatorio("")).toBeNull();
  });

  it("sub IDs juntos viram códigos separados", () => {
    expect(separarCodigos("g1a2b3c4d-cBlack-o9f8e7d6c")).toEqual([
      "g1a2b3c4d",
      "cBlack",
      "o9f8e7d6c",
    ]);
    expect(separarCodigos("fcs3d-20")).toEqual(["fcs3d-20"]);
  });

  it("lê conversões pelo mapa de colunas e ignora linha sem referência", () => {
    const r = lerConversoes(
      [
        ["Pedido", "Data", "Situação", "Comissão", "Tag"],
        ["123", "05/10/2026", "Aprovado", "R$ 8,00", "fcs3d-20"],
        ["", "05/10/2026", "x", "1", "y"],
      ],
      { ref: "Pedido", data: "Data", status: "Situação", comissao: "Comissão", codigo: "Tag" },
    );
    expect(r.ok && r.linhas).toEqual([
      {
        ref: "123",
        data: "2026-10-05T03:00:00.000Z",
        status: "Aprovado",
        venda: null,
        comissao: "8.00",
        codigos: ["fcs3d-20"],
      },
    ]);
    expect(lerConversoes([["A"]], { ref: "Pedido", data: "Data" })).toEqual({
      ok: false,
      erro: "csv_colunas_faltando",
    });
  });

  it("lê cliques por dia e código", () => {
    const r = lerCliques(
      [
        ["Dia", "Sub ID", "Cliques"],
        ["05/10/2026", "g1a2b3c4d", "1.234"],
      ],
      { data: "Dia", codigo: "Sub ID", cliques: "Cliques" },
    );
    expect(r.ok && r.linhas).toEqual([{ dia: "2026-10-05", codigo: "g1a2b3c4d", cliques: 1234 }]);
  });
});
