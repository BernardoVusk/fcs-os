import { addMonths, endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { TZDate } from "@date-fns/tz";
import type { Periodo } from "@/componentes/painel/SeletorPeriodo";
import { FUSO } from "./data";

/** Intervalo [inicio, fim) em ISO para o período escolhido, calculado em São Paulo. */
export function intervaloDoPeriodo(
  periodo: Periodo,
  agora = new Date(),
): { inicio: string; fim: string } {
  const hoje = new TZDate(agora, FUSO);
  if (periodo === "mes")
    return {
      inicio: startOfMonth(hoje).toISOString(),
      fim: addMonths(startOfMonth(hoje), 1).toISOString(),
    };
  if (periodo === "mes-anterior") {
    const anterior = subMonths(hoje, 1);
    return {
      inicio: startOfMonth(anterior).toISOString(),
      fim: addMonths(startOfMonth(anterior), 1).toISOString(),
    };
  }
  if (periodo === "30d")
    return { inicio: subDays(hoje, 30).toISOString(), fim: agora.toISOString() };
  return {
    inicio: startOfMonth(subMonths(hoje, 11)).toISOString(),
    fim: addMonths(endOfMonth(hoje), 0).toISOString(),
  };
}

/** Intervalo imediatamente anterior, com a mesma duração, para comparar (mês contra mês anterior, 30 dias contra os 30 antes). */
export function periodoAnterior(
  periodo: Periodo,
  agora = new Date(),
): { inicio: string; fim: string } {
  const atual = intervaloDoPeriodo(periodo, agora);
  if (periodo === "mes" || periodo === "mes-anterior") {
    const inicio = new TZDate(new Date(atual.inicio), FUSO);
    return { inicio: subMonths(inicio, 1).toISOString(), fim: atual.inicio };
  }
  if (periodo === "12m") {
    const inicio = new TZDate(new Date(atual.inicio), FUSO);
    return { inicio: subMonths(inicio, 12).toISOString(), fim: atual.inicio };
  }
  const duracao = new Date(atual.fim).getTime() - new Date(atual.inicio).getTime();
  return {
    inicio: new Date(new Date(atual.inicio).getTime() - duracao).toISOString(),
    fim: atual.inicio,
  };
}
