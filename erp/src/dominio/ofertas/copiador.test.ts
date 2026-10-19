import { describe, expect, it } from "vitest";
import { decidirMensagem, FILTROS_PADRAO, hashTexto } from "./copiador";
import { REGRAS_PADRAO } from "./limpeza";

const cfg = {
  plataformas: ["shopee", "amazon", "mercado_livre", "awin"] as (
    "shopee" | "amazon" | "mercado_livre" | "awin"
  )[],
  filtros: FILTROS_PADRAO,
  limpeza: REGRAS_PADRAO,
  revisaoManual: false,
};

const MSG = `*Fone Bluetooth X10*
De R$ 199,90 por R$ 89,90
Cupom FONE10 válido até 20/10
https://s.shopee.com.br/abc
Entre no nosso grupo: https://chat.whatsapp.com/AbCdEfGhIjKlMn @fulano`;

describe("copiador", () => {
  it("troca o link do produto por {{link}}, limpa convite e menção e preserva preço e validade", () => {
    const d = decidirMensagem(MSG, cfg);
    expect(d.acao).toBe("publicar");
    if (d.acao === "ignorar") return;
    expect(d.texto.split("\n")).toEqual([
      "*Fone Bluetooth X10*",
      "De R$ 199,90 por R$ 89,90",
      "Cupom FONE10 válido até 20/10",
      "{{link}}",
    ]);
    expect(d.titulo).toBe("Fone Bluetooth X10");
    expect(d.linkOriginal).toBe("https://s.shopee.com.br/abc");
  });

  it("filtros: palavra excluída, palavra obrigatória e plataforma não permitida", () => {
    expect(
      decidirMensagem(MSG, { ...cfg, filtros: { ...FILTROS_PADRAO, excluir: ["bluetooth"] } }),
    ).toEqual({ acao: "ignorar", motivo: "palavra_excluida" });
    expect(
      decidirMensagem(MSG, { ...cfg, filtros: { ...FILTROS_PADRAO, incluir: ["notebook"] } }),
    ).toEqual({ acao: "ignorar", motivo: "sem_palavra_obrigatoria" });
    expect(decidirMensagem(MSG, { ...cfg, plataformas: ["amazon"] })).toEqual({
      acao: "ignorar",
      motivo: "sem_link_elegivel",
    });
    expect(
      decidirMensagem(MSG, {
        ...cfg,
        filtros: { ...FILTROS_PADRAO, dominiosBloqueados: ["shopee.com.br"] },
      }).acao,
    ).toBe("ignorar");
  });

  it("Mercado Livre, vários produtos e revisão ligada vão para revisão", () => {
    const ml = decidirMensagem(
      "Miniatura R$ 20\nhttps://produto.mercadolivre.com.br/MLB-123456789-x",
      cfg,
    );
    expect(ml).toMatchObject({ acao: "revisar", motivo: "link_manual_obrigatorio" });
    const dois = decidirMensagem(
      "A https://www.amazon.com.br/dp/B0ABCDEF12 e B https://www.amazon.com.br/dp/B0ZZZZZZZZ",
      cfg,
    );
    expect(dois).toMatchObject({ acao: "revisar", motivo: "varios_produtos" });
    expect(decidirMensagem(MSG, { ...cfg, revisaoManual: true })).toMatchObject({
      acao: "revisar",
      motivo: "revisao_manual",
    });
  });

  it("marcação de modelo vinda da origem não é interpretada", () => {
    const d = decidirMensagem("Oferta {{produto}} https://amzn.to/x", cfg);
    if (d.acao === "ignorar") throw new Error("ignorou");
    expect(d.texto).toBe("Oferta { {produto} } {{link}}");
  });

  it("hash ignora caixa, acento e espaços para achar texto repetido", () => {
    expect(hashTexto("Promoção  Já")).toBe(hashTexto("promocao ja"));
    expect(hashTexto("a")).not.toBe(hashTexto("b"));
  });
});
