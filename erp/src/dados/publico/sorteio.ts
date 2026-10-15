import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * Exceção documentada em docs/arquitetura.md: a página pública /sorteio não tem sessão, então a
 * lista de produtos sai pela service role, limitada a id e nome dos produtos ativos. Nada mais
 * entra nesta pasta sem decisão registrada.
 */
export type ProdutoSorteio = { id: string; nome: string };

export async function listarProdutosSorteio(): Promise<ProdutoSorteio[]> {
  const { data, error } = await clienteAdmin("web")
    .from("produtos")
    .select("id, nome")
    .eq("status", "ativo")
    .order("nome");
  if (error) return [];
  return data;
}
