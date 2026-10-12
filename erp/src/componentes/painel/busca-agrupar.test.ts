import { describe, it, expect } from "vitest";
import { agruparResultados, type ResultadoBusca } from "./busca-agrupar";

const r = (tipo: ResultadoBusca["tipo"], titulo: string, pontuacao = 1): ResultadoBusca => ({
  tipo,
  id: titulo,
  titulo,
  subtitulo: null,
  rota: `/x/${titulo}`,
  pontuacao,
});

describe("agruparResultados", () => {
  it("agrupa na ordem fixa dos tipos e mantém a ordem interna", () => {
    const grupos = agruparResultados([
      r("unidade", "grama"),
      r("canal", "Shopee"),
      r("canal", "TikTok", 0.5),
      r("categoria", "Games"),
    ]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Canais", "Categorias", "Unidades"]);
    expect(grupos[0].itens.map((i) => i.titulo)).toEqual(["Shopee", "TikTok"]);
  });
  it("lista vazia vira sem grupos", () => {
    expect(agruparResultados([])).toEqual([]);
  });
});
