import { describe, expect, it } from "vitest";
import { WHATSAPP_ORCAMENTO, linkOrcamento, linkOrcamentoGeral } from "./whatsapp";

function mensagem(link: string) {
  const url = new URL(link);
  return url.searchParams.get("text");
}

describe("linkOrcamento", () => {
  it("abre o WhatsApp do estúdio com a peça e a categoria na mensagem", () => {
    const link = linkOrcamento("Porta-canetas de pneu", "Carros e motos");
    expect(link.startsWith(`https://wa.me/${WHATSAPP_ORCAMENTO}?text=`)).toBe(true);
    expect(mensagem(link)).toBe(
      'Olá! Vi no catálogo da FCS 3D STUDIO a peça "Porta-canetas de pneu" (Carros e motos) e quero um orçamento.',
    );
  });

  it("codifica acento, aspas e & sem quebrar a URL", () => {
    const link = linkOrcamento('Tom & Jerry "Jerry"', "Personagens");
    expect(link).not.toContain(" ");
    expect(link).not.toContain("&J");
    expect(mensagem(link)).toContain('"Tom & Jerry "Jerry""');
  });

  it("limpa espaços nas pontas do nome", () => {
    expect(mensagem(linkOrcamento("  Busto  ", "Decoração"))).toContain(
      'a peça "Busto" (Decoração)',
    );
  });
});

describe("linkOrcamentoGeral", () => {
  it("usa o mesmo número com a mensagem geral", () => {
    const link = linkOrcamentoGeral();
    expect(link.startsWith(`https://wa.me/${WHATSAPP_ORCAMENTO}?text=`)).toBe(true);
    expect(mensagem(link)).toBe("Olá! Vi o catálogo da FCS 3D STUDIO e quero um orçamento.");
  });

  it("número tem só dígitos, com 55 e DDD", () => {
    expect(WHATSAPP_ORCAMENTO).toBe("5531992537279");
  });
});
