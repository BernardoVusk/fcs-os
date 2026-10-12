import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  consumoPorMes,
  custoRealVsEstimado,
  desempenhoImpressoras,
  rentabilidadePorCanal,
  rentabilidadePorProduto,
  type LinhaConsumo,
  type LinhaOrdem,
  type LinhaPedido,
  type LinhaVendaItem,
} from "@/dominio/relatorios/agregacoes";

/** Intervalo em ISO (timestamptz) ou data (AAAA-MM-DD); as views usam o que cada uma precisa. */
export type Intervalo = { inicio: string; fim: string };

export async function itensVendidos(i: Intervalo): Promise<LinhaVendaItem[]> {
  const c = await clienteServidor();
  const { data, error } = await c
    .from("rel_vendas_itens")
    .select("*")
    .gte("data_pagamento", i.inicio.slice(0, 10))
    .lt("data_pagamento", i.fim.slice(0, 10))
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaVendaItem[];
}

export async function pedidosPagos(i: Intervalo): Promise<LinhaPedido[]> {
  const c = await clienteServidor();
  const { data, error } = await c
    .from("rel_pedidos_pagos")
    .select("*")
    .gte("data_pagamento", i.inicio.slice(0, 10))
    .lt("data_pagamento", i.fim.slice(0, 10))
    .order("data_pagamento", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaPedido[];
}

export async function ordensConcluidas(i: Intervalo): Promise<LinhaOrdem[]> {
  const c = await clienteServidor();
  const { data, error } = await c
    .from("rel_ordens_concluidas")
    .select("*")
    .gte("fim_real", i.inicio)
    .lt("fim_real", i.fim)
    .order("fim_real", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaOrdem[];
}

export async function consumoMensal(meses = 12): Promise<LinhaConsumo[]> {
  const c = await clienteServidor();
  const limite = new Date();
  limite.setUTCMonth(limite.getUTCMonth() - meses + 1, 1);
  const { data, error } = await c
    .from("rel_consumo_mensal")
    .select("*")
    .gte("mes", limite.toISOString().slice(0, 7))
    .order("mes", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaConsumo[];
}

/** Tudo que a tela de relatórios mostra para um período, já agregado. */
export async function relatorios(i: Intervalo) {
  const [itens, pedidos, ordens, consumo] = await Promise.all([
    itensVendidos(i),
    pedidosPagos(i),
    ordensConcluidas(i),
    consumoMensal(12),
  ]);
  return {
    porProduto: rentabilidadePorProduto(itens),
    porCanal: rentabilidadePorCanal(pedidos),
    pedidos,
    custoRealVsEstimado: custoRealVsEstimado(ordens),
    impressoras: desempenhoImpressoras(ordens),
    ordens,
    consumo: consumoPorMes(consumo),
    totais: { itens: itens.length, pedidos: pedidos.length, ordens: ordens.length },
  };
}
