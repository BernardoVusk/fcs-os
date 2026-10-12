/** Agregações dos relatórios a partir das linhas brutas das views. Puro, com decimal para dinheiro. */
import Decimal from "decimal.js";

const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
const r4 = (d: Decimal) => d.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
const dec = (v: number | string | null | undefined) => new Decimal(v == null || v === "" ? 0 : v);

/** Variação relativa entre dois valores; null quando a base é zero ou falta. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || anterior === 0) return null;
  return r4(dec(atual).minus(anterior).div(Math.abs(anterior)));
}

/** Linha da view rel_vendas_itens: um item de pedido pago. */
export type LinhaVendaItem = {
  pedido_id: string;
  pedido_codigo: string;
  data_pagamento: string;
  canal_id: string;
  canal_nome: string;
  produto_id: string | null;
  produto_nome: string | null;
  variacao_id: string | null;
  quantidade: number;
  receita: number | string;
  custo_estimado: number | string | null;
  custo_realizado: number | string | null;
};

export type LinhaProduto = {
  produto_id: string | null;
  produto: string;
  quantidade: number;
  receita: number;
  custo_estimado: number | null;
  custo_realizado: number | null;
  resultado_estimado: number | null;
  resultado_real: number | null;
  margem_estimada: number | null;
  margem_real: number | null;
  pedidos: number;
};

/** Rentabilidade por produto: soma dos itens; custo só quando todos os itens do produto têm. */
export function rentabilidadePorProduto(linhas: readonly LinhaVendaItem[]): LinhaProduto[] {
  const mapa = new Map<
    string,
    {
      produto_id: string | null;
      produto: string;
      qtd: number;
      receita: Decimal;
      est: Decimal | null;
      real: Decimal | null;
      pedidos: Set<string>;
    }
  >();
  for (const l of linhas) {
    const chave = l.produto_id ?? "avulso";
    const g = mapa.get(chave) ?? {
      produto_id: l.produto_id,
      produto: l.produto_nome ?? "Itens avulsos",
      qtd: 0,
      receita: new Decimal(0),
      est: new Decimal(0),
      real: new Decimal(0),
      pedidos: new Set<string>(),
    };
    g.qtd += Number(l.quantidade);
    g.receita = g.receita.plus(dec(l.receita));
    g.est =
      g.est && l.custo_estimado != null
        ? g.est.plus(dec(l.custo_estimado).times(l.quantidade))
        : null;
    g.real =
      g.real && l.custo_realizado != null
        ? g.real.plus(dec(l.custo_realizado).times(l.quantidade))
        : null;
    g.pedidos.add(l.pedido_id);
    mapa.set(chave, g);
  }
  return [...mapa.values()]
    .map((g) => {
      const resultadoEst = g.est ? g.receita.minus(g.est) : null;
      const resultadoReal = g.real ? g.receita.minus(g.real) : null;
      return {
        produto_id: g.produto_id,
        produto: g.produto,
        quantidade: g.qtd,
        receita: r2(g.receita),
        custo_estimado: g.est ? r2(g.est) : null,
        custo_realizado: g.real ? r2(g.real) : null,
        resultado_estimado: resultadoEst ? r2(resultadoEst) : null,
        resultado_real: resultadoReal ? r2(resultadoReal) : null,
        margem_estimada:
          resultadoEst && !g.receita.isZero() ? r4(resultadoEst.div(g.receita)) : null,
        margem_real: resultadoReal && !g.receita.isZero() ? r4(resultadoReal.div(g.receita)) : null,
        pedidos: g.pedidos.size,
      };
    })
    .sort((a, b) => b.receita - a.receita);
}

/** Linha da view rel_pedidos_pagos: o resumo de um pedido pago. */
export type LinhaPedido = {
  pedido_id: string;
  codigo: string;
  data_pagamento: string;
  canal_id: string;
  canal_nome: string;
  receita_bruta: number | string | null;
  base_vendas: number | string | null;
  taxas_canal: number | string | null;
  valor_a_receber: number | string | null;
  imposto_estimado: number | string | null;
  receita_liquida: number | string | null;
  custo_estimado: number | string | null;
  custo_realizado: number | string | null;
  resultado_estimado: number | string | null;
  resultado_real: number | string | null;
};

