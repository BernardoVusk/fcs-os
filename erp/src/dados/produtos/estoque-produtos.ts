import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type EstoqueProduto = Database["public"]["Views"]["estoque_produtos"]["Row"];
export type MovimentacaoProduto = Database["public"]["Tables"]["movimentacoes_produto"]["Row"];

export async function listarEstoqueProdutos(): Promise<EstoqueProduto[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("estoque_produtos").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function estoqueDoProduto(produtoId: string): Promise<EstoqueProduto[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("estoque_produtos")
    .select("*")
    .eq("produto_id", produtoId);
  if (error) throw error;
  return data;
}

export async function movimentacoesDoProduto(
  produtoId: string,
  limite = 50,
): Promise<MovimentacaoProduto[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("movimentacoes_produto")
    .select("*")
    .eq("produto_id", produtoId)
    .order("em", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

/** Soma das peças prontas de todos os produtos. */
export async function totalPecasProntas(): Promise<number> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("estoque_produtos").select("saldo");
  return (data ?? []).reduce((acc, r) => acc + Number(r.saldo ?? 0), 0);
}
