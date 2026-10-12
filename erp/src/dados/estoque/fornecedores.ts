import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Fornecedor = Database["public"]["Tables"]["fornecedores"]["Row"];

export async function listarFornecedores(incluirInativos = true): Promise<Fornecedor[]> {
  const supabase = await clienteServidor();
  let q = supabase.from("fornecedores").select("*").order("nome");
  if (!incluirInativos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function obterFornecedor(id: string): Promise<Fornecedor | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
