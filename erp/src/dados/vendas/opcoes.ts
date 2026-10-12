import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarCanais } from "@/dados/configuracoes/canais";
import { obterParametrosVigentes } from "@/dados/custos/parametros";
import type { CanalPedido, ProdutoPedido } from "@/componentes/vendas/FormPedido";

/** Tudo que o formulário de pedido precisa: canais com taxas vigentes, clientes, produtos com variações, preços vigentes e imposto. */
export async function opcoesDoPedido(): Promise<{
  canais: CanalPedido[];
  clientes: { id: string; nome: string }[];
  produtos: ProdutoPedido[];
  precos: Record<string, number>;
  impostoPct: number | null;
}> {
  const supabase = await clienteServidor();
  const [canais, clientes, produtos, precos, parametros] = await Promise.all([
    listarCanais(),
    supabase.from("clientes").select("id, nome").eq("anonimizado", false).order("nome"),
    supabase
      .from("produtos")
      .select("id, nome, sku, variacoes:produtos_variacoes(id, nome)")
      .neq("status", "descontinuado")
      .order("nome"),
    supabase
      .from("produtos_precos_vigentes")
      .select("produto_id, variacao_id, canal_id, preco_venda"),
    obterParametrosVigentes(),
  ]);
  return {
    canais: canais
      .filter((c) => c.ativo)
      .map((c) => ({
        id: c.id!,
        nome: c.nome!,
        taxas:
          c.comissao_pct == null || c.taxa_fixa_item == null
            ? null
            : {
                comissao_pct: c.comissao_pct,
                taxa_pagamento_pct: c.taxa_pagamento_pct ?? 0,
                taxa_fixa_item: c.taxa_fixa_item,
              },
      })),
    clientes: clientes.data ?? [],
    produtos: (produtos.data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      sku: p.sku,
      variacoes: p.variacoes ?? [],
    })),
    precos: Object.fromEntries(
      (precos.data ?? []).map((p) => [
        `${p.produto_id}:${p.variacao_id ?? ""}:${p.canal_id}`,
        Number(p.preco_venda),
      ]),
    ),
    impostoPct: parametros?.dados.imposto_pct_estimado ?? null,
  };
}
