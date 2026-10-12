import Decimal from "decimal.js";
import {
  estadoDe,
  saldoRestante,
  sinalDe,
  type LancamentoEstado,
  type TipoLancamento,
} from "./estados";

export type LancamentoProjecao = LancamentoEstado & {
  tipo: TipoLancamento;
  data_prevista: string;
};

const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

function aberto(l: LancamentoProjecao): boolean {
  const e = estadoDe(l);
  return e === "planejado" || e === "parcial";
}

/**
 * Saldo projetado numa data: caixa realizado hoje mais o saldo restante dos lançamentos abertos
 * com data prevista até a data (atrasados entram no bucket de hoje). Transferências não entram no consolidado.
 */
export function saldoProjetado(
  saldoRealizadoHoje: number,
  lancamentos: LancamentoProjecao[],
  ate: string,
  hoje: string,
): number {
  let saldo = new Decimal(saldoRealizadoHoje);
  for (const l of lancamentos) {
    if (!aberto(l) || l.tipo === "transferencia") continue;
    const dataEfetiva = l.data_prevista < hoje ? hoje : l.data_prevista;
    if (dataEfetiva > ate) continue;
    saldo = saldo.plus(new Decimal(saldoRestante(l)).times(sinalDe(l.tipo)));
  }
  return r2(saldo);
}

/** Série diária de saldo projetado a partir de hoje, para o gráfico do painel. */
export function serieProjecao(
  saldoRealizadoHoje: number,
  lancamentos: LancamentoProjecao[],
  hoje: string,
  dias: number,
): { data: string; saldo: number }[] {
  const serie: { data: string; saldo: number }[] = [];
  const base = new Date(`${hoje}T00:00:00Z`);
  for (let i = 0; i <= dias; i++) {
    const d = new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    serie.push({ data: d, saldo: saldoProjetado(saldoRealizadoHoje, lancamentos, d, hoje) });
  }
  return serie;
}

export type TotaisAbertos = {
  vencidos: { receber: number; pagar: number };
  proximos7: { receber: number; pagar: number };
  proximos30: { receber: number; pagar: number };
};

/** Vencidos e próximos 7 e 30 dias, separando a receber de a pagar. */
export function totaisAbertos(lancamentos: LancamentoProjecao[], hoje: string): TotaisAbertos {
  const limite = (dias: number) =>
    new Date(new Date(`${hoje}T00:00:00Z`).getTime() + dias * 86_400_000)
      .toISOString()
      .slice(0, 10);
  const d7 = limite(7);
  const d30 = limite(30);
  const t: TotaisAbertos = {
    vencidos: { receber: 0, pagar: 0 },
    proximos7: { receber: 0, pagar: 0 },
    proximos30: { receber: 0, pagar: 0 },
  };
  const soma = (alvo: { receber: number; pagar: number }, l: LancamentoProjecao) => {
    const v = saldoRestante(l);
    if (l.tipo === "receita") alvo.receber = r2(new Decimal(alvo.receber).plus(v));
    if (l.tipo === "despesa") alvo.pagar = r2(new Decimal(alvo.pagar).plus(v));
  };
  for (const l of lancamentos) {
    if (!aberto(l) || l.tipo === "transferencia") continue;
    if (l.data_prevista < hoje) soma(t.vencidos, l);
    else {
      if (l.data_prevista <= d7) soma(t.proximos7, l);
      if (l.data_prevista <= d30) soma(t.proximos30, l);
    }
  }
  return t;
}
