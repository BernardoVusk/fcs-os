export type OrdemParaCarga = {
  id: string;
  impressora_id: string | null;
  status: string;
  tempo_previsto_min: number | null;
  prazo: string | null;
};

export type CargaImpressora = {
  impressora_id: string | null;
  ordens: number;
  minutos_previstos: number;
  /** Null quando a impressora não tem horas disponíveis informadas. */
  horas_disponiveis: number | null;
  /** Minutos acima da capacidade; 0 quando cabe ou quando não há capacidade informada. */
  excesso_min: number;
  atrasadas: number;
};

/**
 * Soma o tempo previsto das ordens abertas (fila, imprimindo, acabamento) por impressora e compara
 * com as horas disponíveis no período. Ordens sem impressora formam o grupo null.
 */
export function cargaPorImpressora(
  ordens: OrdemParaCarga[],
  horasDisponiveis: Record<string, number> = {},
  hoje: string = new Date().toISOString().slice(0, 10),
): CargaImpressora[] {
  const grupos = new Map<string | null, CargaImpressora>();
  for (const o of ordens) {
    if (o.status === "concluida" || o.status === "cancelada") continue;
    const chave = o.impressora_id;
    const g = grupos.get(chave) ?? {
      impressora_id: chave,
      ordens: 0,
      minutos_previstos: 0,
      horas_disponiveis: chave && horasDisponiveis[chave] != null ? horasDisponiveis[chave] : null,
      excesso_min: 0,
      atrasadas: 0,
    };
    g.ordens += 1;
    g.minutos_previstos += o.tempo_previsto_min ?? 0;
    if (o.prazo && o.prazo < hoje) g.atrasadas += 1;
    grupos.set(chave, g);
  }
  for (const g of grupos.values()) {
    if (g.horas_disponiveis != null)
      g.excesso_min = Math.max(0, g.minutos_previstos - g.horas_disponiveis * 60);
  }
  // Impressoras em ordem de id; ordens sem impressora por último.
  return [...grupos.values()].sort((a, b) => {
    if (a.impressora_id === null) return 1;
    if (b.impressora_id === null) return -1;
    return a.impressora_id.localeCompare(b.impressora_id);
  });
}

/** Próximo código sequencial: OP-0001, OP-0002... */
export function formatarCodigoOrdem(n: number): string {
  return `OP-${String(n).padStart(4, "0")}`;
}
