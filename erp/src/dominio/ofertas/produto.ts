/**
 * Dados de produto de uma oferta. Cada campo tem fonte; o que nenhuma fonte confirmou fica nulo
 * e a tela mostra "não informado". Nada é calculado para preencher lacuna (preço anterior não
 * sai de desconto, avaliação não sai de vendas).
 */

export const FONTES_DADO = ["api_shopee", "creators_api", "csv_shopee", "manual"] as const;
export type FonteDado = (typeof FONTES_DADO)[number];
export const FONTE_DADO_ROTULO: Record<FonteDado, string> = {
  api_shopee: "Open API da Shopee",
  creators_api: "Creators API da Amazon",
  csv_shopee: "Arquivo CSV do portal da Shopee",
  manual: "Digitado por você",
};

export const CAMPOS_PRODUTO = [
  "titulo",
  "imagem_url",
  "preco_atual",
  "preco_anterior",
  "desconto",
  "preco_pix",
  "parcelamento",
  "avaliacao",
  "avaliacoes_qtd",
  "loja",
] as const;
export type CampoProduto = (typeof CAMPOS_PRODUTO)[number];

export type DadosProduto = {
  titulo: string | null;
  imagem_url: string | null;
  /** Valores em reais como texto decimal ("19.90"), para não passar por float. */
  preco_atual: string | null;
  preco_anterior: string | null;
  /** Fração (0.3 = 30 %). */
  desconto: string | null;
  preco_pix: string | null;
  parcelamento: string | null;
  avaliacao: string | null;
  avaliacoes_qtd: number | null;
  loja: string | null;
  /** Preço com faixa (variações com preços diferentes): mostrado como "a partir de". */
  preco_variavel: boolean;
  fontes: Partial<Record<CampoProduto, FonteDado>>;
  atualizado_em: string | null;
};

export function produtoVazio(): DadosProduto {
  return {
    titulo: null,
    imagem_url: null,
    preco_atual: null,
    preco_anterior: null,
    desconto: null,
    preco_pix: null,
    parcelamento: null,
    avaliacao: null,
    avaliacoes_qtd: null,
    loja: null,
    preco_variavel: false,
    fontes: {},
    atualizado_em: null,
  };
}

const DECIMAL = /^\d{1,9}(\.\d{1,2})?$/;

/** "19.9", 19.9 ou "19,90" para "19.90"; qualquer outra coisa vira nulo. */
export function decimalOuNulo(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const texto = String(v).trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(texto)) return null;
  const [inteiro, frac = ""] = texto.split(".");
  const normal = `${inteiro.replace(/^0+(?=\d)/, "")}.${(frac + "00").slice(0, 2)}`;
  return DECIMAL.test(normal) && Number(normal) > 0 ? normal : null;
}

/** Horas desde a última atualização; nulo sem data. */
export function idadeHoras(atualizadoEm: string | null, agora = new Date()): number | null {
  if (!atualizadoEm) return null;
  const t = Date.parse(atualizadoEm);
  return Number.isNaN(t) ? null : (agora.getTime() - t) / 3_600_000;
}

/** Preço com mais de `limiteHoras` (24 h por padrão, regra da Amazon) é dado desatualizado. */
export function dadoDesatualizado(
  atualizadoEm: string | null,
  limiteHoras = 24,
  agora = new Date(),
): boolean {
  const h = idadeHoras(atualizadoEm, agora);
  return h === null || h > limiteHoras;
}
