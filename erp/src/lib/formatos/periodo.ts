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
