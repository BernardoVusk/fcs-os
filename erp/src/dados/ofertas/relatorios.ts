import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export type FiltrosRelatorio = {
  inicio: string;
  fim: string;
  grupo?: string | null;
  plataforma?: string | null;
  fila?: string | null;
  numero?: string | null;
  campanha?: string | null;
};

const nulo = <T>(v: T | null | undefined) => (v ?? null) as T;

export async function relatorioEnvios(f: FiltrosRelatorio) {
  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("ofe_relatorio_envios", {
    p_inicio: f.inicio,
    p_fim: f.fim,
    p_grupo: nulo(f.grupo) as string,
    p_plataforma: nulo(f.plataforma) as string,
    p_fila: nulo(f.fila) as string,
    p_numero: nulo(f.numero) as string,
    p_campanha: nulo(f.campanha) as string,
  });
  return data ?? [];
}

export async function relatorioConversoes(f: FiltrosRelatorio) {
  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("ofe_relatorio_conversoes", {
    p_inicio: f.inicio,
    p_fim: f.fim,
    p_grupo: nulo(f.grupo) as string,
    p_plataforma: nulo(f.plataforma) as string,
  });
  return data ?? [];
}

export async function relatorioCliques(f: FiltrosRelatorio) {
  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("ofe_relatorio_cliques", {
    p_inicio: f.inicio.slice(0, 10),
    p_fim: f.fim.slice(0, 10),
    p_grupo: nulo(f.grupo) as string,
    p_plataforma: nulo(f.plataforma) as string,
  });
  return data ?? [];
}

/** Última importação por plataforma e tipo, para mostrar a origem e a data de cada número. */
export async function ultimasImportacoes() {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_importacoes")
    .select("plataforma, origem, tipo, importado_em, linhas, periodo_inicio, periodo_fim")
    .order("importado_em", { ascending: false })
    .limit(100);
  const vistas = new Map<string, NonNullable<typeof data>[number]>();
  for (const i of data ?? []) {
    const k = `${i.plataforma}:${i.tipo}`;
    if (!vistas.has(k)) vistas.set(k, i);
  }
  return [...vistas.values()];
}

export type FiltrosHistorico = {
  inicio: string;
  fim: string;
  grupo?: string | null;
  numero?: string | null;
  status?: string | null;
  busca?: string | null;
};

export type LinhaHistorico = {
  id: string;
  status: string;
  modo: string;
  motivo: string | null;
  erro_detalhe: string | null;
  tentativas: number;
  agendado_para: string;
  enviado_em: string | null;
  link_url: string | null;
  link_origem: string | null;
  texto_final: string | null;
  wa_mensagem_id: string | null;
  grupo: { nome: string } | null;
  numero: { rotulo: string } | null;
  publicacao: {
    origem: string;
    criado_em: string;
    texto_editado: string | null;
    criado_por: string | null;
    autor: string | null;
    fila: { nome: string } | null;
    oferta: {
      titulo: string | null;
      url_original: string;
      plataforma: string;
      modelo: { nome: string } | null;
    } | null;
    cupom: { codigo: string | null; plataforma: string } | null;
  } | null;
  tentativas_lista: { iniciado_em: string; resultado: string | null; erro: string | null }[];
};

export async function historicoEnvios(f: FiltrosHistorico): Promise<LinhaHistorico[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_envios")
    .select(
      "id, status, modo, motivo, erro_detalhe, tentativas, agendado_para, enviado_em, link_url, link_origem, texto_final, wa_mensagem_id, grupo:ofe_grupos(nome), numero:ofe_numeros(rotulo), publicacao:ofe_publicacoes(origem, criado_em, criado_por, texto_editado, fila:ofe_filas(nome), oferta:ofe_ofertas(titulo, url_original, plataforma, modelo:ofe_modelos(nome)), cupom:ofe_cupons(codigo, plataforma)), tentativas_lista:ofe_envios_tentativas(iniciado_em, resultado, erro)",
    )
    .gte("agendado_para", f.inicio)
    .lt("agendado_para", f.fim)
    .order("agendado_para", { ascending: false })
    .limit(300);
  if (f.grupo) q = q.eq("grupo_id", f.grupo);
  if (f.numero) q = q.eq("numero_id", f.numero);
  if (f.status) q = q.eq("status", f.status);
  if (f.busca) {
    const termo = f.busca
      .replace(/[%,()]/g, " ")
      .trim()
      .slice(0, 80);
    if (termo) q = q.or(`texto_final.ilike.%${termo}%,link_url.ilike.%${termo}%`);
  }
  const { data } = await q;
  const linhas = (data ?? []) as unknown as LinhaHistorico[];
  const nomes = await nomesUsuarios(
    linhas.map((l) => l.publicacao?.criado_por).filter((x): x is string => !!x),
  );
  for (const l of linhas)
    if (l.publicacao)
      l.publicacao.autor = l.publicacao.criado_por
        ? (nomes.get(l.publicacao.criado_por) ?? null)
        : null;
  return linhas;
}

async function nomesUsuarios(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map();
  const supabase = await clienteServidor();
  const { data } = await supabase.from("usuarios_app").select("id, nome").in("id", unicos);
  return new Map((data ?? []).map((u) => [u.id, u.nome]));
}

/** Alterações de configuração do módulo (auditoria; só o dono enxerga, pela RLS). */
export async function auditoriaOfertas(inicio: string, fim: string) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("auditoria")
    .select("id, tabela, registro_id, acao, antes, depois, origem, em, usuario_id")
    .like("tabela", "ofe\\_%")
    .gte("em", inicio)
    .lt("em", fim)
    .order("em", { ascending: false })
    .limit(200);
  const linhas = (data ?? []) as unknown as {
    id: number;
    tabela: string;
    registro_id: string;
    acao: string;
    antes: Record<string, unknown> | null;
    depois: Record<string, unknown> | null;
    origem: string;
    em: string;
    usuario_id: string | null;
  }[];
  const nomes = await nomesUsuarios(
    linhas.map((l) => l.usuario_id).filter((x): x is string => !!x),
  );
  return linhas.map((l) => ({
    ...l,
    autor: l.usuario_id ? (nomes.get(l.usuario_id) ?? null) : null,
  }));
}
