import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { lerPlataforma, type Plataforma } from "@/dominio/ofertas/plataformas";
import type { FuncaoGrupo } from "@/dominio/ofertas/status";

export type Grupo = {
  id: string;
  nome: string;
  funcao: FuncaoGrupo;
  cadastro: "manual" | "sincronizado";
  jid: string | null;
  link_convite: string | null;
  tag_amazon: string | null;
  campanha: string | null;
  autorizado_em: string | null;
  autorizacao_descricao: string | null;
  ativo: boolean;
  observacoes: string | null;
  criado_em: string;
};

const COLUNAS_GRUPO =
  "id, nome, funcao, cadastro, jid, link_convite, tag_amazon, campanha, autorizado_em, autorizacao_descricao, ativo, observacoes, criado_em";

export async function listarGrupos(
  filtro: { funcao?: string; ativos?: boolean } = {},
): Promise<Grupo[]> {
  const supabase = await clienteServidor();
  let q = supabase.from("ofe_grupos").select(COLUNAS_GRUPO).order("nome").limit(1000);
  if (filtro.funcao) q = q.eq("funcao", filtro.funcao);
  if (filtro.ativos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as Grupo[];
}

/** Grupos que podem receber publicação (destino e teste, ativos). */
export async function gruposDestino(): Promise<Grupo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos")
    .select(COLUNAS_GRUPO)
    .in("funcao", ["destino", "teste"])
    .eq("ativo", true)
    .order("nome");
  return (data ?? []) as Grupo[];
}

export async function obterGrupo(id: string): Promise<Grupo | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos")
    .select(COLUNAS_GRUPO)
    .eq("id", id)
    .maybeSingle();
  return (data as Grupo | null) ?? null;
}

export type Cupom = {
  id: string;
  plataforma: Plataforma;
  codigo: string | null;
  descricao: string;
  beneficio: string | null;
  regras: string | null;
  valor_minimo: number | null;
  inicio_em: string | null;
  fim_em: string | null;
  validade_confirmada: boolean;
  url_referencia: string | null;
  aplicabilidade: string | null;
  status: string;
  verificacao: string;
  fonte: string;
  verificado_em: string | null;
  atualizado_em: string;
};

const COLUNAS_CUPOM =
  "id, plataforma, codigo, descricao, beneficio, regras, valor_minimo, inicio_em, fim_em, validade_confirmada, url_referencia, aplicabilidade, status, verificacao, fonte, verificado_em, atualizado_em";

export async function listarCupons(incluirRemovidos = false): Promise<Cupom[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_cupons")
    .select(COLUNAS_CUPOM)
    .order("fim_em", { ascending: true, nullsFirst: false })
    .limit(1000);
  if (!incluirRemovidos) q = q.neq("status", "removido");
  const { data } = await q;
  return (data ?? [])
    .map((c) => ({ ...c, plataforma: lerPlataforma(c.plataforma) }))
    .filter((c): c is Cupom => !!c.plataforma);
}

export async function obterCupom(id: string): Promise<Cupom | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_cupons")
    .select(COLUNAS_CUPOM)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = lerPlataforma(data.plataforma);
  return p ? { ...data, plataforma: p } : null;
}

export type Modelo = {
  id: string;
  nome: string;
  tipo: "oferta" | "cupom";
  plataforma: Plataforma | null;
  corpo: string;
  padrao: boolean;
  ativo: boolean;
  atualizado_em: string;
};

export async function listarModelos(): Promise<Modelo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_modelos")
    .select("id, nome, tipo, plataforma, corpo, padrao, ativo, atualizado_em")
    .order("tipo")
    .order("nome");
  return (data ?? []).map((m) => ({
    ...m,
    tipo: m.tipo as Modelo["tipo"],
    plataforma: lerPlataforma(m.plataforma),
  }));
}

export async function plataformasLiberadas(): Promise<Plataforma[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_integracoes")
    .select("plataforma")
    .not("conformidade_em", "is", null);
  return (data ?? []).map((d) => lerPlataforma(d.plataforma)).filter((p): p is Plataforma => !!p);
}
