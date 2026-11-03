/**
 * Tabelas de taxa dos marketplaces usadas na calculadora (/calculadora).
 * Valores de referência com fonte e data; a tela deixa editar. Atualizar uma taxa:
 * mudar a faixa aqui, a data em `conferido_em` e a fonte. Regras em docs/regras-de-negocio.md.
 */

/** Faixa de preço. `ate` é o teto inclusivo em reais; null = sem teto. */
export type FaixaTaxa = {
  ate: number | null;
  /** Fração sobre o preço; null = comissão da categoria informada na tela (Mercado Livre). */
  comissao_pct: number | null;
  /** Fixo por item em reais, ou metade do preço de venda. */
  fixo: number | "metade_do_preco";
};

export type IdPlataforma = "shopee" | "ml_classico" | "ml_premium" | "tiktok" | "direto";

export type Plataforma = {
  id: IdPlataforma;
  nome: string;
  faixas: FaixaTaxa[];
  /** Comissão que muda por categoria: faixa publicada e o valor usado por padrão (o teto). */
  comissao_categoria?: { min: number; max: number; padrao: number };
  /** O fixo só vale em Flex ou envio próprio; em Coleta, Agência e Full não é cobrado. */
  fixo_depende_do_envio?: boolean;
  fonte: string | null;
  conferido_em: string | null;
  observacao: string | null;
};

const FAIXAS_FIXO_ML: FaixaTaxa[] = [
  { ate: 12.49, comissao_pct: null, fixo: "metade_do_preco" },
  { ate: 28.99, comissao_pct: null, fixo: 6.25 },
  { ate: 49.99, comissao_pct: null, fixo: 6.5 },
  { ate: 78.99, comissao_pct: null, fixo: 6.75 },
  { ate: null, comissao_pct: null, fixo: 0 },
];

const FONTE_ML = "priceva.com/pt/calculadora-taxas-mercado-livre";
const OBS_ML =
  "Comissão muda pela categoria: confira a sua no simulador de custos da conta. Em Coleta, Agência e Full o custo de envio por peso entra em Frete e outros por pedido.";

export const PLATAFORMAS: Plataforma[] = [
  {
    id: "shopee",
    nome: "Shopee",
    faixas: [
      { ate: 8.99, comissao_pct: 0.2, fixo: "metade_do_preco" },
      { ate: 79.99, comissao_pct: 0.2, fixo: 4.5 },
      { ate: 99.99, comissao_pct: 0.14, fixo: 16 },
      { ate: 199.99, comissao_pct: 0.14, fixo: 20 },
      { ate: null, comissao_pct: 0.14, fixo: 26 },
    ],
    fonte: "priceva.com/pt/calculadora-shopee",
    conferido_em: "2026-10-13",
    observacao:
      "Vendedor CNPJ, tabela em vigor desde 01/10/2026. Fontes de março citam R$ 4,00 no fixo até R$ 79,99: confira no Seller Center. CPF com mais de 450 pedidos em 90 dias paga R$ 3 a mais por item.",
  },
  {
    id: "ml_classico",
    nome: "Mercado Livre Clássico",
    faixas: FAIXAS_FIXO_ML,
    comissao_categoria: { min: 0.1, max: 0.14, padrao: 0.14 },
    fixo_depende_do_envio: true,
    fonte: FONTE_ML,
    conferido_em: "2026-10-13",
    observacao: OBS_ML,
  },
  {
    id: "ml_premium",
    nome: "Mercado Livre Premium",
    faixas: FAIXAS_FIXO_ML,
    comissao_categoria: { min: 0.15, max: 0.19, padrao: 0.19 },
    fixo_depende_do_envio: true,
    fonte: FONTE_ML,
    conferido_em: "2026-10-13",
    observacao: OBS_ML,
  },
  {
    id: "tiktok",
    nome: "TikTok Shop",
    faixas: [
      { ate: 49.99, comissao_pct: 0.1, fixo: 4 },
      { ate: null, comissao_pct: 0.06, fixo: 6 },
    ],
    fonte: "viniensina.com.br/taxas-tiktok-shop (Academy do TikTok Shop)",
    conferido_em: "2026-11-03",
    observacao: "Tabela em vigor desde 15/07/2026. Comissão de afiliado não entra no cálculo.",
  },
  {
    id: "direto",
    nome: "Venda direta",
    faixas: [{ ate: null, comissao_pct: 0, fixo: 0 }],
    fonte: null,
    conferido_em: null,
    observacao: "WhatsApp ou retirada, sem comissão de plataforma.",
  },
];

export const PLATAFORMA_POR_ID = Object.fromEntries(PLATAFORMAS.map((p) => [p.id, p])) as Record<
  IdPlataforma,
  Plataforma
>;
