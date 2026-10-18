import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { converterLink } from "./conversor";
import { assinaturaShopee, buscarProdutoShopee, produtoDoNoShopee, testarShopee } from "./shopee";
import { cupomDoBruto, gerarLinkAwin, programaDoBruto, testarAwin } from "./awin";
import { lerUrlOferta } from "@/dominio/ofertas/urls";

const resolver = async () => ["8.8.8.8"];
const G = "3f2a9c10-1111-4222-8333-444455556666";
const SHOPEE = { app_id: "123456", secret: "segredo-de-teste-123456" };
const AWIN = { publisher_id: "998877", api_token: "token-de-teste-com-mais-de-vinte" };

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function lida(u: string) {
  const r = lerUrlOferta(u, [{ advertiserId: 555, dominios: ["loja.com.br"] }]);
  if (!r.ok) throw new Error(r.erro);
  return r.lida;
}

describe("Shopee", () => {
  it("assinatura é SHA256 de AppId + Timestamp + corpo + Secret", () => {
    const esperado = createHash("sha256").update("1231700000000{}abc").digest("hex");
    expect(assinaturaShopee("123", 1700000000, "{}", "abc")).toBe(esperado);
  });

  it("gera link com sub IDs e manda o cabeçalho de assinatura", async () => {
    let cabecalho = "";
    let corpo = "";
    const buscar = (async (_u: URL | string, init?: RequestInit) => {
      cabecalho = String((init?.headers as Record<string, string>).authorization);
      corpo = String(init?.body);
      return json({ data: { generateShortLink: { shortLink: "https://s.shopee.com.br/novo" } } });
    }) as typeof fetch;
    const r = await converterLink(
      { lida: lida("https://shopee.com.br/x-i.10.20"), atribuicao: { grupoId: G } },
      { shopee: SHOPEE },
      { buscar, resolver },
    );
    expect(r).toEqual({ ok: true, url: "https://s.shopee.com.br/novo", origem: "api" });
    expect(cabecalho).toMatch(/^SHA256 Credential=123456, Timestamp=\d+, Signature=[a-f0-9]{64}$/);
    expect(corpo).toContain('subIds: [\\"g3f2a9c10\\"]');
    expect(corpo).not.toContain(SHOPEE.secret);
  });

  it("erro da API vira motivo, nunca o link original", async () => {
    const buscar = (async () =>
      json({
        errors: [{ message: "Invalid Signature", extensions: { code: 10020 } }],
      })) as typeof fetch;
    const r = await converterLink(
      { lida: lida("https://shopee.com.br/x-i.10.20"), atribuicao: {} },
      { shopee: SHOPEE },
      { buscar, resolver },
    );
    expect(r).toMatchObject({ ok: false, erro: "shopee_recusou" });
    expect(await testarShopee(SHOPEE, { buscar, resolver })).toMatchObject({ ok: false });
    const sem = await converterLink(
      { lida: lida("https://shopee.com.br/x-i.10.20"), atribuicao: {} },
      {},
    );
    expect(sem).toEqual({ ok: false, erro: "conversao_indisponivel" });
  });

  it("dados do produto: só o que a API mandou", async () => {
    const p = produtoDoNoShopee({
      productName: "Miniatura F1",
      priceMin: "49.9",
      priceMax: "59.9",
      priceDiscountRate: 25,
      ratingStar: "4.83",
      imageUrl: "https://down-br.img.susercontent.com/file/x",
    });
    expect(p).toMatchObject({
      titulo: "Miniatura F1",
      preco_atual: "49.90",
      preco_variavel: true,
      desconto: "0.2500",
      avaliacao: "4.8",
      preco_anterior: null,
      preco_pix: null,
      parcelamento: null,
      avaliacoes_qtd: null,
    });
    expect(p.fontes).toEqual({
      titulo: "api_shopee",
      imagem_url: "api_shopee",
      preco_atual: "api_shopee",
      desconto: "api_shopee",
      avaliacao: "api_shopee",
    });
    const buscar = (async () => json({ data: { productOfferV2: { nodes: [] } } })) as typeof fetch;
    expect(
      await buscarProdutoShopee(SHOPEE, { shopId: "1", itemId: "2" }, { buscar, resolver }),
    ).toEqual({
      ok: false,
      erro: "produto_nao_encontrado",
    });
  });
});

