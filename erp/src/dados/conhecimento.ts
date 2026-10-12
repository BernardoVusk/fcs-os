import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "./conhecimento-escrita";

export type Conhecimento = Database["public"]["Tables"]["conhecimentos"]["Row"];
export type VersaoConhecimento = Database["public"]["Tables"]["conhecimentos_versoes"]["Row"];
export type AnexoConhecimento = Database["public"]["Tables"]["conhecimentos_anexos"]["Row"];
export type ResumoConhecimento = Pick<
  Conhecimento,
  "id" | "slug" | "titulo" | "resumo" | "tipo" | "tags" | "categoria_id" | "validado" | "status" | "atualizado_em" | "confidencialidade" | "modulo"
>;
export type FiltrosConhecimento = {
  termo?: string;
  tipo?: string;
  categoriaId?: string;
  tag?: string;
  status?: string;
  modulo?: string;
  limite?: number;
};

const COLUNAS_RESUMO =
  "id, slug, titulo, resumo, tipo, tags, categoria_id, validado, status, atualizado_em, confidencialidade, modulo";

export async function listarConhecimentosCom(cliente: ClienteBanco, f: FiltrosConhecimento): Promise<ResumoConhecimento[]> {
  const { data, error } = await cliente
    .rpc("listar_conhecimentos", {
      p_termo: f.termo?.trim() || undefined,
      p_tipo: f.tipo || undefined,
      p_categoria: f.categoriaId || undefined,
      p_tag: f.tag || undefined,
      p_status: f.status || undefined,
      p_modulo: f.modulo || undefined,
      p_limite: Math.min(f.limite ?? 50, 100),
    })
    .select(COLUNAS_RESUMO);
  if (error) throw error;
  return data as ResumoConhecimento[];
}

export async function listarConhecimentos(f: FiltrosConhecimento): Promise<ResumoConhecimento[]> {
  return listarConhecimentosCom(await clienteServidor(), f);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function obterConhecimentoCom(cliente: ClienteBanco, idOuSlug: string): Promise<Conhecimento | null> {
  const { data, error } = await cliente
    .from("conhecimentos")
    .select("*")
    .eq(UUID.test(idOuSlug) ? "id" : "slug", idOuSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterConhecimento(idOuSlug: string): Promise<Conhecimento | null> {
  return obterConhecimentoCom(await clienteServidor(), idOuSlug);
}

export async function listarVersoes(id: string): Promise<VersaoConhecimento[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("conhecimentos_versoes")
    .select("*")
    .eq("conhecimento_id", id)
    .order("versao", { ascending: false });
  if (error) throw error;
  return data;
}

export type Relacao = {
  de_id: string;
  para_id: string;
  tipo: string;
  direcao: "saida" | "entrada";
  outro: { id: string; titulo: string; tipo: string };
};

export async function listarRelacoes(id: string): Promise<Relacao[]> {
  const supabase = await clienteServidor();
  const [saida, entrada] = await Promise.all([
    supabase
      .from("conhecimentos_relacoes")
      .select("de_id, para_id, tipo, outro:conhecimentos!conhecimentos_relacoes_para_id_fkey(id, titulo, tipo)")
      .eq("de_id", id),
    supabase
      .from("conhecimentos_relacoes")
      .select("de_id, para_id, tipo, outro:conhecimentos!conhecimentos_relacoes_de_id_fkey(id, titulo, tipo)")
      .eq("para_id", id),
  ]);
  if (saida.error) throw saida.error;
  if (entrada.error) throw entrada.error;
  const mapear = (lista: typeof saida.data, direcao: "saida" | "entrada"): Relacao[] =>
    (lista ?? [])
      .filter((r) => r.outro)
      .map((r) => ({ de_id: r.de_id, para_id: r.para_id, tipo: r.tipo, direcao, outro: r.outro as Relacao["outro"] }));
  return [...mapear(saida.data, "saida"), ...mapear(entrada.data, "entrada")];
}

export type Decisao = Pick<Conhecimento, "id" | "slug" | "titulo" | "resumo" | "modulo" | "estrutura" | "atualizado_em" | "validado">;

export async function listarDecisoesCom(cliente: ClienteBanco, modulo?: string, desde?: string): Promise<Decisao[]> {
  let q = cliente
    .from("conhecimentos")
    .select("id, slug, titulo, resumo, modulo, estrutura, atualizado_em, validado")
    .eq("tipo", "decisao")
    .eq("status", "ativo")
    .order("atualizado_em", { ascending: false })
    .limit(100);
  if (modulo) q = q.eq("modulo", modulo);
  if (desde) q = q.gte("atualizado_em", desde);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function listarDecisoes(modulo?: string): Promise<Decisao[]> {
  return listarDecisoesCom(await clienteServidor(), modulo);
}

export async function contarConhecimentosAtivos(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase.from("conhecimentos").select("id", { count: "exact", head: true }).eq("status", "ativo");
  return count ?? 0;
}

export async function listarAnexos(id: string): Promise<AnexoConhecimento[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("conhecimentos_anexos").select("*").eq("conhecimento_id", id).order("criado_em");
  if (error) throw error;
  return data;
}

export async function categoriasDeConhecimento(): Promise<{ id: string; nome: string }[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("escopo", "conhecimento")
    .eq("ativo", true)
    .order("ordem")
    .order("nome");
  if (error) throw error;
  return data;
}

export async function modulosExistentes(): Promise<string[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("conhecimentos").select("modulo").not("modulo", "is", null).limit(500);
  return [...new Set((data ?? []).map((r) => r.modulo!).filter(Boolean))].sort();
}
