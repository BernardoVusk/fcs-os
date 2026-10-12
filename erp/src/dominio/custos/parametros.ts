import type { MetodoFixo } from "./tipos";

/** Conteúdo de parametros_custo.dados. Null ou ausente = não configurado; nunca há valor padrão inventado. */
export type ParametrosCusto = {
  tarifa_kwh: number | null;
  custo_hora_mao_obra: number | null;
  taxa_falha_padrao: number | null;
  desperdicio_padrao: number | null;
  custo_fixo_mensal: number | null;
  horas_produtivas_mes: number | null;
  volume_mensal_estimado: number | null;
  metodo_rateio_fixo: MetodoFixo | null;
  imposto_pct_estimado: number | null;
  metodo_margem_padrao: "margem" | "markup" | null;
  margem_alvo_padrao: number | null;
  markup_padrao: number | null;
};

export const CHAVES_PARAMETROS = [
  "tarifa_kwh",
  "custo_hora_mao_obra",
  "taxa_falha_padrao",
  "desperdicio_padrao",
  "custo_fixo_mensal",
  "horas_produtivas_mes",
  "volume_mensal_estimado",
  "metodo_rateio_fixo",
  "imposto_pct_estimado",
  "metodo_margem_padrao",
  "margem_alvo_padrao",
  "markup_padrao",
] as const satisfies readonly (keyof ParametrosCusto)[];

export const PARAMETRO_ROTULO: Record<keyof ParametrosCusto, string> = {
  tarifa_kwh: "Tarifa de energia (R$/kWh)",
  custo_hora_mao_obra: "Mão de obra (R$/hora)",
  taxa_falha_padrao: "Taxa de falha padrão",
  desperdicio_padrao: "Desperdício padrão",
  custo_fixo_mensal: "Custo fixo mensal (R$)",
  horas_produtivas_mes: "Horas produtivas por mês",
  volume_mensal_estimado: "Peças por mês (estimativa)",
  metodo_rateio_fixo: "Rateio do custo fixo",
  imposto_pct_estimado: "Imposto estimado sobre o preço",
  metodo_margem_padrao: "Método de preço padrão",
  margem_alvo_padrao: "Margem alvo padrão",
  markup_padrao: "Markup padrão",
};

/** Chaves que são percentuais (digitados em por cento, guardados como fração). */
export const PARAMETROS_PERCENTUAIS: (keyof ParametrosCusto)[] = [
  "taxa_falha_padrao",
  "desperdicio_padrao",
  "imposto_pct_estimado",
  "margem_alvo_padrao",
  "markup_padrao",
];

export const METODO_FIXO_ROTULO: Record<MetodoFixo, string> = {
  hora: "Por hora produtiva",
  peca: "Por peça do mês",
  desligado: "Desligado (não entra no preço)",
};

export function lerParametros(dados: unknown): ParametrosCusto {
  const d = (dados ?? {}) as Record<string, unknown>;
  const num = (k: string) =>
    typeof d[k] === "number" && Number.isFinite(d[k]) ? (d[k] as number) : null;
  const metodoFixo = d.metodo_rateio_fixo;
  const metodoMargem = d.metodo_margem_padrao;
  return {
    tarifa_kwh: num("tarifa_kwh"),
    custo_hora_mao_obra: num("custo_hora_mao_obra"),
    taxa_falha_padrao: num("taxa_falha_padrao"),
    desperdicio_padrao: num("desperdicio_padrao"),
    custo_fixo_mensal: num("custo_fixo_mensal"),
    horas_produtivas_mes: num("horas_produtivas_mes"),
    volume_mensal_estimado: num("volume_mensal_estimado"),
    metodo_rateio_fixo:
      metodoFixo === "hora" || metodoFixo === "peca" || metodoFixo === "desligado"
        ? metodoFixo
        : null,
    imposto_pct_estimado: num("imposto_pct_estimado"),
    metodo_margem_padrao:
      metodoMargem === "margem" || metodoMargem === "markup" ? metodoMargem : null,
    margem_alvo_padrao: num("margem_alvo_padrao"),
    markup_padrao: num("markup_padrao"),
  };
}

/** O que falta para a calculadora funcionar. Vazio = pronto. */
export function parametrosFaltantes(p: ParametrosCusto): (keyof ParametrosCusto)[] {
  const faltam: (keyof ParametrosCusto)[] = [];
  if (p.tarifa_kwh == null) faltam.push("tarifa_kwh");
  if (p.custo_hora_mao_obra == null) faltam.push("custo_hora_mao_obra");
  if (p.metodo_rateio_fixo == null) faltam.push("metodo_rateio_fixo");
  if (
    p.metodo_rateio_fixo === "hora" &&
    (p.custo_fixo_mensal == null || p.horas_produtivas_mes == null)
  )
    faltam.push("custo_fixo_mensal", "horas_produtivas_mes");
  if (
    p.metodo_rateio_fixo === "peca" &&
    (p.custo_fixo_mensal == null || p.volume_mensal_estimado == null)
  )
    faltam.push("custo_fixo_mensal", "volume_mensal_estimado");
  return [...new Set(faltam)];
}
