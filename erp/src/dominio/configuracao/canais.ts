export const TIPOS_CANAL = [
  "shopee",
  "mercado_livre",
  "tiktok_shop",
  "site",
  "direto",
  "outro",
] as const;
export type TipoCanal = (typeof TIPOS_CANAL)[number];
export const TIPO_CANAL_ROTULO: Record<TipoCanal, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  tiktok_shop: "TikTok Shop",
  site: "Site próprio",
  direto: "Venda direta",
  outro: "Outro",
};
