import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Compra = Database["public"]["Tables"]["compras"]["Row"];
export type CompraItem = Database["public"]["Tables"]["compras_itens"]["Row"];

export type CompraLista = Compra & {
  fornecedor: { nome: string } | null;
  itens: { quantidade: number; preco_unitario: number; desconto_item: number }[];
};

export type CompraItemDetalhe = CompraItem & {
  insumo: { id: string; nome: string; tipo: string; unidade_base: string };
};
export type CompraDetalhe = Compra & {
  fornecedor: { id: string; nome: string } | null;
  itens: CompraItemDetalhe[];
};

const COLUNAS_LISTA =
  "*, fornecedor:fornecedores(nome), itens:compras_itens(quantidade, preco_unitario, desconto_item)";
const COLUNAS_DETALHE =
  "*, fornecedor:fornecedores(id, nome), itens:compras_itens(*, insumo:insumos(id, nome, tipo, unidade_base))";

export async function listarCompras(status?: string): Promise<CompraLista[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("compras")
    .select(COLUNAS_LISTA)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data as CompraLista[];
}

export async function obterCompra(id: string): Promise<CompraDetalhe | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("compras")
    .select(COLUNAS_DETALHE)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const compra = data as CompraDetalhe;
  compra.itens.sort((a, b) => a.ordem - b.ordem);
  return compra;
}

/** Total das linhas (preço x quantidade menos desconto do item), sem frete e sem desconto do pedido. */
export function totalDasLinhas(
  itens: { quantidade: number; preco_unitario: number; desconto_item: number }[],
): number {
  return itens.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.preco_unitario) - Number(i.desconto_item),
    0,
  );
}
