import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Movimentacao = Database["public"]["Tables"]["movimentacoes_estoque"]["Row"];
export type MovimentacaoLista = Movimentacao & {
  insumo: { nome: string; unidade_base: string } | null;
  lote: { codigo: string } | null;
  /** true quando já existe estorno apontando para esta movimentação. */
  estornada: boolean;
};

export type FiltrosMovimentacao = {
  insumoId?: string;
  tipo?: string;
  loteId?: string;
  limite?: number;
};

export async function listarMovimentacoes(
  f: FiltrosMovimentacao = {},
): Promise<MovimentacaoLista[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("movimentacoes_estoque")
    .select("*, insumo:insumos(nome, unidade_base), lote:lotes_insumo(codigo)")
    .order("em", { ascending: false })
    .limit(Math.min(f.limite ?? 200, 500));
  if (f.insumoId) q = q.eq("insumo_id", f.insumoId);
  if (f.loteId) q = q.eq("lote_id", f.loteId);
  if (f.tipo) q = q.eq("tipo", f.tipo);
  const { data, error } = await q;
  if (error) throw error;
  const ids = data.map((m) => m.id);
  const estornadas = new Set<string>();
  if (ids.length > 0) {
    const { data: estornos } = await supabase
      .from("movimentacoes_estoque")
      .select("origem_id")
      .eq("origem_tipo", "estorno")
      .in("origem_id", ids);
    for (const e of estornos ?? []) if (e.origem_id) estornadas.add(e.origem_id);
  }
  return data.map((m) => ({ ...m, estornada: estornadas.has(m.id) })) as MovimentacaoLista[];
}
