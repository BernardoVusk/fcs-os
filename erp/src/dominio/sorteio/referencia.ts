import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { FUSO } from "@/lib/formatos/data";

/** Mês de referência do sorteio ("AAAA-MM"), sempre no fuso de São Paulo. */
export function referenciaAtual(agora: Date = new Date()): string {
  return format(new TZDate(agora, FUSO), "yyyy-MM");
}

export function referenciaValida(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

/** "2026-10" vira "outubro de 2026". */
export function rotuloReferencia(referencia: string): string {
  const [ano, mes] = referencia.split("-").map(Number);
  return format(new TZDate(ano, mes - 1, 1, FUSO), "MMMM 'de' yyyy", { locale: ptBR });
}
