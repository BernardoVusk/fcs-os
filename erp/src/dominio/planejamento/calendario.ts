/**
 * Datas do planejamento: mês na URL, grade mensal de segunda a domingo, semana e agrupamento por dia.
 * Datas são strings "AAAA-MM-DD" e comparam como texto; "hoje" vem de fora (hojeSaoPaulo).
 */

const MS_DIA = 24 * 60 * 60 * 1000;
const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

const REGEX_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const REGEX_DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function mesValido(m: unknown): m is string {
  return typeof m === "string" && REGEX_MES.test(m);
}
export function dataValida(d: unknown): d is string {
  return typeof d === "string" && REGEX_DATA.test(d);
}

/** Mês da query string; válido (inclusive futuro) usa ele, senão o mês de hoje. */
export function lerMes(valor: string | undefined, hoje: string): string {
  return mesValido(valor) ? valor : hoje.slice(0, 7);
}

export function deslocarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const i = a * 12 + (m - 1) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** "2026-10" vira "outubro de 2026". */
export function nomeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES_PT[m - 1]} de ${a}`;
}

export function diasNoMes(mes: string): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function diasDoMes(mes: string): string[] {
  return Array.from(
    { length: diasNoMes(mes) },
    (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`,
  );
}

function utcDe(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}
function isoDe(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  return isoDe(utcDe(iso) + n * MS_DIA);
}

/** 0 = segunda até 6 = domingo. */
export function diaDaSemana(iso: string): number {
  return (new Date(utcDe(iso)).getUTCDay() + 6) % 7;
}

/** Segunda-feira da semana de `iso`. */
export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso));
}

/** Os sete dias da semana de `iso`, de segunda a domingo. */
export function semanaDe(iso: string): string[] {
  const seg = inicioDaSemana(iso);
  return Array.from({ length: 7 }, (_, i) => somarDias(seg, i));
}

/** Semanas de segunda a domingo; null é célula fora do mês. */
export function gradeCalendario(mes: string): (string | null)[][] {
  const dias = diasDoMes(mes);
  const antes = diaDaSemana(dias[0]);
  const celulas: (string | null)[] = [...Array<null>(antes).fill(null), ...dias];
  while (celulas.length % 7 !== 0) celulas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

/** "2026-10-14" vira "14/10". */
export function dataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "2026-10-14" vira "Qua 14/10". */
export function dataComDia(iso: string): string {
  return `${DIAS_CURTOS[diaDaSemana(iso)]} ${dataCurta(iso)}`;
}

/** "11:00:00" (coluna time) vira "11:00"; nulo vira vazio. */
export function horaCurta(horario: string | null | undefined): string {
  return horario ? horario.slice(0, 5) : "";
}

/** Data que posiciona o item no calendário: prazo, senão início. */
export function dataDoItem(i: { prazo: string | null; inicio: string | null }): string | null {
  return i.prazo ?? i.inicio ?? null;
}

/** Mês do item ("AAAA-MM") ou null quando não tem data. */
export function mesDoItem(i: { prazo: string | null; inicio: string | null }): string | null {
  const d = dataDoItem(i);
  return d ? d.slice(0, 7) : null;
}

/** Agrupa por dia (chave "AAAA-MM-DD"); sem data vai em "". Mantém a ordem de entrada. */
export function agruparPorDia<T extends { prazo: string | null; inicio: string | null }>(
  itens: readonly T[],
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const i of itens) {
    const k = dataDoItem(i) ?? "";
    const lista = mapa.get(k);
    if (lista) lista.push(i);
    else mapa.set(k, [i]);
  }
  return mapa;
}

/** Primeiro e último dia a consultar para mostrar um mês (inclui as pontas das semanas). */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  const grade = gradeCalendario(mes);
  const dias = diasDoMes(mes);
  const primeira = grade[0];
  const ultima = grade[grade.length - 1];
  return {
    inicio: somarDias(dias[0], -primeira.filter((d) => d === null).length),
    fim: somarDias(dias[dias.length - 1], ultima.filter((d) => d === null).length),
  };
}
