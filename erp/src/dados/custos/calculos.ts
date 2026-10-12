import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { EntradasCalculo, ResultadoCalculo } from "@/dominio/custos/motor";

export type CalculoCusto = Database["public"]["Tables"]["calculos_custo"]["Row"];
export type CalculoLista = CalculoCusto & {
  insumo: { nome: string; unidade_base: string } | null;
  canal: { nome: string } | null;
  impressora: { nome: string } | null;
};

const COLUNAS =
  "*, insumo:insumos(nome, unidade_base), canal:canais_venda(nome), impressora:impressoras(nome)";

export async function listarCalculos(limite = 100): Promise<CalculoLista[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("calculos_custo")
    .select(COLUNAS)
    .order("criado_em", { ascending: false })
    .limit(Math.min(limite, 300));
  if (error) throw error;
  return data as CalculoLista[];
}

export async function obterCalculo(id: string): Promise<CalculoLista | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("calculos_custo")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CalculoLista | null;
}

export async function contarCalculos(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("calculos_custo")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Snapshot tipado (o banco guarda jsonb). */
export function lerSnapshot(c: CalculoCusto): {
  entradas: EntradasCalculo;
  resultado: ResultadoCalculo;
} {
  return {
    entradas: c.entradas as unknown as EntradasCalculo,
    resultado: c.resultado as unknown as ResultadoCalculo,
  };
}
