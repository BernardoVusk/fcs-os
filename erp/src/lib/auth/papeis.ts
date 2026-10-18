export const PAPEIS = ["dono", "operador", "leitura"] as const;
export type Papel = (typeof PAPEIS)[number];
export const PAPEL_ROTULO: Record<Papel, string> = {
  dono: "Dono",
  operador: "Operador",
  leitura: "Leitura",
};

export const AREAS = [
  "inicio",
  "conhecimento",
  "estoque",
  "catalogo",
  "producao",
  "vendas",
  "financeiro",
  "planejamento",
  "relatorios",
  "alertas",
  "ofertas",
  "configuracoes",
  "usuarios",
] as const;
export type Area = (typeof AREAS)[number];

const SEM_FINANCEIRO: readonly Area[] = AREAS.filter((a) => a !== "financeiro" && a !== "usuarios");

const LEITURA: Record<Papel, readonly Area[]> = {
  dono: AREAS,
  operador: SEM_FINANCEIRO,
  leitura: SEM_FINANCEIRO,
};
const ESCRITA: Record<Papel, readonly Area[]> = {
  dono: AREAS,
  operador: [
    "conhecimento",
    "estoque",
    "catalogo",
    "producao",
    "vendas",
    "planejamento",
    "alertas",
    "ofertas",
  ],
  leitura: [],
};

export function lerPapel(valor: unknown): Papel | null {
  return PAPEIS.includes(valor as Papel) ? (valor as Papel) : null;
}

export function podeLer(papel: Papel | null, area: Area): boolean {
  return papel !== null && LEITURA[papel].includes(area);
}

export function podeEscrever(papel: Papel | null, area: Area): boolean {
  return papel !== null && ESCRITA[papel].includes(area);
}

/** Área de uma rota. null = rota livre para qualquer logado (perfil, sem-acesso). */
export function areaDaRota(pathname: string): Area | null {
  const limpo = pathname.replace(/\/+$/, "") || "/";
  if (limpo === "/") return "inicio";
  if (limpo.startsWith("/configuracoes/usuarios")) return "usuarios";
  // Credenciais de afiliado: só o dono, mesmo dentro de Grupos de Ofertas.
  if (limpo.startsWith("/ofertas/integracoes")) return "usuarios";
  const primeiro = limpo.split("/")[1];
  return AREAS.includes(primeiro as Area) ? (primeiro as Area) : null;
}
