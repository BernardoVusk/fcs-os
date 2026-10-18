import { describe, expect, it } from "vitest";
import { renderizarModelo, validarModelo } from "./modelos";
import { valoresDaOferta, type OfertaMensagem } from "./mensagem";

const PADRAO = `*{{produto}}*
{{#preco_anterior}}De {{preco_anterior}} por {{/preco_anterior}}{{#preco_atual}}{{preco_atual}}{{/preco_atual}}{{#desconto}} ({{desconto}} de desconto){{/desconto}}
{{#cupom}}Cupom {{cupom}}{{#validade_cupom}}, válido até {{validade_cupom}}{{/validade_cupom}}{{/cupom}}
{{#atualizado_em}}Preço consultado em {{atualizado_em}}. Pode mudar sem aviso.{{/atualizado_em}}

{{marketplace}}: {{link}}`;

const base: OfertaMensagem = {
  plataforma: "shopee",
  titulo: "Miniatura F1 1:43",
  preco_atual: "49.90",
  preco_anterior: null,
  desconto: "0.25",
  preco_pix: null,
  parcelamento: null,
  avaliacao: null,
  avaliacoes_qtd: null,
  loja: null,
  preco_variavel: false,
  cta: null,
  dados_atualizados_em: null,
};

describe("modelos", () => {
  it("renderiza só as seções com dado e some com as linhas vazias", () => {
    const r = renderizarModelo(PADRAO, valoresDaOferta(base, "https://s.shopee.com.br/x"));
    expect(r).toEqual({
      texto: "*Miniatura F1 1:43*\nR$ 49,90 (25% de desconto)\n\nShopee: https://s.shopee.com.br/x",
      ausentes: [],
      erros: [],
    });
  });

  it("seções aninhadas e dados completos", () => {
    const r = renderizarModelo(
      PADRAO,
      valoresDaOferta(
        { ...base, preco_anterior: "69.90", dados_atualizados_em: "2026-10-18T15:30:00Z" },
        "https://s.shopee.com.br/x",
        {
          plataforma: "shopee",
          codigo: "FCS10",
          descricao: "10% off",
          beneficio: null,
          regras: null,
          valor_minimo: null,
          fim_em: "2026-10-31",
          validade_confirmada: true,
        },
      ),
    );
    expect(r.texto.split("\n")).toEqual([
      "*Miniatura F1 1:43*",
      "De R$ 69,90 por R$ 49,90 (25% de desconto)",
      "Cupom FCS10, válido até 31/10/2026",
      "Preço consultado em 18/10/2026 12:30. Pode mudar sem aviso.",
      "",
      "Shopee: https://s.shopee.com.br/x",
    ]);
  });

  it("variável fora de seção sem valor bloqueia (ausente) e não deixa sobra", () => {
    const r = renderizarModelo("{{produto}} por {{preco_atual}}\n{{link}}", {
      produto: "X",
      link: "https://a",
    });
    expect(r.ausentes).toEqual(["preco_atual"]);
    expect(r.texto).toBe("X por\nhttps://a");
  });

  it("valor com marcação não é reinterpretado", () => {
    const r = renderizarModelo("{{produto}}", { produto: "{{link}} malicioso" });
    expect(r.texto).toBe("{{link}} malicioso");
  });

  it("valida variável desconhecida, seção aberta, link e data da Amazon", () => {
    expect(validarModelo("{{produtoo}} {{link}}", "oferta", null).erros).toEqual([
      "variavel_desconhecida:produtoo",
    ]);
    expect(validarModelo("{{#cupom}}x {{link}}", "oferta", null).erros).toEqual([
      "secao_aberta:cupom",
    ]);
    expect(validarModelo("{{produto}}", "oferta", null).erros).toEqual(["link_obrigatorio"]);
    expect(validarModelo("{{produto}} {{link}}", "oferta", "amazon").erros).toEqual([
      "amazon_sem_data",
    ]);
    expect(validarModelo("{{produto}} {{preco_atual}} {{link}}", "oferta", null).avisos).toEqual([
      "fora_de_secao:preco_atual",
    ]);
    expect(validarModelo(PADRAO, "oferta", null)).toMatchObject({ erros: [], avisos: [] });
  });

  it("preço com variações e Awin usa o nome da loja", () => {
    const v = valoresDaOferta(
      { ...base, plataforma: "awin", loja: "Loja X", preco_variavel: true },
      "https://tidd.ly/a",
    );
    expect(v.preco_atual).toBe("a partir de R$ 49,90");
    expect(v.marketplace).toBe("Loja X");
  });
});
