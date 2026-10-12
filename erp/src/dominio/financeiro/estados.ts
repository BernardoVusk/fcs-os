import Decimal from "decimal.js";

export const ESTADOS_LANCAMENTO = [
  "planejado",
  "parcial",
  "realizado",
  "cancelado",
  "estornado",
] as const;
export type EstadoLancamento = (typeof ESTADOS_LANCAMENTO)[number];
export const ESTADO_LANCAMENTO_ROTULO: Record<EstadoLancamento, string> = {
  planejado: "Planejado",
  parcial: "Parcial",
  realizado: "Realizado",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

export const TIPOS_LANCAMENTO = ["receita", "despesa", "transferencia"] as const;
export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];

export type LancamentoEstado = {
  valor_previsto: number;
  /** Soma das realizações (pagamentos ou recebimentos). */
  valor_realizado: number;
  cancelado_em: string | null;
  estornado_em: string | null;
  /** Encerrado com diferença justificada: conta como realizado mesmo abaixo do previsto. */
  encerrado_em: string | null;
};

const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
const TOLERANCIA = new Decimal("0.005");

/**
 * Máquina de estados do lançamento (spec 5.7). `atrasado` não é estado: é derivado em `estaAtrasado`.
 * planejado -> parcial (realizar menos que o restante) -> realizado (realizar o restante ou encerrar);
 * planejado -> cancelado; realizado -> estornado (contra-lançamento). parcial não cancela.
 */
export function estadoDe(l: LancamentoEstado): EstadoLancamento {
  if (l.estornado_em) return "estornado";
  if (l.cancelado_em) return "cancelado";
  const realizado = new Decimal(l.valor_realizado);
  if (l.encerrado_em || realizado.plus(TOLERANCIA).gte(l.valor_previsto)) return "realizado";
  if (realizado.gt(0)) return "parcial";
  return "planejado";
}

export function saldoRestante(
  l: Pick<LancamentoEstado, "valor_previsto" | "valor_realizado">,
): number {
  const restante = new Decimal(l.valor_previsto).minus(l.valor_realizado);
  return restante.lte(0) ? 0 : r2(restante);
}

export function podeRealizar(estado: EstadoLancamento): boolean {
  return estado === "planejado" || estado === "parcial";
}
export function podeCancelar(estado: EstadoLancamento): boolean {
  return estado === "planejado";
}
export function podeEstornar(estado: EstadoLancamento): boolean {
  return estado === "realizado";
}
export function podeEncerrar(estado: EstadoLancamento): boolean {
  return estado === "parcial";
}

/** Vencido: ainda aberto e com data prevista anterior a hoje. */
export function estaAtrasado(
  l: LancamentoEstado & { data_prevista: string },
  hoje: string,
): boolean {
  const e = estadoDe(l);
  return (e === "planejado" || e === "parcial") && l.data_prevista < hoje;
}

/** Valida uma realização: positiva e dentro do restante (tolerância de meio centavo). */
export function validarRealizacao(l: LancamentoEstado, valor: number): string | null {
  const estado = estadoDe(l);
  if (!podeRealizar(estado)) return "lancamento_nao_aberto";
  if (!(valor > 0)) return "valor_invalido";
  if (new Decimal(valor).minus(TOLERANCIA).gt(saldoRestante(l))) return "valor_acima_do_restante";
  return null;
}

/** Sinal no caixa: receita entra, despesa sai; transferência é tratada por conta. */
export function sinalDe(tipo: TipoLancamento): 1 | -1 | 0 {
  return tipo === "receita" ? 1 : tipo === "despesa" ? -1 : 0;
}
