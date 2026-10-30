import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type FonteItem = { url: string; licenca: string | null };

/**
 * Link do modelo no MakerWorld e licença de cada peça de uma categoria, para o selo que só quem
 * está logado no ERP vê no /portfolio. Lê com a sessão: sem login, a RLS de catalogo_itens
 * (só authenticated ativo) devolve vazio, então o link nunca vai no HTML do visitante.
 */
export async function fontesDaCategoria(slug: string): Promise<Record<string, FonteItem>> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("catalogo_itens")
    .select("id, fonte_url, licenca, catalogo_categorias!inner(slug)")
    .eq("catalogo_categorias.slug", slug)
    .eq("ativo", true)
    .not("fonte_url", "is", null);
  if (error) return {};
  return Object.fromEntries(
    data
      // Só link do próprio MakerWorld vira href (nada de javascript: ou outro host vindo do banco).
      .filter((i) => i.fonte_url!.startsWith("https://makerworld.com/"))
      .map((i) => [i.id, { url: i.fonte_url!, licenca: i.licenca }] as const),
  );
}
