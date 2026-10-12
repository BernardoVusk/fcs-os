/** "1.234,56" ou "1234.56" para número. Vazio ou inválido vira null. */
export function lerNumeroPt(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const limpo = texto.trim();
  if (!limpo) return null;
  const normalizado =
    /,\d{1,6}$/.test(limpo) || (limpo.includes(",") && !limpo.includes("."))
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  return Number(normalizado);
}

/** "14,5" (por cento) para 0.145, com 6 casas. */
export function percentualParaFracao(texto: string | null | undefined): number | null {
  const n = lerNumeroPt(texto);
  if (n === null) return null;
  return Math.round((n / 100) * 1_000_000) / 1_000_000;
}

const formatadores = new Map<number, Intl.NumberFormat>();

export function formatarNumero(valor: number | string | null | undefined, casas = 2): string {
  if (valor == null || valor === "") return "Sem dados";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "Sem dados";
  let f = formatadores.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    formatadores.set(casas, f);
  }
  return f.format(n);
}
