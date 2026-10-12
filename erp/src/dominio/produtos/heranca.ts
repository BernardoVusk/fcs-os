/** Campos da ficha que a variação pode sobrescrever. Null na variação significa "herda do produto". */
export type FichaProduto = {
  peso_g: number | null;
  tempo_impressao_min: number | null;
  pecas_por_ciclo: number | null;
  taxa_falha_pct: number | null;
  tempo_preparo_min: number | null;
  tempo_acabamento_min: number | null;
  tempo_embalagem_min: number | null;
  insumo_impressao_id: string | null;
  impressora_padrao_id: string | null;
  atributos: Record<string, unknown>;
};

export type OverridesVariacao = Partial<Omit<FichaProduto, "atributos">> & {
  atributos?: Record<string, unknown> | null;
};

const CHAVES: (keyof Omit<FichaProduto, "atributos">)[] = [
  "peso_g",
  "tempo_impressao_min",
  "pecas_por_ciclo",
  "taxa_falha_pct",
  "tempo_preparo_min",
  "tempo_acabamento_min",
  "tempo_embalagem_min",
  "insumo_impressao_id",
  "impressora_padrao_id",
];

/** Ficha efetiva: a variação só vale onde preencheu; atributos se somam (variação por cima). */
export function fichaEfetiva(
  produto: FichaProduto,
  variacao: OverridesVariacao | null,
): FichaProduto {
  const saida: FichaProduto = { ...produto, atributos: { ...produto.atributos } };
  if (!variacao) return saida;
  for (const k of CHAVES) {
    const v = variacao[k];
    if (v !== null && v !== undefined) (saida as Record<string, unknown>)[k] = v;
  }
  if (variacao.atributos) saida.atributos = { ...produto.atributos, ...variacao.atributos };
  return saida;
}

/** Quais campos a variação sobrescreve, para mostrar na tela. */
export function camposSobrescritos(variacao: OverridesVariacao): string[] {
  return CHAVES.filter((k) => variacao[k] !== null && variacao[k] !== undefined);
}
