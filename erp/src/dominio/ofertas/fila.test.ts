import { describe, expect, it } from "vitest";
import { linksColados, lerCsvShopee, previaLote } from "./fila";

describe("prévia do lote", () => {
  it("multiplica itens por grupos e estima o fim no mesmo dia", () => {
    const p = previaLote({
      itens: 4,
      grupos: 3,
      intervaloSegundos: 900,
      janela: { inicio: "08:00", fim: "22:00" },
      inicio: new Date("2026-10-18T12:00:00Z"),
    });
    expect(p).toMatchObject({ mensagens: 12, dias: 1 });
    expect(p.terminaEm?.toISOString()).toBe("2026-10-18T12:45:00.000Z");
  });
  it("lote que não cabe no dia mostra quantos dias leva e não inventa hora", () => {
    const p = previaLote({
      itens: 30,
      grupos: 1,
      intervaloSegundos: 3600,
      janela: { inicio: "08:00", fim: "12:00" },
      inicio: new Date(),
    });
    expect(p).toMatchObject({ dias: 6, terminaEm: null });
  });
});

describe("CSV da Shopee", () => {
  it("lê a coluna Offer Link, nome e preço quando existem, e ignora linha inválida ou repetida", () => {
    const csv = [
      "Item Id,Product Name,Price,Offer Link",
      "1,Miniatura F1,49.90,https://s.shopee.com.br/abc",
      '2,"Carro, escala 1:64",19.90,https://s.shopee.com.br/def',
      "3,Outro,10,https://bit.ly/x",
      "4,Repetido,10,https://s.shopee.com.br/abc",
    ].join("\n");
    const r = lerCsvShopee(csv);
    expect(r.ok && r.linhas.map((l) => [l.link, l.nome, l.preco])).toEqual([
      ["https://s.shopee.com.br/abc", "Miniatura F1", "49.90"],
      ["https://s.shopee.com.br/def", "Carro, escala 1:64", "19.90"],
    ]);
    expect(r.ok && r.ignoradas.map((i) => i.linha)).toEqual([3, 4]);
  });
  it("aceita ponto e vírgula e recusa arquivo sem coluna de link", () => {
    expect(lerCsvShopee("Nome;Link da oferta\nX;https://shopee.com.br/x-i.1.2").ok).toBe(true);
    expect(lerCsvShopee("Nome;Preço\nX;10")).toEqual({
      ok: false,
      erro: "csv_sem_coluna_link",
      colunas: ["Nome", "Preço"],
    });
    expect(lerCsvShopee("")).toMatchObject({ ok: false, erro: "csv_vazio" });
  });
});

describe("links colados", () => {
  it("separa por linha ou espaço e remove repetidos", () => {
    expect(linksColados("https://a.com/1\nhttps://a.com/2, https://a.com/1")).toEqual([
      "https://a.com/1",
      "https://a.com/2",
    ]);
  });
});
