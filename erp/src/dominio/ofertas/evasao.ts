/**
 * Métricas de grupo num período [inicio, fim). Fórmulas (docs/regras-de-negocio.md):
 * - membros no início: última medição até o início; sem medição = nulo (nunca zero).
 * - saldo: entradas observadas menos saídas observadas no período.
 * - variação líquida: membros no fim menos membros no início (difere do saldo se houve lacuna).
 * - taxa de evasão: saídas do período ÷ membros no início × 100. Nula sem medição inicial;
 *   "não calculável" com início zero; "parcial" se o período cruza lacuna de coleta ou começa
 *   antes do início da coleta.
 */

export type Medicao = { medido_em: string; membros: number };
export type EventoGrupo = { ocorrido_em: string; tipo: "entrada" | "saida"; quantidade: number };
export type Lacuna = { inicio: string; fim: string | null };

export type MetricasGrupo = {
  membrosInicio: number | null;
  membrosFim: number | null;
  entradas: number;
  saidas: number;
  saldo: number;
  variacaoLiquida: number | null;
  evasao: number | null;
  evasaoSituacao: "calculada" | "sem_medicao_inicial" | "inicio_zero";
  parcial: boolean;
  motivoParcial: string | null;
};

const t = (s: string) => Date.parse(s);

function ultimaAte(medicoes: Medicao[], ate: number): number | null {
  let melhor: Medicao | null = null;
  for (const m of medicoes)
    if (t(m.medido_em) <= ate && (!melhor || t(m.medido_em) >= t(melhor.medido_em))) melhor = m;
  return melhor ? melhor.membros : null;
}

export function metricasGrupo(p: {
  inicio: string;
  fim: string;
  medicoes: Medicao[];
  eventos: EventoGrupo[];
  lacunas: Lacuna[];
  coletaIniciadaEm: string | null;
  agora?: Date;
}): MetricasGrupo {
  const ini = t(p.inicio);
  const fim = Math.min(t(p.fim), (p.agora ?? new Date()).getTime());
  let entradas = 0;
  let saidas = 0;
  for (const e of p.eventos) {
    const em = t(e.ocorrido_em);
    if (em < ini || em >= fim) continue;
    if (e.tipo === "entrada") entradas += e.quantidade;
    else saidas += e.quantidade;
  }
  const membrosInicio = ultimaAte(p.medicoes, ini);
  const membrosFim = ultimaAte(p.medicoes, fim);
  const lacuna = p.lacunas.some((l) => t(l.inicio) < fim && (l.fim === null || t(l.fim) > ini));
  const antesDaColeta = !p.coletaIniciadaEm || t(p.coletaIniciadaEm) > ini;
  let evasao: number | null = null;
  let evasaoSituacao: MetricasGrupo["evasaoSituacao"] = "calculada";
  if (membrosInicio === null) evasaoSituacao = "sem_medicao_inicial";
  else if (membrosInicio === 0) evasaoSituacao = "inicio_zero";
  else evasao = Math.round((saidas / membrosInicio) * 10_000) / 100;
  return {
    membrosInicio,
    membrosFim,
    entradas,
    saidas,
    saldo: entradas - saidas,
    variacaoLiquida:
      membrosInicio !== null && membrosFim !== null ? membrosFim - membrosInicio : null,
    evasao,
    evasaoSituacao,
    parcial: lacuna || antesDaColeta,
    motivoParcial: antesDaColeta
      ? p.coletaIniciadaEm
        ? "o período começa antes do início da coleta"
        : "coleta ainda não iniciada"
      : lacuna
        ? "houve período sem coleta (número ou worker fora do ar)"
        : null,
  };
}
