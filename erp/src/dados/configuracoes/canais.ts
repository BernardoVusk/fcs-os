import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type CanalVigente = Database["public"]["Views"]["canais_venda_vigentes"]["Row"];
export type Canal = Database["public"]["Tables"]["canais_venda"]["Row"];
export type TaxasCanal = Database["public"]["Tables"]["canais_venda_taxas"]["Row"];

export async function listarCanais(): Promise<CanalVigente[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("canais_venda_vigentes").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function obterCanal(id: string): Promise<Canal | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("canais_venda").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarTaxas(canalId: string): Promise<TaxasCanal[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("canais_venda_taxas")
    .select("*")
    .eq("canal_id", canalId)
    .order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data;
}
