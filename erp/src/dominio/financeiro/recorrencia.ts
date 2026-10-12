export const FREQUENCIAS = ["semanal", "mensal", "anual"] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];
export const FREQUENCIA_ROTULO: Record<Frequencia, string> = {
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

export type Recorrencia = {
  frequencia: Frequencia;
  /** Dia do mês (mensal), dia da semana 0 a 6 (semanal) ou ignorado (anual usa a data de início). */
  dia: number | null;
  inicio: string;
  fim: string | null;
};

export type Ocorrencia = { competencia: string; data_prevista: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ultimoDia = (ano: number, mes0: number) => new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate();

/**
 * Ocorrências de hoje até `meses` à frente. Mensal: dia do mês limitado ao último dia (31 vira 28, 29 ou 30);
 * anual: mesmo dia e mês do início; semanal: a cada 7 dias a partir do início. Competência é AAAA-MM da data.
 */
export function ocorrencias(r: Recorrencia, hoje: string, meses = 3): Ocorrencia[] {
  const inicio = new Date(`${r.inicio}T00:00:00Z`);
  const base = new Date(`${hoje}T00:00:00Z`);
  const limite = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + meses + 1, 0));
  const fim = r.fim ? new Date(`${r.fim}T00:00:00Z`) : null;
  const saida: Ocorrencia[] = [];
  const dentro = (d: Date) =>
    d >= inicio &&
    (!fim || d <= fim) &&
    d <= limite &&
    d >= new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  if (r.frequencia === "mensal") {
    const dia = Math.min(Math.max(r.dia ?? inicio.getUTCDate(), 1), 31);
    for (let i = 0; i <= meses; i++) {
      const ano = base.getUTCFullYear();
      const mes0 = base.getUTCMonth() + i;
      const d = new Date(Date.UTC(ano, mes0, Math.min(dia, ultimoDia(ano, mes0))));
      if (dentro(d)) saida.push({ competencia: iso(d).slice(0, 7), data_prevista: iso(d) });
    }
  } else if (r.frequencia === "anual") {
    for (let ano = base.getUTCFullYear(); ano <= limite.getUTCFullYear(); ano++) {
      const d = new Date(
        Date.UTC(
          ano,
          inicio.getUTCMonth(),
          Math.min(inicio.getUTCDate(), ultimoDia(ano, inicio.getUTCMonth())),
        ),
      );
      if (dentro(d)) saida.push({ competencia: iso(d).slice(0, 7), data_prevista: iso(d) });
    }
  } else {
    for (let d = new Date(inicio); d <= limite; d = new Date(d.getTime() + 7 * 86_400_000)) {
      if (dentro(d)) saida.push({ competencia: iso(d).slice(0, 7), data_prevista: iso(d) });
    }
  }
  return saida;
}
