import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Automacao = {
  id: string;
  nome: string;
  grupo_origem_id: string;
  numero_id: string | null;
  plataformas: string[];
  filtros: { incluir?: string[]; excluir?: string[]; dominiosBloqueados?: string[] };
  limpeza: {
    removerMencoes?: boolean;
    removerConvites?: boolean;
    removerLinksNaoAutorizados?: boolean;
    frasesRemover?: string[];
  };
  revisao_manual: boolean;
  janela_duplicidade_horas: number;
  intervalo_segundos: number;
  status: "rascunho" | "ativa" | "pausada" | "encerrada" | "erro";
  ultimo_erro: string | null;
  criado_em: string;
  origem: { nome: string; jid: string | null } | null;
  numero: { rotulo: string } | null;
};

const COLUNAS =
  "id, nome, grupo_origem_id, numero_id, plataformas, filtros, limpeza, revisao_manual, janela_duplicidade_horas, intervalo_segundos, status, ultimo_erro, criado_em, origem:ofe_grupos!ofe_automacoes_grupo_origem_id_fkey(nome, jid), numero:ofe_numeros(rotulo)";

export async function listarAutomacoes(status?: string): Promise<Automacao[]> {
  const supabase = await clienteServidor();
  let q = supabase.from("ofe_automacoes").select(COLUNAS).order("criado_em", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as unknown as Automacao[];
}

export async function obterAutomacao(id: string): Promise<Automacao | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("ofe_automacoes").select(COLUNAS).eq("id", id).maybeSingle();
  return (data as unknown as Automacao | null) ?? null;
}

export async function destinosDaAutomacao(id: string): Promise<string[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_automacoes_destinos")
    .select("grupo_id")
    .eq("automacao_id", id);
  return (data ?? []).map((d) => d.grupo_id);
}

export type MensagemOrigem = {
  id: string;
  recebida_em: string;
  texto: string | null;
  texto_processado: string | null;
  plataforma: string | null;
  link_original: string | null;
  status: string;
  motivo: string | null;
  removidos: string[];
  publicacao_id: string | null;
};

export async function mensagensDaAutomacao(
  id: string,
  status?: string[],
  limite = 50,
): Promise<MensagemOrigem[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_mensagens_origem")
    .select(
      "id, recebida_em, texto, texto_processado, plataforma, link_original, status, motivo, removidos, publicacao_id",
    )
    .eq("automacao_id", id)
    .order("recebida_em", { ascending: false })
    .limit(limite);
  if (status?.length) q = q.in("status", status);
  const { data } = await q;
  return (data ?? []) as MensagemOrigem[];
}

export async function contagemPorStatus(id: string): Promise<Record<string, number>> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_mensagens_origem")
    .select("status")
    .eq("automacao_id", id)
    .gte("recebida_em", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(5000);
  const r: Record<string, number> = {};
  for (const m of data ?? []) r[m.status] = (r[m.status] ?? 0) + 1;
  return r;
}
