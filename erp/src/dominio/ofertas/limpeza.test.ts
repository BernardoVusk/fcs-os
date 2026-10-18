import { describe, expect, it } from "vitest";
import { essenciaisPerdidas, limparTexto, REGRAS_PADRAO } from "./limpeza";

const ORIGEM = `OFERTA RELÂMPAGO @fulano
Fone Bluetooth X10
De R$ 199,90 por R$ 89,90 no Pix
Cupom FONE10 válido até 20/10
https://s.shopee.com.br/abc
Entre no nosso grupo: https://chat.whatsapp.com/AbCdEfGhIjKlMn
Frete grátis acima de R$ 79 (link do grupo na bio)`;

describe("limpeza", () => {
  it("tira menção, convite, chamada e link não autorizado e mantém o essencial", () => {
    const r = limparTexto(ORIGEM, REGRAS_PADRAO, (u) =>
      u.startsWith("https://s.shopee.com.br/abc"),
    );
    expect(r.texto.split("\n")).toEqual([
      "OFERTA RELÂMPAGO",
      "Fone Bluetooth X10",
      "De R$ 199,90 por R$ 89,90 no Pix",
      "Cupom FONE10 válido até 20/10",
      "https://s.shopee.com.br/abc",
      "Frete grátis acima de R$ 79 (link do grupo na bio)",
    ]);
    expect(r.removidos).toContain("mencao:@fulano");
    expect(r.removidos.some((x) => x.startsWith("convite:https://chat.whatsapp.com"))).toBe(true);
    expect(essenciaisPerdidas(ORIGEM, r.texto)).toEqual([]);
  });

  it("link de terceiro sai quando a regra está ligada e fica quando desligada", () => {
    expect(limparTexto("Veja https://bit.ly/x agora", REGRAS_PADRAO).texto).toBe("Veja agora");
    expect(
      limparTexto("Veja https://bit.ly/x agora", {
        ...REGRAS_PADRAO,
        removerLinksNaoAutorizados: false,
      }).texto,
    ).toBe("Veja https://bit.ly/x agora");
  });

  it("detecta preço que sumiu do resultado", () => {
    expect(essenciaisPerdidas("Por R$ 10,00", "Outro texto")).toEqual(["Por R$ 10,00"]);
  });
});
