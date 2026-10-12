import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Ordem = Database["public"]["Tables"]["ordens_producao"]["Row"];
export type OrdemConsumo = Database["public"]["Tables"]["ordens_consumo"]["Row"] & {
  insumo: { nome: string; unidade_base: string } | null;
  lote: { codigo: string } | null;
};
export type Manutencao = Database["public"]["Tables"]["manutencoes"]["Row"];
export type OrdemLista = Ordem & {
  produto: { nome: string; sku: string | null } | null;
  variacao: { nome: string } | null;
  impressora: { nome: string } | null;
  lote: { codigo: string } | null;
};

const COLUNAS =
  "*, produto:produtos(nome, sku), variacao:produtos_variacoes(nome), impressora:impressoras(nome), lote:lotes_insumo(codigo)";

export type FiltrosOrdem = {
  status?: string;
  impressoraId?: string;
  abertas?: boolean;
  limite?: number;
};

export async function listarOrdens(f: FiltrosOrdem = {}): Promise<OrdemLista[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ordens_producao")
    .select(COLUNAS)
    .order("prioridade", { ascending: false })
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: true })
    .limit(Math.min(f.limite ?? 300, 500));
  if (f.status) q = q.eq("status", f.status);
  if (f.impressoraId) q = q.eq("impressora_id", f.impressoraId);
  if (f.abertas) q = q.in("status", ["fila", "imprimindo", "acabamento"]);
  const { data, error } = await q;
  if (error) throw error;
  return data as OrdemLista[];
}

export async function obterOrdem(
  id: string,
): Promise<(OrdemLista & { consumos: OrdemConsumo[] }) | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("ordens_producao")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: consumos, error: e2 } = await supabase
    .from("ordens_consumo")
    .select("*, insumo:insumos(nome, unidade_base), lote:lotes_insumo(codigo)")
    .eq("ordem_id", id)
    .order("criado_em");
  if (e2) throw e2;
  return { ...(data as OrdemLista), consumos: (consumos ?? []) as OrdemConsumo[] };
}

export async function contarOrdensAbertas(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("ordens_producao")
    .select("id", { count: "exact", head: true })
    .in("status", ["fila", "imprimindo", "acabamento"]);
  return count ?? 0;
}

export async function listarManutencoes(impressoraId: string): Promise<Manutencao[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("manutencoes")
    .select("*")
    .eq("impressora_id", impressoraId)
    .order("data", { ascending: false });
  if (error) throw error;
  return data;
}
