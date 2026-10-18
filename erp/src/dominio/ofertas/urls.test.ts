import { describe, expect, it } from "vitest";
import { lerUrlOferta, urlsDoTexto } from "./urls";

const ler = (u: string) => {
  const r = lerUrlOferta(u, [{ advertiserId: 777, dominios: ["lojaexemplo.com.br"] }]);
  if (!r.ok) throw new Error(r.erro);
  return r.lida;
};

describe("lerUrlOferta", () => {
  it("Shopee: os dois formatos de produto e o link curto", () => {
    const a = ler("https://shopee.com.br/Miniatura-F1-i.1762381981.58207314279?sp_atk=x#topo");
    expect(a).toMatchObject({
      plataforma: "shopee",
      chaveProduto: "shopee:1762381981:58207314279",
      jaAfiliado: false,
      linkCurto: false,
    });
    expect(a.url).not.toContain("#topo");
    expect(ler("https://shopee.com.br/product/12/34").ids).toEqual({ shopId: "12", itemId: "34" });
    expect(ler("https://s.shopee.com.br/AbCd123")).toMatchObject({
      linkCurto: true,
      jaAfiliado: true,
      chaveProduto: null,
    });
    expect(ler("https://shopee.com.br/x-i.1.2?utm_medium=affiliates").jaAfiliado).toBe(true);
  });

  it("Amazon: ASIN nos formatos comuns e tag como afiliação", () => {
    expect(ler("https://www.amazon.com.br/Carrinho/dp/B0ABCDEF12/ref=sr_1_1").chaveProduto).toBe(
      "amazon:B0ABCDEF12",
    );
    expect(ler("https://amazon.com.br/gp/product/b0abcdef12?th=1").ids.asin).toBe("B0ABCDEF12");
    expect(ler("https://www.amazon.com.br/dp/B0ABCDEF12?tag=outro-20").jaAfiliado).toBe(true);
    expect(ler("https://amzn.to/3xYz")).toMatchObject({ linkCurto: true, jaAfiliado: true });
  });

  it("Mercado Livre: MLB com e sem traço e link de afiliado", () => {
    expect(
      ler("https://produto.mercadolivre.com.br/MLB-1234567890-miniatura-_JM").chaveProduto,
    ).toBe("mercado_livre:MLB1234567890");
    expect(ler("https://www.mercadolivre.com.br/p/MLB22334455").ids.mlb).toBe("MLB22334455");
    expect(ler("https://mercadolivre.com/sec/1aB2c3").jaAfiliado).toBe(true);
  });

  it("Awin: anunciante pelo domínio da lista de programas", () => {
    expect(ler("https://www.lojaexemplo.com.br/tenis/123/")).toMatchObject({
      plataforma: "awin",
      ids: { anuncianteAwin: 777 },
      chaveProduto: "awin:777:www.lojaexemplo.com.br/tenis/123",
    });
    expect(ler("https://tidd.ly/abc").jaAfiliado).toBe(true);
  });

  it("recusa domínio desconhecido, parecido, protocolo estranho e lixo", () => {
    expect(lerUrlOferta("https://shopee.com.br.golpe.com/x-i.1.2")).toEqual({
      ok: false,
      erro: "plataforma_desconhecida",
    });
    expect(lerUrlOferta("https://exemplo.com/produto")).toEqual({
      ok: false,
      erro: "plataforma_desconhecida",
    });
    expect(lerUrlOferta("javascript:alert(1)")).toEqual({ ok: false, erro: "url_nao_https" });
    expect(lerUrlOferta("ftp://shopee.com.br/x")).toEqual({ ok: false, erro: "url_nao_https" });
    expect(lerUrlOferta("texto")).toEqual({ ok: false, erro: "url_invalida" });
  });

  it("http vira https", () => {
    expect(ler("http://shopee.com.br/x-i.1.2").url.startsWith("https://")).toBe(true);
  });
});

describe("urlsDoTexto", () => {
  it("extrai links e tira pontuação final", () => {
    expect(
      urlsDoTexto("Olha https://s.shopee.com.br/abc. E também (https://amzn.to/x)! fim"),
    ).toEqual(["https://s.shopee.com.br/abc", "https://amzn.to/x"]);
  });
});
