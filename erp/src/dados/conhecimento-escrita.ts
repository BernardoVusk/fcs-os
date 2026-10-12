import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/tipos/banco";
import { gerarSlug } from "@/dominio/conhecimento/slug";
import type { Confidencialidade, TipoConhecimento } from "@/dominio/conhecimento/tipos";

/*
 * Escrita compartilhada entre a tela (cliente com a sessão do usuário, RLS vale)
 * e o servidor MCP (cliente de serviço com cabeçalhos x-origem e x-usuario-id).
 */

export type ClienteBanco = SupabaseClient<Database>;

export type DadosConhecimento = {
  titulo: string;
  resumo: string | null;
  conteudo: string;
  tipo: TipoConhecimento;
  categoria_id: string | null;
  tags: string[];
  modulo: string | null;
  projeto: string | null;
  referencia: string | null;
  confidencialidade: Confidencialidade;
  estrutura: Json | null;
  status: "rascunho" | "ativo";
};

export type DadosAtualizacao = Partial<Omit<DadosConhecimento, "status">> & { status?: "rascunho" | "ativo" | "arquivado" };

export type ResultadoEscrita = { ok: true; id: string; slug: string } | { ok: false; erro: string };

function traduzirErro(codigo: string | undefined): string {
  if (codigo === "42501") return "sem_permissao";
  if (codigo === "23505") return "duplicado";
  if (codigo === "PGRST116") return "nao_encontrado";
  return "erro_inesperado";
}

export async function criarConhecimento(
  cliente: ClienteBanco,
  dados: DadosConhecimento,
  origem: "manual" | "claude_code",
): Promise<ResultadoEscrita> {
  const base = gerarSlug(dados.titulo) || "registro";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const slug = tentativa === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await cliente
      .from("conhecimentos")
      .insert({ ...dados, slug, origem })
      .select("id, slug")
      .single();
    if (!error) return { ok: true, id: data.id, slug: data.slug };
    if (error.code !== "23505") return { ok: false, erro: traduzirErro(error.code) };
  }
  return { ok: false, erro: "duplicado" };
}

export async function atualizarConhecimento(
  cliente: ClienteBanco,
  id: string,
  dados: DadosAtualizacao,
  motivo: string | null,
): Promise<ResultadoEscrita> {
  const consulta = cliente.from("conhecimentos").update(dados).eq("id", id).select("id, slug").single();
  if (motivo) consulta.setHeader("x-motivo", motivo.slice(0, 300));
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: traduzirErro(error.code) };
  return { ok: true, id: data.id, slug: data.slug };
}
