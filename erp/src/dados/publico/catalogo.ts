import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Exceção documentada em docs/arquitetura.md: a página pública /portfolio não tem sessão, então a
 * leitura sai pela service role, limitada a nome e foto de categorias e itens ativos. Só leitura.
 */
export type CategoriaCatalogo = { slug: string; nome: string };
export type ResumoCategoria = CategoriaCatalogo & { total: number; capas: string[] };
export type ItemCatalogo = { id: string; nome: string; imagem: string };

/** URL pública da foto no bucket `catalogo` (webp já comprimido pelo importador). */
function urlImagem(caminho: string) {
  return `${env("SUPABASE_URL")}/storage/v1/object/public/catalogo/${caminho}`;
}

async function categoriasAtivas() {
  const { data, error } = await clienteAdmin("web")
    .from("catalogo_categorias")
    .select("id, slug, nome")
    .eq("ativa", true)
    .order("ordem")
    .order("nome");
  return error ? [] : data;
}

export async function listarCategoriasCatalogo(): Promise<CategoriaCatalogo[]> {
  return (await categoriasAtivas()).map(({ slug, nome }) => ({ slug, nome }));
}

/** Página inicial: cada categoria com a quantidade de peças e 4 fotos para o mosaico. */
export async function resumoCategoriasCatalogo(): Promise<ResumoCategoria[]> {
  const admin = clienteAdmin("web");
  const resumos = await Promise.all(
    (await categoriasAtivas()).map(async (c) => {
      const [contagem, capas] = await Promise.all([
        admin
          .from("catalogo_itens")
          .select("id", { count: "exact", head: true })
          .eq("categoria_id", c.id)
          .eq("ativo", true),
        admin
          .from("catalogo_itens")
          .select("imagem")
          .eq("categoria_id", c.id)
          .eq("ativo", true)
          .order("nome")
          .limit(4),
      ]);
      return {
        slug: c.slug,
        nome: c.nome,
        total: contagem.count ?? 0,
        capas: (capas.data ?? []).map((i) => urlImagem(i.imagem)),
      };
    }),
  );
  return resumos.filter((r) => r.total > 0);
}

/** Peças ativas de uma categoria, ou null se a categoria não existe ou está desligada. */
export async function listarItensCategoria(
  slug: string,
): Promise<{ categoria: CategoriaCatalogo; itens: ItemCatalogo[] } | null> {
  const admin = clienteAdmin("web");
  const { data: categoria } = await admin
    .from("catalogo_categorias")
    .select("id, slug, nome")
    .eq("slug", slug)
    .eq("ativa", true)
    .maybeSingle();
  if (!categoria) return null;
  const { data, error } = await admin
    .from("catalogo_itens")
    .select("id, nome, imagem")
    .eq("categoria_id", categoria.id)
    .eq("ativo", true)
    .order("nome");
  return {
    categoria: { slug: categoria.slug, nome: categoria.nome },
    itens: error ? [] : data.map((i) => ({ id: i.id, nome: i.nome, imagem: urlImagem(i.imagem) })),
  };
}
