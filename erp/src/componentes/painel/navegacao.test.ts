import { describe, it, expect } from "vitest";
import { gruposVisiveis, itemAtivo, trilha } from "./navegacao";

describe("navegacao", () => {
  it("na fase 1 o dono vê Início e as quatro configurações", () => {
    const grupos = gruposVisiveis("dono", 1);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Geral", "Configurações"]);
    expect(gruposVisiveis("dono", 2).map((g) => g.rotulo)).toEqual(["Geral", "Conhecimento", "Configurações"]);
    expect(grupos[1].itens.map((i) => i.rotulo)).toEqual(["Canais de venda", "Categorias", "Unidades", "Usuários"]);
  });
  it("leitura não vê Usuários", () => {
    const grupos = gruposVisiveis("leitura", 1);
    expect(grupos[1].itens.map((i) => i.rotulo)).toEqual(["Canais de venda", "Categorias", "Unidades"]);
  });
  it("itens de fases futuras aparecem quando a fase chega", () => {
    expect(gruposVisiveis("dono", 9).flatMap((g) => g.itens).some((i) => i.rota === "/alertas")).toBe(true);
    expect(gruposVisiveis("dono", 1).flatMap((g) => g.itens).some((i) => i.rota === "/alertas")).toBe(false);
  });
  it("marca o item ativo pela rota", () => {
    expect(itemAtivo("/configuracoes/canais/abc", "/configuracoes/canais")).toBe(true);
    expect(itemAtivo("/financeiro/lancamentos", "/financeiro")).toBe(false);
    expect(itemAtivo("/financeiro", "/financeiro")).toBe(true);
    expect(itemAtivo("/", "/")).toBe(true);
    expect(itemAtivo("/configuracoes", "/")).toBe(false);
  });
  it("monta a trilha do breadcrumb", () => {
    expect(trilha("/configuracoes/canais/abc").map((t) => t.rotulo)).toEqual(["Configurações", "Canais de venda", "abc"]);
    expect(trilha("/")).toEqual([]);
  });
});
