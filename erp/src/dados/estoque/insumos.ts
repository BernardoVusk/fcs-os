import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";

export type Insumo = Database["public"]["Tables"]["insumos"]["Row"];
export type EstoqueAtual = Database["public"]["Views"]["estoque_atual"]["Row"];
export type Lote = Database["public"]["Tables"]["lotes_insumo"]["Row"];
export type Unidade = Database["public"]["Tables"]["unidades"]["Row"];

export type FiltrosEstoque = {
  tipo?: string;
  situacao?: "ativos" | "inativos" | "todos";
  abaixoMinimo?: boolean;
  termo?: string;
};

export async function listarEstoqueCom(
  cliente: ClienteBanco,
  f: FiltrosEstoque = {},
): Promise<EstoqueAtual[]> {
  let q = cliente.from("estoque_atual").select("*").order("nome");
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.situacao === "inativos") q = q.eq("ativo", false);
  else if (f.situacao !== "todos") q = q.eq("ativo", true);
  if (f.abaixoMinimo) q = q.eq("abaixo_minimo", true);
  if (f.termo?.trim()) q = q.ilike("nome", `%${f.termo.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listarEstoque(f: FiltrosEstoque = {}): Promise<EstoqueAtual[]> {
  return listarEstoqueCom(await clienteServidor(), f);
}

export async function obterInsumo(id: string): Promise<Insumo | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("insumos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterEstoqueDoInsumoCom(
  cliente: ClienteBanco,
  id: string,
): Promise<EstoqueAtual | null> {
  const { data, error } = await cliente
    .from("estoque_atual")
    .select("*")
    .eq("insumo_id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterEstoqueDoInsumo(id: string): Promise<EstoqueAtual | null> {
  return obterEstoqueDoInsumoCom(await clienteServidor(), id);
}

export async function listarLotesCom(
  cliente: ClienteBanco,
  insumoId: string,
  somenteComSaldo = false,
): Promise<Lote[]> {
  let q = cliente.from("lotes_insumo").select("*").eq("insumo_id", insumoId).order("aberto_em");
  if (somenteComSaldo) q = q.gt("quantidade_atual", 0);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listarLotes(insumoId: string, somenteComSaldo = false): Promise<Lote[]> {
  return listarLotesCom(await clienteServidor(), insumoId, somenteComSaldo);
}

export type InsumoResumo = Pick<Insumo, "id" | "nome" | "tipo" | "unidade_base" | "atributos">;

/** Lista curta para selects (compra, movimentação). */
export async function listarInsumosAtivos(): Promise<InsumoResumo[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("insumos")
    .select("id, nome, tipo, unidade_base, atributos")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  return data;
}

export async function listarUnidades(): Promise<Unidade[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("unidades").select("*").order("codigo");
  if (error) throw error;
  return data;
}

export async function categoriasDeInsumo(): Promise<{ id: string; nome: string }[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("escopo", "insumo")
    .eq("ativo", true)
    .order("ordem")
    .order("nome");
  if (error) throw error;
  return data;
}

export async function contarAbaixoMinimo(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("estoque_atual")
    .select("insumo_id", { count: "exact", head: true })
    .eq("ativo", true)
    .eq("abaixo_minimo", true);
  return count ?? 0;
}

/** Gramas de filamento consumidas (consumo de produção e saída) no intervalo. null quando não há filamento cadastrado. */
export async function consumoFilamentoNoPeriodo(
  inicio: string,
  fim: string,
): Promise<number | null> {
  const supabase = await clienteServidor();
  const { data: filamentos } = await supabase
    .from("insumos")
    .select("id")
    .eq("tipo", "filamento")
    .limit(1);
  if (!filamentos || filamentos.length === 0) return null;
  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .select("quantidade, insumos!inner(tipo)")
    .in("tipo", ["consumo_producao", "saida"])
    .eq("insumos.tipo", "filamento")
    .gte("em", inicio)
    .lt("em", fim);
  if (error) throw error;
  return data.reduce((acc, m) => acc + Math.abs(Number(m.quantidade)), 0);
}
