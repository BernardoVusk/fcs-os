import { formatarNumero } from "./numero";

export function formatarMoeda(valor: number | string | null | undefined, casas = 2): string {
  if (valor == null || valor === "") return "Sem dados";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "Sem dados";
  return `R$ ${formatarNumero(n, casas)}`;
}

/** Fração (0.145) para "14,5 %". */
export function formatarPercentual(fracao: number | string | null | undefined, casas = 1): string {
  if (fracao == null || fracao === "") return "Não configurado";
  const n = typeof fracao === "string" ? Number(fracao) : fracao;
  if (!Number.isFinite(n)) return "Não configurado";
  return `${formatarNumero(n * 100, casas)} %`;
}
