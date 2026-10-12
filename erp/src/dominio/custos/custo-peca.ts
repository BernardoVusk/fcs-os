import Decimal from "decimal.js";
import type { ComponentesCusto, EntradasPeca, ResultadoCusto } from "./tipos";

const D = (v: number | string) => new Decimal(v);
const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();

/** Chaves de erro (traduzidas por erroPt) quando as entradas não permitem calcular. */
export function validarEntradas(e: EntradasPeca): string[] {
  const erros: string[] = [];
  if (!(e.peso_g >= 0)) erros.push("peso_invalido");
  if (!(e.tempo_ciclo_min >= 0)) erros.push("tempo_invalido");
  if (!(Number.isInteger(e.pecas_por_ciclo) && e.pecas_por_ciclo >= 1))
    erros.push("pecas_por_ciclo_invalido");
  if (!(e.taxa_falha >= 0 && e.taxa_falha < 1)) erros.push("taxa_falha_invalida");
  if (!(e.desperdicio >= 0)) erros.push("desperdicio_invalido");
  if (!(e.custo_g >= 0)) erros.push("custo_g_invalido");
  if (!(e.custo_hora_mao_obra >= 0)) erros.push("mao_de_obra_invalida");
  if (e.fixo.metodo === "hora" && !(e.fixo.horas_produtivas_mes > 0)) erros.push("fixo_sem_horas");
  if (e.fixo.metodo === "peca" && !(e.fixo.volume_mensal_estimado > 0))
    erros.push("fixo_sem_volume");
  return erros;
}

/**
 * Custo por peça boa (spec seção 7.2).
 * O fator de falha 1/(1-f) incide em material, máquina, energia, preparo e fixo por hora:
 * tudo que se perde quando uma tentativa falha. Desperdício w incide só no material.
 * Acabamento, embalagem e complementares acontecem só em peça boa.
 */
export function calcularCustoPeca(e: EntradasPeca): ResultadoCusto {
  const erros = validarEntradas(e);
  if (erros.length > 0) throw new Error(erros[0]);
  const f = D(e.taxa_falha);
  const n = D(e.pecas_por_ciclo);
  const fator = D(1).div(D(1).minus(f));
  const horasPeca = D(e.tempo_ciclo_min).div(60).div(n);
  const horasBoa = horasPeca.times(fator);
  const gramasBoa = D(e.peso_g).times(D(1).plus(e.desperdicio)).times(fator);
  const mo = D(e.custo_hora_mao_obra);

  const material = gramasBoa.times(e.custo_g);
  const depreciacao = horasBoa.times(e.impressora.depreciacao);
  const manutencao = horasBoa.times(e.impressora.manutencao);
  const consumiveis = horasBoa.times(e.impressora.consumiveis);
  const energia = horasBoa.times(e.impressora.energia);
  const preparo = D(e.preparo_ciclo_min).div(60).div(n).times(mo).times(fator);
  const acabamento = D(e.acabamento_peca_min).div(60).times(mo);
  const embalagem = D(e.embalagem_peca_min).div(60).times(mo);
  const complementares = D(e.complementares_peca);
  const fixo =
    e.fixo.metodo === "hora"
      ? horasBoa.times(D(e.fixo.custo_fixo_mensal).div(e.fixo.horas_produtivas_mes))
      : e.fixo.metodo === "peca"
        ? D(e.fixo.custo_fixo_mensal).div(e.fixo.volume_mensal_estimado)
        : D(0);

  const desligados = new Set(e.desligados ?? []);
  const liga = (chave: keyof ComponentesCusto, valor: Decimal) =>
    desligados.has(chave) ? D(0) : valor;
  const exatos = {
    material: liga("material", material),
    depreciacao: liga("depreciacao", depreciacao),
    manutencao: liga("manutencao", manutencao),
    consumiveis: liga("consumiveis", consumiveis),
    energia: liga("energia", energia),
    preparo: liga("preparo", preparo),
    acabamento: liga("acabamento", acabamento),
    embalagem: liga("embalagem", embalagem),
    complementares_peca: liga("complementares_peca", complementares),
    fixo_rateado: liga("fixo_rateado", fixo),
  };
  const variavel = Object.entries(exatos).reduce(
    (acc, [k, v]) => (k === "fixo_rateado" ? acc : acc.plus(v)),
    D(0),
  );
  const total = variavel.plus(exatos.fixo_rateado);
  const componentes = Object.fromEntries(
    Object.entries(exatos).map(([k, v]) => [k, r4(v)]),
  ) as ComponentesCusto;
  return {
    fator_falha: fator.toDecimalPlaces(6).toNumber(),
    pecas_boas_por_tentativa: r4(n.times(D(1).minus(f))),
    gramas_por_peca_boa: r4(gramasBoa),
    horas_por_peca_boa: r4(horasBoa),
    componentes,
    custo_variavel: r4(variavel),
    custo_total: r4(total),
    exato: {
      custo_variavel: variavel.toString(),
      custo_total: total.toString(),
      fixo_rateado: exatos.fixo_rateado.toString(),
    },
  };
}
