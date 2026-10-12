import Decimal from "decimal.js";
import type { CustoHoraImpressora } from "@/dominio/custos/tipos";

export type ConsumoReal = {
  insumo_id: string;
  lote_id: string | null;
  quantidade: number;
  /** Custo unitário do lote de onde saiu (ou a média, se não houver lote). */
  custo_unitario: number;
};

export type EntradasRealizado = {
  consumos: ConsumoReal[];
  horas_maquina: number;
  impressora: CustoHoraImpressora | null;
  minutos_mao_de_obra: number;
  custo_hora_mao_obra: number;
  /** Complementares por peça boa (quantidade x custo), já somados. */
  complementares_por_peca: number;
  quantidade_aprovada: number;
  quantidade_perdida: number;
};

export type CustoRealizado = {
  material: number;
  maquina: number;
  energia: number;
  mao_de_obra: number;
  complementares: number;
  total: number;
  /** Null quando nenhuma peça foi aprovada. */
  por_peca_boa: number | null;
  /** Vai para a linha "perda de produção" quando não há peça boa. */
  perda_producao: number;
};

const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();

/**
 * Custo realizado de uma ordem: só variável, ao custo real do lote e das horas reais.
 * Peças perdidas são absorvidas pelas boas; sem peça boa, tudo vira perda de produção.
 * Custo fixo rateado nunca entra: já aparece como despesa no financeiro.
 */
export function custoRealizado(e: EntradasRealizado): CustoRealizado {
  const material = e.consumos.reduce(
    (acc, c) => acc.plus(new Decimal(c.quantidade).times(c.custo_unitario)),
    new Decimal(0),
  );
  const horas = new Decimal(e.horas_maquina);
  const maquina = e.impressora
    ? horas.times(
        new Decimal(e.impressora.depreciacao)
          .plus(e.impressora.manutencao)
          .plus(e.impressora.consumiveis),
      )
    : new Decimal(0);
  const energia = e.impressora ? horas.times(e.impressora.energia) : new Decimal(0);
  const maoDeObra = new Decimal(e.minutos_mao_de_obra).div(60).times(e.custo_hora_mao_obra);
  const complementares = new Decimal(e.complementares_por_peca).times(e.quantidade_aprovada);
  const total = material.plus(maquina).plus(energia).plus(maoDeObra).plus(complementares);
  const aprovada = e.quantidade_aprovada;
  return {
    material: r4(material),
    maquina: r4(maquina),
    energia: r4(energia),
    mao_de_obra: r4(maoDeObra),
    complementares: r4(complementares),
    total: r4(total),
    por_peca_boa: aprovada > 0 ? r4(total.div(aprovada)) : null,
    perda_producao: aprovada > 0 ? 0 : r4(total),
  };
}

export const ESTADOS_ORDEM = [
  "fila",
  "imprimindo",
  "acabamento",
  "concluida",
  "cancelada",
] as const;
export type EstadoOrdem = (typeof ESTADOS_ORDEM)[number];
export const ESTADO_ORDEM_ROTULO: Record<EstadoOrdem, string> = {
  fila: "Na fila",
  imprimindo: "Imprimindo",
  acabamento: "Acabamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Transições permitidas pela tela. Concluir e reabrir passam por função SQL. */
export const TRANSICOES: Record<EstadoOrdem, EstadoOrdem[]> = {
  fila: ["imprimindo", "cancelada"],
  imprimindo: ["acabamento", "fila", "cancelada"],
  acabamento: ["imprimindo", "concluida", "cancelada"],
  concluida: ["acabamento"],
  cancelada: ["fila"],
};

export function podeTransitar(de: EstadoOrdem, para: EstadoOrdem): boolean {
  return TRANSICOES[de].includes(para);
}
