import { describe, it, expect } from "vitest";
import { gerarSlug } from "./slug";
import { contemSegredo } from "./segredos";
import { escopoPara, lerEscopos, temEscopo } from "./escopos";
import { lerTags } from "./tipos";

describe("slug", () => {
  it("normaliza acentos, símbolos e tamanho", () => {
    expect(gerarSlug("Perfil PETG na Ender 3: 235 °C")).toBe("perfil-petg-na-ender-3-235-c");
    expect(gerarSlug("   ")).toBe("");
    expect(gerarSlug("a".repeat(100)).length).toBe(80);
  });
});

describe("segredos", () => {
  it("acha chaves e variáveis sensíveis", () => {
    expect(contemSegredo("use a chave sk-abc123def456ghi789jkl").achou).toBe(true);
    expect(contemSegredo("SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi")).toEqual({
      achou: true,
      padrao: "variavel_sensivel",
    });
    expect(contemSegredo("token fcs_" + "x".repeat(24))).toEqual({
      achou: true,
      padrao: "token_fcs",
    });
  });
  it("deixa texto técnico comum passar", () => {
    expect(contemSegredo("o bico de 0,4 mm entope com PETG úmido; secar 6 h a 65 °C").achou).toBe(
      false,
    );
    expect(contemSegredo(null).achou).toBe(false);
  });
});

describe("escopos", () => {
  it("mapeia ferramenta para escopo e confere posse", () => {
    expect(escopoPara("kb_salvar")).toBe("conhecimento:escrever");
    expect(temEscopo(["conhecimento:ler"], "conhecimento:ler")).toBe(true);
    expect(temEscopo(["conhecimento:ler"], "conhecimento:escrever")).toBe(false);
    expect(lerEscopos(["custos:ler", "inventado"])).toEqual(["custos:ler"]);
  });
});

describe("tags", () => {
  it("separa, normaliza e remove repetidas", () => {
    expect(lerTags("petg, Ender 3 , PETG;  bico")).toEqual(["petg", "ender 3", "bico"]);
    expect(lerTags("")).toEqual([]);
  });
});
