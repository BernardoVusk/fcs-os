import { describe, expect, it } from "vitest";
import {
  clickrefsAwin,
  codigoRastreio,
  linkAmazon,
  linkColadoAceito,
  subIdsShopee,
  tagAmazonValida,
} from "./links-afiliado";
import { validarCampos, META_INTEGRACAO } from "./integracoes";

const G = "3f2a9c10-1111-4222-8333-444455556666";
const O = "aa11bb22-0000-4000-8000-000000000001";

describe("links de afiliado", () => {
  it("sub IDs e clickrefs só com letras e números", () => {
    expect(subIdsShopee({ grupoId: G, campanha: "Black Friday 2026", ofertaId: O })).toEqual([
      "g3f2a9c10",
      "cBlackFriday2026",
      "oaa11bb22",
    ]);
    expect(subIdsShopee({})).toEqual([]);
    expect(clickrefsAwin({ grupoId: G, ofertaId: O })).toEqual({
      clickref: "g3f2a9c10",
      clickref2: "oaa11bb22",
    });
    expect(codigoRastreio("Ação & Promoção!")).toBe("AcaoPromocao");
  });

  it("Amazon: link canônico com tag válida e recusa tag ou ASIN errados", () => {
    expect(linkAmazon("B0ABCDEF12", "fcs3d-20")).toBe(
      "https://www.amazon.com.br/dp/B0ABCDEF12?tag=fcs3d-20",
    );
    expect(tagAmazonValida("fcs3d-20")).toBe(true);
    expect(tagAmazonValida("fcs3d")).toBe(false);
    expect(() => linkAmazon("curto", "fcs3d-20")).toThrow("asin_invalido");
    expect(() => linkAmazon("B0ABCDEF12", "x")).toThrow("tag_invalida");
  });

  it("link colado só da própria plataforma", () => {
    expect(linkColadoAceito("mercado_livre", "https://mercadolivre.com/sec/1aB2")).toBe(true);
    expect(linkColadoAceito("mercado_livre", "https://bit.ly/abc")).toBe(false);
    expect(linkColadoAceito("shopee", "http://s.shopee.com.br/abc")).toBe(false);
    expect(linkColadoAceito("awin", "https://loja.com.br/x", ["loja.com.br"])).toBe(true);
  });

  it("campos da integração: obrigatório e formato", () => {
    const shopee = META_INTEGRACAO.shopee;
    expect(validarCampos(shopee.publicos, { app_id: "" }, true)).toEqual({
      app_id: "campo_obrigatorio",
    });
    expect(validarCampos(shopee.publicos, { app_id: "abc" }, true)).toEqual({
      app_id: "formato_invalido",
    });
    expect(validarCampos(shopee.publicos, { app_id: "123456" }, true)).toEqual({});
    expect(validarCampos(META_INTEGRACAO.amazon.publicos, { tag: "fcs3d-20" }, true)).toEqual({});
  });
});
