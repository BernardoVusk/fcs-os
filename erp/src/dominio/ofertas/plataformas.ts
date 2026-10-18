/** Plataformas de afiliado do módulo Grupos de Ofertas, rótulos e hosts aceitos. */

export const PLATAFORMAS = ["shopee", "mercado_livre", "amazon", "awin"] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];

export const PLATAFORMA_ROTULO: Record<Plataforma, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  amazon: "Amazon",
  awin: "Awin",
};

export function lerPlataforma(valor: unknown): Plataforma | null {
  return PLATAFORMAS.includes(valor as Plataforma) ? (valor as Plataforma) : null;
}

export const STATUS_INTEGRACAO = [
  "nao_configurada",
  "aguardando_autorizacao",
  "conectada",
  "erro",
  "credencial_expirada",
  "indisponivel",
] as const;
export type StatusIntegracao = (typeof STATUS_INTEGRACAO)[number];

export const STATUS_INTEGRACAO_ROTULO: Record<StatusIntegracao, string> = {
  nao_configurada: "Não configurada",
  aguardando_autorizacao: "Aguardando autorização",
  conectada: "Conectada",
  erro: "Erro",
  credencial_expirada: "Credencial expirada",
  indisponivel: "API indisponível",
};

/**
 * Hosts das páginas de produto e dos links curtos de cada plataforma. Subdomínios valem
 * (www., s., produto.). Awin não tem host próprio de produto: o anunciante é reconhecido pelos
 * domínios da lista de programas (ofe_awin_anunciantes), além dos links de rastreio da Awin.
 */
export const HOSTS_PLATAFORMA: Record<Plataforma, readonly string[]> = {
  shopee: ["shopee.com.br", "shope.ee", "shp.ee"],
  mercado_livre: ["mercadolivre.com.br", "mercadolivre.com"],
  amazon: ["amazon.com.br", "amzn.to", "a.co"],
  awin: ["awin1.com", "tidd.ly"],
};

/** CDNs de onde o worker pode baixar imagem de produto para enviar como mídia. */
export const HOSTS_IMAGEM: readonly string[] = [
  "susercontent.com",
  "shopee.com.br",
  "mlstatic.com",
];
export const TIPOS_IMAGEM: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

/** Links curtos que precisam ser resolvidos até a página do produto. */
export const HOSTS_LINK_CURTO: readonly string[] = [
  "s.shopee.com.br",
  "shope.ee",
  "shp.ee",
  "amzn.to",
  "a.co",
];

/** Host exato da lista ou subdomínio dele (com ponto antes: shopee.com.br.evil.com não passa). */
export function hostNaLista(host: string, lista: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return lista.some((d) => h === d || h.endsWith(`.${d}`));
}
