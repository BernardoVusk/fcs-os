/** WhatsApp do estúdio para orçamento, só dígitos (55 + DDD + número), como pede o wa.me. */
export const WHATSAPP_ORCAMENTO = "5531992537279";

function link(texto: string) {
  return `https://wa.me/${WHATSAPP_ORCAMENTO}?text=${encodeURIComponent(texto)}`;
}

/** Botão de cada peça do catálogo público: a mensagem já chega dizendo qual peça e de qual categoria. */
export function linkOrcamento(nome: string, categoria: string) {
  return link(
    `Olá! Vi no catálogo da FCS 3D STUDIO a peça "${nome.trim()}" (${categoria.trim()}) e quero um orçamento.`,
  );
}

/** Botão do topo do catálogo, sem peça escolhida. */
export function linkOrcamentoGeral() {
  return link("Olá! Vi o catálogo da FCS 3D STUDIO e quero um orçamento.");
}
