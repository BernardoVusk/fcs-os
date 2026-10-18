import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EventoGrupo, Lacuna, Medicao } from "@/dominio/ofertas/evasao";

export type Numero = {
  id: string;
  rotulo: string;
  telefone: string | null;
  aceite_risco_em: string | null;
  aceite_risco_versao: string | null;
  limite_por_hora: number;
  limite_por_dia: number;
  intervalo_min_segundos: number;
  janela_inicio: string;
  janela_fim: string;
  ativo: boolean;
  estado: {
    status: string;
    nome_exibido: string | null;
    jid_proprio: string | null;
    ultima_atividade_em: string | null;
    ultima_sincronizacao_em: string | null;
    ultimo_erro: string | null;
    worker_id: string | null;
  } | null;
};

export async function listarNumeros(incluirRemovidos = false): Promise<Numero[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_numeros")
    .select(
      "id, rotulo, telefone, aceite_risco_em, aceite_risco_versao, limite_por_hora, limite_por_dia, intervalo_min_segundos, janela_inicio, janela_fim, ativo, estado:ofe_numeros_estado(status, nome_exibido, jid_proprio, ultima_atividade_em, ultima_sincronizacao_em, ultimo_erro, worker_id)",
    )
    .order("criado_em");
  if (!incluirRemovidos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as unknown as Numero[];
}

export async function workerOnline(): Promise<{ online: boolean; ultimo: string | null }> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_worker_estado")
    .select("ultimo_batimento_em")
    .order("ultimo_batimento_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ultimo = data?.ultimo_batimento_em ?? null;
  return { online: !!ultimo && Date.now() - Date.parse(ultimo) < 120_000, ultimo };
}

export async function eventosDosNumeros(ids: string[], limite = 10) {
  if (!ids.length) return [];
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_numeros_eventos")
    .select("numero_id, tipo, detalhe, ocorrido_em")
    .in("numero_id", ids)
    .order("ocorrido_em", { ascending: false })
    .limit(limite * ids.length);
  return data ?? [];
}

/** Estado para a tela acompanhar a conexão; QR e código só aparecem para o dono (RLS). */
export async function estadoConexao(id: string) {
  const supabase = await clienteServidor();
  const [{ data: e }, { data: qr }, { data: cmd }] = await Promise.all([
    supabase
      .from("ofe_numeros_estado")
      .select("status, nome_exibido, ultimo_erro, atualizado_em")
      .eq("numero_id", id)
      .maybeSingle(),
    supabase.from("ofe_qr").select("tipo, conteudo, expira_em").eq("numero_id", id).maybeSingle(),
    supabase
      .from("ofe_comandos")
      .select("tipo, status, resultado, criado_em")
      .eq("numero_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const qrValido = qr && Date.parse(qr.expira_em) > Date.now() ? qr : null;
  return { estado: e ?? null, qr: qrValido, comando: cmd ?? null };
}

export type DadosGrupo = {
  medicoes: Medicao[];
  eventos: EventoGrupo[];
  lacunas: Lacuna[];
  enviados: number;
  ultimoEnvio: string | null;
};

/** Medições, eventos e lacunas para as métricas do período (o cálculo fica no domínio). */
export async function dadosGrupo(
  grupoId: string,
  numeroColetor: string | null,
  inicio: string,
  fim: string,
): Promise<DadosGrupo> {
  const supabase = await clienteServidor();
  const [med, ev, lac, env, ult] = await Promise.all([
    supabase
      .from("ofe_grupos_medicoes")
      .select("medido_em, membros")
      .eq("grupo_id", grupoId)
      .lte("medido_em", fim)
      .order("medido_em", { ascending: false })
      .limit(2000),
    supabase
      .from("ofe_grupos_eventos")
      .select("ocorrido_em, tipo, quantidade")
      .eq("grupo_id", grupoId)
      .gte("ocorrido_em", inicio)
      .lt("ocorrido_em", fim)
      .limit(10000),
    numeroColetor
      ? supabase
          .from("ofe_coleta_lacunas")
          .select("inicio, fim")
          .eq("numero_id", numeroColetor)
          .lt("inicio", fim)
          .or(`fim.is.null,fim.gt.${inicio}`)
      : Promise.resolve({ data: [] as Lacuna[] }),
    supabase
      .from("ofe_envios")
      .select("id", { count: "exact", head: true })
      .eq("grupo_id", grupoId)
      .eq("status", "enviado")
      .gte("enviado_em", inicio)
      .lt("enviado_em", fim),
    supabase
      .from("ofe_envios")
      .select("enviado_em")
      .eq("grupo_id", grupoId)
      .eq("status", "enviado")
      .order("enviado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    medicoes: (med.data ?? []) as Medicao[],
    eventos: (ev.data ?? []) as EventoGrupo[],
    lacunas: (lac.data ?? []) as Lacuna[],
    enviados: env.count ?? 0,
    ultimoEnvio: ult.data?.enviado_em ?? null,
  };
}

export type GrupoResumo = {
  id: string;
  nome: string;
  funcao: string;
  cadastro: string;
  jid: string | null;
  ativo: boolean;
  numero_coletor_id: string | null;
  coleta_iniciada_em: string | null;
  so_admins: boolean | null;
  membros_atual: number | null;
  membros_medido_em: string | null;
  link_convite: string | null;
  tag_amazon: string | null;
  campanha: string | null;
  observacoes: string | null;
  autorizado_em: string | null;
  autorizacao_descricao: string | null;
};

export async function obterGrupoResumo(id: string): Promise<GrupoResumo | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos_resumo")
    .select(
      "id, nome, funcao, cadastro, jid, ativo, numero_coletor_id, coleta_iniciada_em, so_admins, membros_atual, membros_medido_em, link_convite, tag_amazon, campanha, observacoes, autorizado_em, autorizacao_descricao",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as GrupoResumo | null) ?? null;
}

export async function listarGruposResumo(): Promise<GrupoResumo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos_resumo")
    .select(
      "id, nome, funcao, cadastro, jid, ativo, numero_coletor_id, coleta_iniciada_em, so_admins, membros_atual, membros_medido_em, link_convite, tag_amazon, campanha, observacoes, autorizado_em, autorizacao_descricao",
    )
    .order("nome")
    .limit(1000);
  return (data ?? []) as GrupoResumo[];
}

export async function participacoes(grupoId: string) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos_numeros")
    .select("numero_id, admin, visto_em, numero:ofe_numeros(rotulo)")
    .eq("grupo_id", grupoId);
  return (data ?? []) as unknown as {
    numero_id: string;
    admin: boolean;
    visto_em: string;
    numero: { rotulo: string } | null;
  }[];
}
