import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

export const FUSO = "America/Sao_Paulo";

function paraTz(valor: string | Date): TZDate {
  if (valor instanceof Date) return new TZDate(valor, FUSO);
  // Data pura (aaaa-mm-dd) é interpretada em São Paulo, não em UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new TZDate(a, m - 1, d, FUSO);
  }
  return new TZDate(valor, FUSO);
}

export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  return format(paraTz(valor), "dd/MM/yyyy");
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  return format(paraTz(valor), "dd/MM/yyyy HH:mm");
}

/** Data de hoje em São Paulo no formato aaaa-mm-dd (para inputs type=date). */
export function hojeSaoPaulo(): string {
  return format(new TZDate(new Date(), FUSO), "yyyy-MM-dd");
}
