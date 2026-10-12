import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export const ESCOPOS = ["produto", "insumo", "financeiro", "conhecimento", "planejamento"] as const;
export type Escopo = (typeof ESCOPOS)[number];
export const ESCOPO_ROTULO: Record<Escopo, string> = {
  produto: "Produtos",
  insumo: "Insumos",
  financeiro: "Financeiro",
  conhecimento: "Conhecimento",
  planejamento: "Planejamento",
};

export async function listarCategorias(escopo: Escopo): Promise<Categoria[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("escopo", escopo)
    .order("ordem")
    .order("nome");
  if (error) throw error;
  return data;
}
