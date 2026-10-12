import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Impressora = Database["public"]["Tables"]["impressoras"]["Row"];

export async function listarImpressoras(incluirInativas = true): Promise<Impressora[]> {
  const supabase = await clienteServidor();
  let q = supabase.from("impressoras").select("*").order("nome");
  if (!incluirInativas) q = q.neq("status", "inativa");
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function obterImpressora(id: string): Promise<Impressora | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("impressoras").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
