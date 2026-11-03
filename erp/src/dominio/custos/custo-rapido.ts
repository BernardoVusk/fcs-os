import Decimal from "decimal.js";

const D = (v: number | string) => new Decimal(v);
const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();

export type ItemEmbalagem = { quantidade: number; custo_unitario: number };

/** Entradas da calculadora rápida (/calculadora), no formato da planilha "Custo De Impressão". */
export type EntradasCustoRapido = {
  horas: number;
  gramas: number;
  /** R$ por quilo de filamento. */
  filamento_kg: number;
  /** R$ por hora de impressão. */
  energia_hora: number;
  /** R$ por hora de máquina: retorno do investimento, manutenção e consumíveis. */
  maquina_hora: number;
  /** Fração das tentativas perdidas, 0 <= f < 1. */
  falha: number;
  /** R$ por peça, só em peça boa. */
  acabamento: number;
  pintura: number;
  fixacao: number;
  extras: number;
  embalagem: ItemEmbalagem[];
};

export type CustoRapido = {
  material: number;
  energia: number;
  maquina: number;
  falhas: number;
  acabamento: number;
  pintura: number;
  fixacao: number;
  extras: number;
  embalagem: number;
  total: number;
  /** Total sem arredondar, para alimentar o preço. */
  total_exato: string;
};

/** Chaves de erro (traduzidas por erroPt) quando as entradas não permitem calcular. */
export function validarCustoRapido(e: EntradasCustoRapido): string[] {
  const erros: string[] = [];
  const naoNegativos = [
    e.horas,
    e.gramas,
    e.filamento_kg,
    e.energia_hora,
    e.maquina_hora,
    e.acabamento,
    e.pintura,
    e.fixacao,
    e.extras,
    ...e.embalagem.flatMap((i) => [i.quantidade, i.custo_unitario]),
  ];
  if (naoNegativos.some((v) => !(v >= 0))) erros.push("valor_negativo");
  if (!(e.falha >= 0 && e.falha < 1)) erros.push("taxa_falha_invalida");
  return erros;
}

/**
 * Custo de produção por peça boa.
 * material = R$/kg / 1000 x gramas; energia e máquina = R$/h x horas.
 * Falha f repõe o que se perde na tentativa (material, energia e máquina): x f / (1 - f).
 * Acabamento, pintura, fixação, extras e embalagem só acontecem em peça boa.
 */
export function custoProducaoRapido(e: EntradasCustoRapido): CustoRapido {
  const erros = validarCustoRapido(e);
  if (erros.length > 0) throw new Error(erros[0]);
  const material = D(e.filamento_kg).div(1000).times(e.gramas);
  const energia = D(e.energia_hora).times(e.horas);
  const maquina = D(e.maquina_hora).times(e.horas);
  const falhas = material.plus(energia).plus(maquina).times(e.falha).div(D(1).minus(e.falha));
  const embalagem = e.embalagem.reduce(
    (acc, i) => acc.plus(D(i.quantidade).times(i.custo_unitario)),
    D(0),
  );
  const total = material
    .plus(energia)
    .plus(maquina)
    .plus(falhas)
    .plus(e.acabamento)
    .plus(e.pintura)
    .plus(e.fixacao)
    .plus(e.extras)
    .plus(embalagem);
  return {
    material: r4(material),
    energia: r4(energia),
    maquina: r4(maquina),
    falhas: r4(falhas),
    acabamento: r4(D(e.acabamento)),
    pintura: r4(D(e.pintura)),
    fixacao: r4(D(e.fixacao)),
    extras: r4(D(e.extras)),
    embalagem: r4(embalagem),
    total: r4(total),
    total_exato: total.toString(),
  };
}
