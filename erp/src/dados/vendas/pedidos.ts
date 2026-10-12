import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";
import { obterParametrosVigentesCom } from "@/dados/custos/parametros";
import { resumirPedido, type ResumoPedido } from "@/dominio/vendas/resumo-pedido";

export type StatusPedidoRow = Database["public"]["Tables"]["pedidos_status"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
export type PedidoItem = Database["public"]["Tables"]["pedidos_itens"]["Row"];
export type PedidoEvento = Database["public"]["Tables"]["pedidos_eventos"]["Row"];
export type Importacao = Database["public"]["Tables"]["importacoes"]["Row"];

export type PedidoLista = Pedido & {
  status: Pick<StatusPedidoRow, "codigo" | "nome" | "cor" | "fechado"> | null;
  canal: { nome: string; tipo: string } | null;
  cliente: { nome: string } | null;
  itens: Pick<PedidoItem, "quantidade">[];
};
export type PedidoItemDetalhe = PedidoItem & {
  produto: { nome: string; sku: string | null } | null;
  variacao: { nome: string } | null;
};
export type PedidoEventoDetalhe = PedidoEvento & {
  de: { nome: string } | null;
  para: { nome: string } | null;
};
export type PedidoDetalhe = Pedido & {
  status: StatusPedidoRow | null;
  canal: { id: string; nome: string; tipo: string } | null;
  cliente: Cliente | null;
  itens: PedidoItemDetalhe[];
  eventos: PedidoEventoDetalhe[];
};

const COLUNAS_LISTA =
  "*, status:pedidos_status(codigo, nome, cor, fechado), canal:canais_venda(nome, tipo), cliente:clientes(nome), itens:pedidos_itens(quantidade)";

export async function listarStatusCom(cliente: ClienteBanco): Promise<StatusPedidoRow[]> {
  const { data, error } = await cliente.from("pedidos_status").select("*").order("ordem");
  if (error) throw error;
  return data;
}
export async function listarStatus(): Promise<StatusPedidoRow[]> {
  return listarStatusCom(await clienteServidor());
}

export type FiltrosPedido = {
  statusCodigo?: string;
  canalId?: string;
  abertos?: boolean;
  limite?: number;
};

export async function listarPedidos(f: FiltrosPedido = {}): Promise<PedidoLista[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("pedidos")
    .select(COLUNAS_LISTA)
    .order("data_pedido", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(Math.min(f.limite ?? 300, 1000));
  if (f.canalId) q = q.eq("canal_id", f.canalId);
  const { data, error } = await q;
  if (error) throw error;
  let lista = data as PedidoLista[];
  if (f.statusCodigo) lista = lista.filter((p) => p.status?.codigo === f.statusCodigo);
  if (f.abertos) lista = lista.filter((p) => !p.status?.fechado);
  return lista;
}

export async function obterPedidoCom(
  cliente: ClienteBanco,
  id: string,
): Promise<PedidoDetalhe | null> {
  const { data, error } = await cliente
    .from("pedidos")
    .select("*, status:pedidos_status(*), canal:canais_venda(id, nome, tipo), cliente:clientes(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [itens, eventos] = await Promise.all([
    cliente
      .from("pedidos_itens")
      .select("*, produto:produtos(nome, sku), variacao:produtos_variacoes(nome)")
      .eq("pedido_id", id)
      .order("ordem"),
    cliente
      .from("pedidos_eventos")
      .select(
        "*, de:pedidos_status!pedidos_eventos_de_status_id_fkey(nome), para:pedidos_status!pedidos_eventos_para_status_id_fkey(nome)",
      )
      .eq("pedido_id", id)
      .order("em"),
  ]);
  if (itens.error) throw itens.error;
  if (eventos.error) throw eventos.error;
  return {
    ...(data as unknown as PedidoDetalhe),
    itens: (itens.data ?? []) as PedidoItemDetalhe[],
    eventos: (eventos.data ?? []) as PedidoEventoDetalhe[],
  };
}

export async function obterPedido(id: string): Promise<PedidoDetalhe | null> {
  return obterPedidoCom(await clienteServidor(), id);
}

/** Recalcula o resumo financeiro do pedido com os itens atuais e grava o cache. */
export async function atualizarResumoCom(
  cliente: ClienteBanco,
  pedidoId: string,
): Promise<ResumoPedido | null> {
  const [{ data: p }, { data: itens }, parametros] = await Promise.all([
    cliente.from("pedidos").select("*").eq("id", pedidoId).maybeSingle(),
    cliente
      .from("pedidos_itens")
      .select(
        "quantidade, preco_unitario, desconto, custo_unitario_estimado, custo_unitario_realizado",
      )
      .eq("pedido_id", pedidoId),
    obterParametrosVigentesCom(cliente),
  ]);
  if (!p) return null;
  const resumo = resumirPedido({
    itens: (itens ?? []).map((i) => ({
      quantidade: i.quantidade,
      preco_unitario: Number(i.preco_unitario),
      desconto: Number(i.desconto),
      custo_unitario_estimado:
        i.custo_unitario_estimado == null ? null : Number(i.custo_unitario_estimado),
      custo_unitario_realizado:
        i.custo_unitario_realizado == null ? null : Number(i.custo_unitario_realizado),
    })),
    descontos_vendedor: Number(p.descontos_vendedor),
    frete_cobrado: Number(p.frete_cobrado),
    frete_pago: Number(p.frete_pago),
    taxas: {
      comissao_pct: Number(p.comissao_pct ?? 0),
      taxa_pagamento_pct: Number(p.taxa_pagamento_pct ?? 0),
      taxa_fixa_item: Number(p.taxa_fixa_item ?? 0),
      imposto_pct: parametros?.dados.imposto_pct_estimado ?? null,
    },
    taxas_informadas:
      p.taxas_canal_informadas != null || p.taxas_pagamento_informadas != null
        ? {
            taxas_canal: p.taxas_canal_informadas == null ? null : Number(p.taxas_canal_informadas),
            taxas_pagamento:
              p.taxas_pagamento_informadas == null ? null : Number(p.taxas_pagamento_informadas),
          }
        : null,
  });
  const { error } = await cliente
    .from("pedidos")
    .update({ resumo: JSON.parse(JSON.stringify(resumo)) })
    .eq("id", pedidoId);
  if (error) throw error;
  return resumo;
}

export function lerResumo(p: Pick<Pedido, "resumo">): ResumoPedido | null {
  return (p.resumo as unknown as ResumoPedido | null) ?? null;
}

export async function contarPedidosAbertos(): Promise<number> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("pedidos").select("id, status:pedidos_status(fechado)");
  return (data ?? []).filter((p) => !(p.status as { fechado: boolean } | null)?.fechado).length;
}

/** Soma da base de vendas dos pedidos pagos no intervalo [inicio, fim). Null quando não há pedido nenhum. */
export async function faturamentoNoPeriodo(
  inicio: string,
  fim: string,
): Promise<{ total: number; pedidos: number } | null> {
  const supabase = await clienteServidor();
  const { count } = await supabase.from("pedidos").select("id", { count: "exact", head: true });
  if (!count) return null;
  const { data } = await supabase
    .from("pedidos")
    .select("resumo")
    .gte("data_pagamento", inicio.slice(0, 10))
    .lt("data_pagamento", fim.slice(0, 10))
    .eq("status_pagamento", "pago");
  const lista = data ?? [];
  return {
    total: lista.reduce(
      (acc, p) => acc + Number((p.resumo as { base_vendas?: number } | null)?.base_vendas ?? 0),
      0,
    ),
    pedidos: lista.length,
  };
}

export async function listarClientes(): Promise<Cliente[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("clientes").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function listarImportacoes(
  tipo = "pedidos",
): Promise<(Importacao & { canal: { nome: string } | null })[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("importacoes")
    .select("*, canal:canais_venda(nome)")
    .eq("tipo", tipo)
    .order("em", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as (Importacao & { canal: { nome: string } | null })[];
}
