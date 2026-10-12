export type MetodoFixo = "hora" | "peca" | "desligado";

export type ParametrosFixo = {
  metodo: MetodoFixo;
  custo_fixo_mensal: number;
  horas_produtivas_mes: number;
  volume_mensal_estimado: number;
};

/** Custos por hora de máquina já derivados (ver impressora.ts). */
export type CustoHoraImpressora = {
  depreciacao: number;
  manutencao: number;
  consumiveis: number;
  energia: number;
};

export type DadosImpressora = {
  custo_aquisicao: number;
  valor_residual: number;
  vida_util_horas: number;
  potencia_media_w: number;
  custo_manutencao_ano: number;
  custo_consumiveis_ano: number;
  horas_produtivas_ano: number;
};

/** Tudo que o cálculo de custo por peça precisa, já resolvido (sem banco). */
export type EntradasPeca = {
  peso_g: number;
  tempo_ciclo_min: number;
  pecas_por_ciclo: number;
  /** Fração de tentativas perdidas, 0 <= f < 1. */
  taxa_falha: number;
  /** Fração de material extra (purga, descarte), w >= 0. */
  desperdicio: number;
  custo_g: number;
  preparo_ciclo_min: number;
  acabamento_peca_min: number;
  embalagem_peca_min: number;
  custo_hora_mao_obra: number;
  /** Soma de quantidade x custo dos itens complementares por peça. */
  complementares_peca: number;
  /** Soma dos itens por pedido; entra nos fixos por unidade vendida (F), não em C. */
  complementares_pedido: number;
  impressora: CustoHoraImpressora;
  fixo: ParametrosFixo;
  /** Componentes desligados em Configurações > Parâmetros de custo: entram como zero, mas o snapshot guarda as entradas. */
  desligados?: (keyof ComponentesCusto)[];
};

export type ComponentesCusto = {
  material: number;
  depreciacao: number;
  manutencao: number;
  consumiveis: number;
  energia: number;
  preparo: number;
  acabamento: number;
  embalagem: number;
  complementares_peca: number;
  fixo_rateado: number;
};

export type ResultadoCusto = {
  fator_falha: number;
  pecas_boas_por_tentativa: number;
  gramas_por_peca_boa: number;
  horas_por_peca_boa: number;
  /** Cada componente a 4 casas. */
  componentes: ComponentesCusto;
  /** C sem o fixo rateado, 4 casas. */
  custo_variavel: number;
  /** C, 4 casas. */
  custo_total: number;
  /** Precisão cheia, para formar preço e reproduzir snapshots. */
  exato: { custo_variavel: string; custo_total: string; fixo_rateado: string };
};

export const COMPONENTES_ROTULO: Record<keyof ComponentesCusto, string> = {
  material: "Material",
  depreciacao: "Depreciação da impressora",
  manutencao: "Manutenção",
  consumiveis: "Consumíveis da impressora",
  energia: "Energia",
  preparo: "Preparo (mão de obra)",
  acabamento: "Acabamento (mão de obra)",
  embalagem: "Embalagem (mão de obra)",
  complementares_peca: "Complementares por peça",
  fixo_rateado: "Custo fixo rateado",
};

/** Componentes que recebem o fator de falha. Acabamento, embalagem e complementares não recebem. */
export const COM_FATOR_FALHA: (keyof ComponentesCusto)[] = [
  "material",
  "depreciacao",
  "manutencao",
  "consumiveis",
  "energia",
  "preparo",
  "fixo_rateado",
];