export type LinhaCanal = {
  canal_id: string;
  canal: string;
  pedidos: number;
  base_vendas: number;
  taxas_canal: number;
  receita_liquida: number;
  custo_estimado: number | null;
  resultado_estimado: number | null;
  margem_estimada: number | null;
  resultado_real: number | null;
  taxa_media: number | null;
};

/** Rentabilidade por canal pelo resumo dos pedidos; custo e resultado só se todos os pedidos têm. */
export function rentabilidadePorCanal(pedidos: readonly LinhaPedido[]): LinhaCanal[] {
  const mapa = new Map<
    string,
    {
      canal: string;
      n: number;
      base: Decimal;
      taxas: Decimal;
      liquida: Decimal;
      est: Decimal | null;
      resEst: Decimal | null;
      resReal: Decimal | null;
    }
  >();
  for (const p of pedidos) {
    const g = mapa.get(p.canal_id) ?? {
      canal: p.canal_nome,
      n: 0,
      base: new Decimal(0),
      taxas: new Decimal(0),
      liquida: new Decimal(0),
      est: new Decimal(0),
      resEst: new Decimal(0),
      resReal: new Decimal(0),
    };
    g.n += 1;
    g.base = g.base.plus(dec(p.base_vendas));
    g.taxas = g.taxas.plus(dec(p.taxas_canal));
    g.liquida = g.liquida.plus(dec(p.receita_liquida));
    g.est = g.est && p.custo_estimado != null ? g.est.plus(dec(p.custo_estimado)) : null;
    g.resEst =
      g.resEst && p.resultado_estimado != null ? g.resEst.plus(dec(p.resultado_estimado)) : null;
    g.resReal =
      g.resReal && p.resultado_real != null ? g.resReal.plus(dec(p.resultado_real)) : null;
    mapa.set(p.canal_id, g);
  }
  return [...mapa.entries()]
    .map(([canal_id, g]) => ({
      canal_id,
      canal: g.canal,
      pedidos: g.n,
      base_vendas: r2(g.base),
      taxas_canal: r2(g.taxas),
      receita_liquida: r2(g.liquida),
      custo_estimado: g.est ? r2(g.est) : null,
      resultado_estimado: g.resEst ? r2(g.resEst) : null,
      margem_estimada: g.resEst && !g.base.isZero() ? r4(g.resEst.div(g.base)) : null,
      resultado_real: g.resReal ? r2(g.resReal) : null,
      taxa_media: g.base.isZero() ? null : r4(g.taxas.div(g.base)),
    }))
    .sort((a, b) => b.base_vendas - a.base_vendas);
}

/** Linha da view rel_ordens_concluidas. */
export type LinhaOrdem = {
  ordem_id: string;
  codigo: string;
  fim_real: string;
  produto_id: string;
  produto_nome: string;
  impressora_id: string | null;
  impressora_nome: string | null;
  quantidade_aprovada: number;
  quantidade_perdida: number;
  tempo_previsto_min: number | string | null;
  tempo_real_min: number | string | null;
  custo_estimado: number | string | null;
  custo_realizado: number | string | null;
};

export type LinhaCustoProduto = {
  produto_id: string;
  produto: string;
  ordens: number;
  pecas: number;
  estimado_total: number | null;
  realizado_total: number | null;
  estimado_por_peca: number | null;
  realizado_por_peca: number | null;
  desvio: number | null;
  desvio_pct: number | null;
};

/** Custo real x estimado por produto: só ordens com peça aprovada e os dois custos. */
export function custoRealVsEstimado(ordens: readonly LinhaOrdem[]): LinhaCustoProduto[] {
  const mapa = new Map<
    string,
    { produto: string; ordens: number; pecas: number; est: Decimal; real: Decimal }
  >();
  for (const o of ordens) {
    if (o.custo_estimado == null || o.custo_realizado == null || o.quantidade_aprovada <= 0)
      continue;
    const g = mapa.get(o.produto_id) ?? {
      produto: o.produto_nome,
      ordens: 0,
      pecas: 0,
      est: new Decimal(0),
      real: new Decimal(0),
    };
    g.ordens += 1;
    g.pecas += o.quantidade_aprovada;
    g.est = g.est.plus(dec(o.custo_estimado));
    g.real = g.real.plus(dec(o.custo_realizado));
    mapa.set(o.produto_id, g);
  }
  return [...mapa.entries()]
    .map(([produto_id, g]) => {
      const desvio = g.real.minus(g.est);
      return {
        produto_id,
        produto: g.produto,
        ordens: g.ordens,
        pecas: g.pecas,
        estimado_total: r2(g.est),
        realizado_total: r2(g.real),
        estimado_por_peca: r4(g.est.div(g.pecas)),
        realizado_por_peca: r4(g.real.div(g.pecas)),
        desvio: r2(desvio),
        desvio_pct: g.est.isZero() ? null : r4(desvio.div(g.est)),
      };
    })
    .sort((a, b) => Math.abs(b.desvio ?? 0) - Math.abs(a.desvio ?? 0));
}