describe("Amazon e Mercado Livre", () => {
  it("Amazon troca a tag de terceiro pela nossa, inclusive do grupo", async () => {
    const r = await converterLink(
      {
        lida: lida("https://www.amazon.com.br/dp/B0ABCDEF12?tag=outro-20"),
        atribuicao: { tagAmazon: "grupoa-20" },
      },
      { amazon: { tag: "fcs3d-20" } },
    );
    expect(r).toEqual({
      ok: true,
      url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=grupoa-20",
      origem: "tag",
    });
  });

  it("amzn.to é resolvido com segurança antes de montar o link", async () => {
    const buscar = (async (u: URL | string) =>
      String(u).startsWith("https://amzn.to/")
        ? new Response(null, {
            status: 301,
            headers: { location: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=outro-20" },
          })
        : new Response("", { status: 200 })) as typeof fetch;
    const r = await converterLink(
      { lida: lida("https://amzn.to/abc"), atribuicao: {} },
      { amazon: { tag: "fcs3d-20" } },
      { buscar, resolver },
    );
    expect(r).toEqual({
      ok: true,
      url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=fcs3d-20",
      origem: "tag",
    });
  });

  it("Mercado Livre exige link do portal; link colado de outro domínio é recusado", async () => {
    const l = lida("https://produto.mercadolivre.com.br/MLB-1234567890-x");
    expect(await converterLink({ lida: l, atribuicao: {} }, {})).toEqual({
      ok: false,
      erro: "link_manual_obrigatorio",
    });
    expect(
      await converterLink(
        { lida: l, atribuicao: {}, linkColado: "https://mercadolivre.com/sec/ab" },
        {},
      ),
    ).toEqual({
      ok: true,
      url: "https://mercadolivre.com/sec/ab",
      origem: "colado",
    });
    expect(
      await converterLink({ lida: l, atribuicao: {}, linkColado: "https://bit.ly/x" }, {}),
    ).toEqual({
      ok: false,
      erro: "link_colado_invalido",
    });
  });
});

describe("Awin", () => {
  it("Link Builder com clickref do grupo e link curto oficial", async () => {
    let enviado: Record<string, unknown> = {};
    const buscar = (async (_u: URL | string, init?: RequestInit) => {
      enviado = JSON.parse(String(init?.body));
      return json({
        url: "https://www.awin1.com/cread.php?awinmid=555",
        shortUrl: "https://tidd.ly/xyz",
      });
    }) as typeof fetch;
    const r = await converterLink(
      {
        lida: lida("https://www.loja.com.br/tenis/1"),
        atribuicao: { grupoId: G },
        anunciantes: [{ advertiserId: 555, dominios: ["loja.com.br"] }],
      },
      { awin: AWIN },
      { buscar, resolver },
    );
    expect(r).toEqual({ ok: true, url: "https://tidd.ly/xyz", origem: "api" });
    expect(enviado).toMatchObject({
      advertiserId: 555,
      parameters: { clickref: "g3f2a9c10" },
      shorten: true,
    });
  });

  it("deep link bloqueado pelo anunciante vira motivo próprio", async () => {
    const buscar = (async () => json({ description: "deeplinkNotPermitted" }, 400)) as typeof fetch;
    expect(
      await gerarLinkAwin(AWIN, 555, "https://www.loja.com.br/x", {}, { buscar, resolver }),
    ).toEqual({
      ok: false,
      erro: "awin_deeplink_bloqueado",
    });
  });

  it("teste de conexão exige a conta do publisher no token", async () => {
    const buscar = (async () =>
      json({ accounts: [{ accountId: 998877, accountName: "FCS" }] })) as typeof fetch;
    expect(await testarAwin(AWIN, { buscar, resolver })).toEqual({
      ok: true,
      dados: { conta: "FCS" },
    });
    const outra = (async () => json({ accounts: [{ accountId: 1 }] })) as typeof fetch;
    expect(await testarAwin(AWIN, { buscar: outra, resolver })).toEqual({
      ok: false,
      erro: "awin_conta_nao_encontrada",
    });
    const negado = (async () => json({}, 401)) as typeof fetch;
    expect(await testarAwin(AWIN, { buscar: negado, resolver })).toMatchObject({
      ok: false,
      erro: "credencial_recusada",
    });
  });

  it("programa e cupom brutos viram registros limpos", () => {
    expect(
      programaDoBruto({
        id: 9,
        name: "Loja",
        displayUrl: "https://www.loja.com.br/",
        validDomains: [{ domain: "*.loja.com.br" }],
      }),
    ).toEqual({ advertiserId: 9, nome: "Loja", dominios: ["loja.com.br"], deeplink: true });
    expect(
      cupomDoBruto({
        promotionId: 1,
        advertiser: { id: 9, name: "Loja" },
        voucher: { code: " BEMVINDO10 " },
        endDate: "2026-12-31",
      }),
    ).toMatchObject({ codigo: "BEMVINDO10", fim: "2026-12-31", advertiserId: 9 });
    expect(
      cupomDoBruto({ promotionId: 2, advertiser: { id: 9 }, voucher: { code: null } })?.codigo,
    ).toBeNull();
  });
});
