import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";

export type Produto = Database["public"]["Tables"]["produtos"]["Row"];
export type Variacao = Database["public"]["Tables"]["produtos_variacoes"]["Row"];
export type Material = Database["public"]["Tables"]["produtos_materiais"]["Row"] & {
  insumo: { id: string; nome: string; unidade_base: string; tipo: string } | null;
};
export type PrecoCanal = Database["public"]["Tables"]["produtos_precos_canal"]["Row"] & {
  canal: { nome: string } | null;
};
export type PrecoVigente = Database["public"]["Views"]["produtos_precos_vigentes"]["Row"];
export type Anuncio = Database["public"]["Tables"]["produtos_anuncios"]["Row"] & {
  canal: { nome: string; tipo: string } | null;
};
export type Arquivo = Database["public"]["Tables"]["produtos_arquivos"]["Row"];

export type ProdutoLista = Produto & {
  precos: PrecoVigente[];
  categoria: { nome: string } | null;
  insumo: { nome: string } | null;
};

export type FiltrosProduto = { status?: string; termo?: string };

export async function listarProdutosCom(
  cliente: ClienteBanco,
  f: FiltrosProduto = {},
): Promise<ProdutoLista[]> {
  let q = cliente
    .from("produtos")
    .select("*, categoria:categorias(nome), insumo:insumos!produtos_insumo_impressao_id_fkey(nome)")
    .order("nome")
    .limit(500);
  if (f.status) q = q.eq("status", f.status);
  if (f.termo?.trim()) q = q.ilike("nome", `%${f.termo.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  const ids = data.map((p) => p.id);
  const precos = new Map<string, PrecoVigente[]>();
  if (ids.length > 0) {
    const { data: vigentes, error: e2 } = await cliente
      .from("produtos_precos_vigentes")
      .select("*")
      .in("produto_id", ids);
    if (e2) throw e2;
    for (const v of vigentes ?? []) {
      const lista = precos.get(v.produto_id!) ?? [];
      lista.push(v);
      precos.set(v.produto_id!, lista);
    }
  }
  return data.map((p) => ({ ...p, precos: precos.get(p.id) ?? [] })) as ProdutoLista[];
}

export async function listarProdutos(f: FiltrosProduto = {}): Promise<ProdutoLista[]> {
  return listarProdutosCom(await clienteServidor(), f);
}

export type ProdutoCompleto = {
  produto: Produto;
  variacoes: Variacao[];
  materiais: Material[];
  precos: PrecoCanal[];
  anuncios: Anuncio[];
  arquivos: Arquivo[];
};

export async function obterProdutoCom(
  cliente: ClienteBanco,
  id: string,
): Promise<ProdutoCompleto | null> {
  const { data: produto, error } = await cliente
    .from("produtos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!produto) return null;
  const [variacoes, materiais, precos, anuncios, arquivos] = await Promise.all([
    cliente.from("produtos_variacoes").select("*").eq("produto_id", id).order("nome"),
    cliente
      .from("produtos_materiais")
      .select("*, insumo:insumos(id, nome, unidade_base, tipo)")
      .eq("produto_id", id)
      .order("papel")
      .order("criado_em"),
    cliente
      .from("produtos_precos_canal")
      .select("*, canal:canais_venda(nome)")
      .eq("produto_id", id)
      .order("vigente_desde", { ascending: false }),
    cliente
      .from("produtos_anuncios")
      .select("*, canal:canais_venda(nome, tipo)")
      .eq("produto_id", id)
      .order("coletado_em", { ascending: false }),
    cliente
      .from("produtos_arquivos")
      .select("*")
      .eq("produto_id", id)
      .order("tipo")
      .order("versao", { ascending: false }),
  ]);
  for (const r of [variacoes, materiais, precos, anuncios, arquivos]) if (r.error) throw r.error;
  return {
    produto,
    variacoes: variacoes.data ?? [],
    materiais: (materiais.data ?? []) as Material[],
    precos: (precos.data ?? []) as PrecoCanal[],
    anuncios: (anuncios.data ?? []) as Anuncio[],
    arquivos: arquivos.data ?? [],
  };
}

export async function obterProduto(id: string): Promise<ProdutoCompleto | null> {
  return obterProdutoCom(await clienteServidor(), id);
}

export type ProdutoResumo = Pick<
  Produto,
  | "id"
  | "nome"
  | "sku"
  | "status"
  | "insumo_impressao_id"
  | "impressora_padrao_id"
  | "pecas_por_ciclo"
  | "tempo_impressao_min"
  | "peso_g"
  | "custo_variavel_atual"
  | "calculo_atual_id"
>;

/** Para selects (ordem de produção). */
export async function listarProdutosResumo(): Promise<
  (ProdutoResumo & {
    variacoes: Pick<
      Variacao,
      | "id"
      | "nome"
      | "insumo_impressao_id"
      | "tempo_impressao_min"
      | "pecas_por_ciclo"
      | "custo_variavel_atual"
      | "calculo_atual_id"
    >[];
  })[]
> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, nome, sku, status, insumo_impressao_id, impressora_padrao_id, pecas_por_ciclo, tempo_impressao_min, peso_g, custo_variavel_atual, calculo_atual_id, variacoes:produtos_variacoes(id, nome, insumo_impressao_id, tempo_impressao_min, pecas_por_ciclo, custo_variavel_atual, calculo_atual_id)",
    )
    .neq("status", "descontinuado")
    .order("nome");
  if (error) throw error;
  return data;
}

export async function contarProdutos(): Promise<{
  total: number;
  semCusto: number;
  desatualizados: number;
}> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("produtos")
    .select("custo_atual, custo_atualizado_em")
    .neq("status", "descontinuado");
  const lista = data ?? [];
  return {
    total: lista.length,
    semCusto: lista.filter((p) => p.custo_atual == null).length,
    desatualizados: lista.filter((p) => p.custo_atual != null && p.custo_atualizado_em == null)
      .length,
  };
}
