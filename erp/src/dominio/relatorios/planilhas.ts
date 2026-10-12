/** Converte os relatórios agregados em planilhas (cabeçalho e linhas) para CSV e XLSX. Puro. */
import type { Celula } from "./csv";
import type {
  LinhaCanal,
  LinhaConsumoMes,
  LinhaCustoProduto,
  LinhaImpressora,
  LinhaOrdem,
  LinhaPedido,
  LinhaProduto,
} from "./agregacoes";

export type Tabela = { nome: string; cabecalho: string[]; linhas: Celula[][] };

export const RELATORIOS = [
  { chave: "produto", rotulo: "Por produto" },
  { chave: "canal", rotulo: "Por canal" },
  { chave: "pedidos", rotulo: "Por pedido" },
  { chave: "custo", rotulo: "Custo real x estimado" },
  { chave: "impressoras", rotulo: "Impressoras" },
  { chave: "consumo", rotulo: "Consumo de filamento" },
] as const;
export type Relatorio = (typeof RELATORIOS)[number]["chave"];

export function relatorioValido(v: unknown): v is Relatorio {
  return typeof v === "string" && RELATORIOS.some((r) => r.chave === v);
}

const pct = (v: number | null) => (v == null ? null : Math.round(v * 10000) / 100);

export function tabelaProdutos(l: readonly LinhaProduto[]): Tabela {
  return {
    nome: "Por produto",
    cabecalho: [
      "Produto",
      "Quantidade",
      "Pedidos",
      "Receita",
      "Custo estimado",
      "Custo realizado",
      "Resultado estimado",
      "Resultado real",
      "Margem estimada %",
      "Margem real %",
    ],
    linhas: l.map((p) => [
      p.produto,
      p.quantidade,
      p.pedidos,
      p.receita,
      p.custo_estimado,
      p.custo_realizado,
      p.resultado_estimado,
      p.resultado_real,
      pct(p.margem_estimada),
      pct(p.margem_real),
    ]),
  };
}

export function tabelaCanais(l: readonly LinhaCanal[]): Tabela {
  return {
    nome: "Por canal",
    cabecalho: [
      "Canal",
      "Pedidos",
      "Base de vendas",
      "Taxas do canal",
      "Taxa média %",
      "Receita líquida",
      "Custo estimado",
      "Resultado estimado",
      "Margem estimada %",
      "Resultado real",
    ],
    linhas: l.map((c) => [
      c.canal,
      c.pedidos,
      c.base_vendas,
      c.taxas_canal,
      pct(c.taxa_media),
      c.receita_liquida,
      c.custo_estimado,
      c.resultado_estimado,
      pct(c.margem_estimada),
      c.resultado_real,
    ]),
  };
}

const num = (v: number | string | null) => (v == null || v === "" ? null : Number(v));

export function tabelaPedidos(l: readonly LinhaPedido[]): Tabela {
  return {
    nome: "Por pedido",
    cabecalho: [
      "Pedido",
      "Pago em",
      "Canal",
      "Receita bruta",
      "Base de vendas",
      "Taxas",
      "A receber",
      "Imposto estimado",
      "Receita líquida",
      "Custo estimado",
      "Custo realizado",
      "Resultado estimado",
      "Resultado real",
    ],
    linhas: l.map((p) => [
      p.codigo,
      p.data_pagamento,
      p.canal_nome,
      num(p.receita_bruta),
      num(p.base_vendas),
      num(p.taxas_canal),
      num(p.valor_a_receber),
      num(p.imposto_estimado),
      num(p.receita_liquida),
      num(p.custo_estimado),
      num(p.custo_realizado),
      num(p.resultado_estimado),
      num(p.resultado_real),
    ]),
  };
}

export function tabelaCusto(l: readonly LinhaCustoProduto[]): Tabela {
  return {
    nome: "Custo real x estimado",
    cabecalho: [
      "Produto",
      "Ordens",
      "Peças",
      "Estimado total",
      "Realizado total",
      "Estimado por peça",
      "Realizado por peça",
      "Desvio",
      "Desvio %",
    ],
    linhas: l.map((c) => [
      c.produto,
      c.ordens,
      c.pecas,
      c.estimado_total,
      c.realizado_total,
      c.estimado_por_peca,
      c.realizado_por_peca,
      c.desvio,
      pct(c.desvio_pct),
    ]),
  };
}

export function tabelaOrdens(l: readonly LinhaOrdem[]): Tabela {
  return {
    nome: "Ordens concluídas",
    cabecalho: [
      "Ordem",
      "Concluída em",
      "Produto",
      "Impressora",
      "Aprovadas",
      "Perdidas",
      "Tempo previsto (min)",
      "Tempo real (min)",
      "Custo estimado",
      "Custo realizado",
    ],
    linhas: l.map((o) => [
      o.codigo,
      o.fim_real.slice(0, 10),
      o.produto_nome,
      o.impressora_nome,
      o.quantidade_aprovada,
      o.quantidade_perdida,
      num(o.tempo_previsto_min),
      num(o.tempo_real_min),
      num(o.custo_estimado),
      num(o.custo_realizado),
    ]),
  };
}

export function tabelaImpressoras(l: readonly LinhaImpressora[]): Tabela {
  return {
    nome: "Impressoras",
    cabecalho: [
      "Impressora",
      "Ordens",
      "Horas reais",
      "Horas previstas",
      "Desvio de tempo %",
      "Aprovadas",
      "Perdidas",
      "Falha real %",
    ],
    linhas: l.map((i) => [
      i.impressora,
      i.ordens,
      i.horas_reais,
      i.horas_previstas,
      pct(i.desvio_tempo_pct),
      i.aprovadas,
      i.perdidas,
      pct(i.falha_real),
    ]),
  };
}

export function tabelaConsumo(l: readonly LinhaConsumoMes[]): Tabela {
  return {
    nome: "Consumo de filamento",
    cabecalho: ["Mês", "Insumo", "Gramas", "Valor"],
    linhas: l.flatMap((m) => [
      [m.mes, "Total do mês", m.quantidade_g, m.valor],
      ...m.por_insumo.map((i) => [m.mes, i.insumo, i.quantidade_g, i.valor]),
    ]),
  };
}
