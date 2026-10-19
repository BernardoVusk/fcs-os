import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { StatusEnvio } from "@/dominio/ofertas/status";

export type Fila = {
  id: string;
  nome: string;
  numero_id: string | null;
  modelo_id: string | null;
  intervalo_segundos: number;
  janela_inicio: string;
  janela_fim: string;
  inicio_em: string | null;
  reinicio_diario: boolean;
  manual_expira_horas: number;
  rodada: number;
  status: "rascunho" | "ativa" | "pausada" | "encerrada";
  criado_em: string;
  numero: { rotulo: string } | null;
};

const COLUNAS =
  "id, nome, numero_id, modelo_id, intervalo_segundos, janela_inicio, janela_fim, inicio_em, reinicio_diario, manual_expira_horas, rodada, status, criado_em, numero:ofe_numeros(rotulo)";

export async function listarFilas(
  status?: string,
): Promise<(Fila & { itens: number; destinos: number })[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_filas")
    .select(`${COLUNAS}, itens:ofe_filas_itens(count), destinos:ofe_filas_destinos(count)`)
    .order("criado_em", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (
    (data ?? []) as unknown as (Fila & {
      itens: { count: number }[];
      destinos: { count: number }[];
    })[]
  ).map((f) => ({
    ...f,
    itens: f.itens?.[0]?.count ?? 0,
    destinos: f.destinos?.[0]?.count ?? 0,
  }));
}

export async function obterFila(id: string): Promise<Fila | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("ofe_filas").select(COLUNAS).eq("id", id).maybeSingle();
  return (data as unknown as Fila | null) ?? null;
}

export async function destinosDaFila(id: string): Promise<string[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("ofe_filas_destinos").select("grupo_id").eq("fila_id", id);
  return (data ?? []).map((d) => d.grupo_id);
}

export type ItemFila = {
  id: string;
  posicao: number;
  ativo: boolean;
  texto_editado: string | null;
  oferta: {
    id: string;
    titulo: string | null;
    plataforma: string;
    preco_atual: number | null;
    link_colado: string | null;
    status: string;
    dados_atualizados_em: string | null;
    url_original: string;
  } | null;
  cupom: {
    id: string;
    codigo: string | null;
    plataforma: string;
    fim_em: string | null;
    status: string;
  } | null;
  ultima: { status: string; rodada: number | null; enviados: number; total: number } | null;
};

export async function itensDaFila(id: string, rodada: number): Promise<ItemFila[]> {
  const supabase = await clienteServidor();
  const [{ data: itens }, { data: pubs }] = await Promise.all([
    supabase
      .from("ofe_filas_itens")
      .select(
        "id, posicao, ativo, texto_editado, oferta:ofe_ofertas(id, titulo, plataforma, preco_atual, link_colado, status, dados_atualizados_em, url_original), cupom:ofe_cupons(id, codigo, plataforma, fim_em, status)",
      )
      .eq("fila_id", id)
      .order("posicao")
      .order("criado_em"),
    supabase
      .from("ofe_publicacoes")
      .select("id, fila_item_id, rodada")
      .eq("fila_id", id)
      .eq("rodada", Math.max(rodada, 1)),
  ]);
  const ids = (pubs ?? []).map((p) => p.id);
  const { data: st } = ids.length
    ? await supabase
        .from("ofe_publicacoes_status")
        .select("id, status, enviados, total")
        .in("id", ids)
    : { data: [] };
  const porPub = new Map((st ?? []).map((s) => [s.id, s]));
  const porItem = new Map(
    (pubs ?? []).map((p) => [p.fila_item_id, { ...porPub.get(p.id), rodada: p.rodada }]),
  );
  return ((itens ?? []) as unknown as Omit<ItemFila, "ultima">[]).map((i) => {
    const u = porItem.get(i.id);
    return {
      ...i,
      ultima: u?.status
        ? {
            status: u.status,
            rodada: u.rodada ?? null,
            enviados: u.enviados ?? 0,
            total: u.total ?? 0,
          }
        : null,
    };
  });
}

export type EnvioProblema = {
  id: string;
  status: StatusEnvio;
  motivo: string | null;
  erro_detalhe: string | null;
  tentativas: number;
  atualizado_em: string;
  grupo: { nome: string } | null;
  publicacao: {
    oferta: { titulo: string | null } | null;
    cupom: { codigo: string | null } | null;
  } | null;
};

export async function problemasDaFila(id: string | null): Promise<EnvioProblema[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_envios")
    .select(
      "id, status, motivo, erro_detalhe, tentativas, atualizado_em, grupo:ofe_grupos(nome), publicacao:ofe_publicacoes!inner(fila_id, oferta:ofe_ofertas(titulo), cupom:ofe_cupons(codigo))",
    )
    .in("status", ["falhou", "incerto"])
    .order("atualizado_em", { ascending: false })
    .limit(200);
  q = id ? q.eq("publicacao.fila_id", id) : q.is("publicacao.fila_id", null);
  const { data } = await q;
  return (data ?? []) as unknown as EnvioProblema[];
}

export async function contarProblemas(id: string): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("ofe_envios")
    .select("id, publicacao:ofe_publicacoes!inner(fila_id)", { count: "exact", head: true })
    .in("status", ["falhou", "incerto"])
    .eq("publicacao.fila_id", id);
  return count ?? 0;
}

/** Envios manuais ainda sem texto (de filas), para o ERP preparar ao abrir Publicar. */
export async function manuaisParaPreparar(limite = 20): Promise<string[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_envios")
    .select("id")
    .eq("modo", "manual")
    .eq("status", "aguardando")
    .is("preparado_em", null)
    .is("texto_final", null)
    .lte("agendado_para", new Date(Date.now() + 3600_000).toISOString())
    .order("agendado_para")
    .limit(limite);
  return (data ?? []).map((d) => d.id);
}

/** Contexto de preparação de um envio manual, lido pela sessão (mesma forma usada pelo worker). */
export async function contextoEnvioManual(envioId: string) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_envios")
    .select(
      "id, grupo_id, grupo:ofe_grupos(id, nome, campanha, tag_amazon), publicacao:ofe_publicacoes(texto_editado, oferta_id, fila:ofe_filas(modelo_id), oferta:ofe_ofertas(*), cupom:ofe_cupons(*))",
    )
    .eq("id", envioId)
    .maybeSingle();
  if (!data) return null;
  const pub = data.publicacao as unknown as {
    texto_editado: string | null;
    oferta_id: string | null;
    fila: { modelo_id: string | null } | null;
    oferta: Record<string, unknown> | null;
    cupom: Record<string, unknown> | null;
  } | null;
  const { data: link } = pub?.oferta_id
    ? await supabase
        .from("ofe_links")
        .select("url, origem")
        .eq("oferta_id", pub.oferta_id)
        .eq("grupo_id", data.grupo_id)
        .maybeSingle()
    : { data: null };
  return {
    envioId: data.id,
    grupo: data.grupo as unknown as {
      id: string;
      nome: string;
      campanha: string | null;
      tag_amazon: string | null;
    },
    publicacao: pub,
    link: (link as { url: string; origem: "api" | "tag" | "colado" } | null) ?? null,
  };
}