export type LinhaImpressora = {
  impressora_id: string | null;
  impressora: string;
  ordens: number;
  horas_reais: number;
  horas_previstas: number;
  aprovadas: number;
  perdidas: number;
  falha_real: number | null;
  desvio_tempo_pct: number | null;
};

/** Desempenho por impressora a partir das ordens concluídas. */
export function desempenhoImpressoras(ordens: readonly LinhaOrdem[]): LinhaImpressora[] {
  const mapa = new Map<
    string,
    {
      impressora: string;
      impressora_id: string | null;
      ordens: number;
      real: Decimal;
      prev: Decimal;
      ok: number;
      perd: number;
    }
  >();
  for (const o of ordens) {
    const chave = o.impressora_id ?? "sem";
    const g = mapa.get(chave) ?? {
      impressora: o.impressora_nome ?? "Sem impressora",
      impressora_id: o.impressora_id,
      ordens: 0,
      real: new Decimal(0),
      prev: new Decimal(0),
      ok: 0,
      perd: 0,
    };
    g.ordens += 1;
    g.real = g.real.plus(dec(o.tempo_real_min));
    g.prev = g.prev.plus(dec(o.tempo_previsto_min));
    g.ok += o.quantidade_aprovada;
    g.perd += o.quantidade_perdida;
    mapa.set(chave, g);
  }
  return [...mapa.values()]
    .map((g) => ({
      impressora_id: g.impressora_id,
      impressora: g.impressora,
      ordens: g.ordens,
      horas_reais: r2(g.real.div(60)),
      horas_previstas: r2(g.prev.div(60)),
      aprovadas: g.ok,
      perdidas: g.perd,
      falha_real: g.ok + g.perd > 0 ? r4(new Decimal(g.perd).div(g.ok + g.perd)) : null,
      desvio_tempo_pct: g.prev.isZero() ? null : r4(g.real.minus(g.prev).div(g.prev)),
    }))
    .sort((a, b) => b.horas_reais - a.horas_reais);
}

/** Linha da view rel_consumo_mensal. */
export type LinhaConsumo = {
  mes: string;
  insumo_id: string;
  insumo_nome: string;
  quantidade_g: number | string;
  valor: number | string;
};

export type LinhaConsumoMes = {
  mes: string;
  quantidade_g: number;
  valor: number;
  por_insumo: { insumo_id: string; insumo: string; quantidade_g: number; valor: number }[];
};

/** Consumo de filamento por mês, com a quebra por insumo, do mês mais recente ao mais antigo. */
export function consumoPorMes(linhas: readonly LinhaConsumo[]): LinhaConsumoMes[] {
  const mapa = new Map<
    string,
    { q: Decimal; v: Decimal; itens: Map<string, { insumo: string; q: Decimal; v: Decimal }> }
  >();
  for (const l of linhas) {
    const g = mapa.get(l.mes) ?? { q: new Decimal(0), v: new Decimal(0), itens: new Map() };
    const q = dec(l.quantidade_g).abs();
    const v = dec(l.valor).abs();
    g.q = g.q.plus(q);
    g.v = g.v.plus(v);
    const i = g.itens.get(l.insumo_id) ?? {
      insumo: l.insumo_nome,
      q: new Decimal(0),
      v: new Decimal(0),
    };
    i.q = i.q.plus(q);
    i.v = i.v.plus(v);
    g.itens.set(l.insumo_id, i);
    mapa.set(l.mes, g);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([mes, g]) => ({
      mes,
      quantidade_g: r2(g.q),
      valor: r2(g.v),
      por_insumo: [...g.itens.entries()]
        .map(([insumo_id, i]) => ({
          insumo_id,
          insumo: i.insumo,
          quantidade_g: r2(i.q),
          valor: r2(i.v),
        }))
        .sort((a, b) => b.quantidade_g - a.quantidade_g),
    }));
}
