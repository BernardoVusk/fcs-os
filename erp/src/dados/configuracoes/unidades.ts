import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Unidade = Database["public"]["Tables"]["unidades"]["Row"];

export async function listarUnidades(): Promise<Unidade[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("unidades").select("*").order("codigo");
  if (error) throw error;
  return data;
}
