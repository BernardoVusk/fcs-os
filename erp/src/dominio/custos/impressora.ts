import Decimal from "decimal.js";
import type { CustoHoraImpressora, DadosImpressora } from "./tipos";

const r6 = (d: Decimal) => d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();

/**
 * Custos por hora de máquina.
 * depreciação = (aquisição - residual) / vida útil em horas
 * manutenção = manutenção anual / horas produtivas no ano; consumíveis idem
 * energia = potência média (W) / 1000 x tarifa do kWh
 */
export function custoHoraImpressora(d: DadosImpressora, tarifaKwh: number): CustoHoraImpressora {
  if (!(d.vida_util_horas > 0)) throw new Error("impressora_sem_vida_util");
  if (!(d.horas_produtivas_ano > 0)) throw new Error("impressora_sem_horas_ano");
  if (d.valor_residual > d.custo_aquisicao) throw new Error("residual_maior_que_aquisicao");
  const dep = new Decimal(d.custo_aquisicao).minus(d.valor_residual).div(d.vida_util_horas);
  const manut = new Decimal(d.custo_manutencao_ano).div(d.horas_produtivas_ano);
  const cons = new Decimal(d.custo_consumiveis_ano).div(d.horas_produtivas_ano);
  const energia = new Decimal(d.potencia_media_w).div(1000).times(tarifaKwh);
  return {
    depreciacao: r6(dep),
    manutencao: r6(manut),
    consumiveis: r6(cons),
    energia: r6(energia),
  };
}

/** Soma dos custos por hora (sem energia e com energia), para exibir na ficha da impressora. */
export function custoHoraTotal(c: CustoHoraImpressora): { maquina: number; comEnergia: number } {
  const maquina = new Decimal(c.depreciacao).plus(c.manutencao).plus(c.consumiveis);
  return { maquina: r6(maquina), comEnergia: r6(maquina.plus(c.energia)) };
}

export type ImpressoraCampos = {
  custo_aquisicao: number | null;
  valor_residual: number | null;
  vida_util_horas: number | null;
  potencia_media_w: number | null;
  custo_manutencao_ano: number | null;
  custo_consumiveis_ano: number | null;
  horas_produtivas_ano: number | null;
};

export const CAMPO_IMPRESSORA_ROTULO: Record<keyof ImpressoraCampos, string> = {
  custo_aquisicao: "custo de aquisição",
  valor_residual: "valor residual",
  vida_util_horas: "vida útil em horas",
  potencia_media_w: "potência média",
  custo_manutencao_ano: "manutenção por ano",
  custo_consumiveis_ano: "consumíveis por ano",
  horas_produtivas_ano: "horas produtivas por ano",
};

/** Converte a linha do banco (campos nulos = não configurado) em entradas do cálculo, ou lista o que falta. */
export function impressoraPronta(
  i: ImpressoraCampos,
): { ok: true; dados: DadosImpressora } | { ok: false; faltam: (keyof ImpressoraCampos)[] } {
  const faltam = (
    [
      "custo_aquisicao",
      "vida_util_horas",
      "potencia_media_w",
      "custo_manutencao_ano",
      "custo_consumiveis_ano",
      "horas_produtivas_ano",
    ] as const
  ).filter((k) => i[k] == null);
  if (faltam.length > 0) return { ok: false, faltam };
  return {
    ok: true,
    dados: {
      custo_aquisicao: i.custo_aquisicao!,
      valor_residual: i.valor_residual ?? 0,
      vida_util_horas: i.vida_util_horas!,
      potencia_media_w: i.potencia_media_w!,
      custo_manutencao_ano: i.custo_manutencao_ano!,
      custo_consumiveis_ano: i.custo_consumiveis_ano!,
      horas_produtivas_ano: i.horas_produtivas_ano!,
    },
  };
}
