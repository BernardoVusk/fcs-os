/**
 * Dados da empresa usados nas peças. Fonte: `_memoria/empresa.md` e
 * `_memoria/preferencias.md`. Atualizar aqui quando a memória mudar; nunca
 * escrever dado da empresa direto no componente.
 *
 * Regra do workspace: nunca inventar número. Todo indicador abaixo tem data e
 * fonte; antes de publicar, conferir no painel do canal e atualizar.
 */
export const empresa = {
  nome: "FCS 3D STUDIO",
  /** Como o logo escreve: wordmark + bloco. */
  wordmark: "FCS",
  selo: "3D Studio",
  assinatura: "Impressão 3D sob demanda",
  /** Frase de referência do tom de voz (`_memoria/preferencias.md`). */
  frase: "Esse é o nosso portfólio de produtos sob demanda que você pode pedir.",
  /** Loja na Shopee. Instagram e TikTok: a confirmar antes de usar numa peça. */
  shopee: "shopee.com.br/fcs3dstudio",
} as const;

/** Canais de venda, na ordem de `_memoria/empresa.md`. */
export const canais = ["Shopee", "Mercado Livre", "TikTok Shop"] as const;

/** Nichos do público: o hobby de quem compra. */
export const nichos = [
  "Games",
  "Miniaturas",
  "Fórmula 1",
  "Carros e automobilismo",
] as const;

/**
 * Indicadores públicos da loja Shopee. Retrato de 21/08/2026 (API pública da
 * loja, `_memoria/empresa.md`). Desatualiza: conferir no painel e trocar o
 * valor e a data antes de usar em peça publicada.
 */
export const indicadores = {
  data: "2026-08-21",
  fonte: "Shopee, página pública da loja",
  itens: [
    { valor: 4.876, decimais: 1, prefixo: "", sufixo: "", rotulo: "nota na Shopee" },
    { valor: 1627, decimais: 0, prefixo: "", sufixo: "", rotulo: "avaliações" },
  ],
} as const;
