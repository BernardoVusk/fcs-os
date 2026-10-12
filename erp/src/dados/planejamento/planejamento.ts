import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/tipos/banco";
import { clienteServidor } from "@/lib/supabase/servidor";
import { intervaloDoMes, somarDias } from "@/dominio/planejamento/calendario";
import { atrasado, ordenarItens, type Fluxo } from "@/dominio/planejamento/filtros";

type Cliente = SupabaseClient<Database>;

export type ItemPlano = Tables<"plan_itens">;
export type FluxoPlano = Tables<"plan_fluxos">;
export type Campanha = Tables<"plan_campanhas">;
export type Modelo = Tables<"plan_modelos">;
export type RecorrenciaPlano = Tables<"plan_recorrencias">;
export type HistoricoPlano = Tables<"plan_historico">;
export type RelacaoPlano = Tables<"plan_relacoes">;

/** Item com o que a tela precisa derivar do fluxo e das referências. */
export type ItemComFluxo = ItemPlano & {
  fechado: boolean;
  status_nome: string;
  campanha: { nome: string } | null;
  produto: { nome: string } | null;
};

export type ItemDetalhe = ItemComFluxo & {
  relacoes: {
    id: string;
    tipo: string;
    direcao: "de" | "para";
    outro: { id: string; titulo: string; status: string };
  }[];
  filhos: { id: string; titulo: string; status: string; prazo: string | null }[];
  pai: { id: string; titulo: string } | null;
  historico: (HistoricoPlano & { usuario_nome: string | null })[];
};

const SELECT_ITEM = "*, campanha:plan_campanhas(nome), produto:produtos(nome)";

export async function listarFluxosCom(c: Cliente): Promise<FluxoPlano[]> {
  const { data, error } = await c.from("plan_fluxos").select("*").order("tipo").order("ordem");
  if (error) throw error;
  return data ?? [];
}
export async function listarFluxos(): Promise<FluxoPlano[]> {
  return listarFluxosCom(await clienteServidor());
}

/** Código do status padrão do tipo (null se o fluxo não tiver padrão). */
export async function statusPadraoCom(c: Cliente, tipo: string): Promise<string | null> {
  const { data } = await c
    .from("plan_fluxos")
    .select("codigo")
    .eq("tipo", tipo)
    .eq("padrao", true)
    .maybeSingle();
  return data?.codigo ?? null;
}

export function fluxoDe(fluxos: readonly FluxoPlano[], tipo: string): Fluxo[] {
  return fluxos
    .filter((f) => f.tipo === tipo)
    .map((f) => ({ codigo: f.codigo, nome: f.nome, fechado: f.fechado, padrao: f.padrao }));
}

export function anexarFluxo<T extends ItemPlano & { campanha?: unknown; produto?: unknown }>(
  itens: readonly T[],
  fluxos: readonly FluxoPlano[],
): (T & { fechado: boolean; status_nome: string })[] {
  const mapa = new Map(fluxos.map((f) => [`${f.tipo}:${f.codigo}`, f]));
  return itens.map((i) => {
    const f = mapa.get(`${i.tipo}:${i.status}`);
    return { ...i, fechado: f?.fechado ?? false, status_nome: f?.nome ?? i.status };
  });
}

export type FiltrosItens = {
  /** Intervalo pela data do item (prazo, senão início). */
  inicio?: string;
  fim?: string;
  /** Também traz os sem data (backlog). */
  incluirSemData?: boolean;
  /** Só os sem data. */
  somenteSemData?: boolean;
  tipo?: string;
  status?: string;
  campanha?: string;
  produto?: string;
  abertos?: boolean;
  limite?: number;
};

export async function listarItensCom(c: Cliente, f: FiltrosItens = {}): Promise<ItemComFluxo[]> {
  let q = c
    .from("plan_itens")
    .select(SELECT_ITEM)
    .limit(f.limite ?? 1000);
  if (f.somenteSemData) q = q.is("prazo", null).is("inicio", null);
  else if (f.inicio && f.fim) {
    const partes = [
      `and(prazo.gte.${f.inicio},prazo.lte.${f.fim})`,
      `and(prazo.is.null,inicio.gte.${f.inicio},inicio.lte.${f.fim})`,
    ];
    if (f.incluirSemData) partes.push("and(prazo.is.null,inicio.is.null)");
    q = q.or(partes.join(","));
  }
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.status) q = q.eq("status", f.status);
  if (f.campanha) q = q.eq("campanha_id", f.campanha);
  if (f.produto) q = q.eq("produto_id", f.produto);
  const [{ data, error }, fluxos] = await Promise.all([q, listarFluxosCom(c)]);
  if (error) throw error;
  const lista = anexarFluxo(
    (data ?? []) as unknown as (ItemPlano & {
      campanha: { nome: string } | null;
      produto: { nome: string } | null;
    })[],
    fluxos,
  );
  const filtrados = f.abertos ? lista.filter((i) => !i.fechado) : lista;
  return ordenarItens(filtrados);
}
export async function listarItens(f: FiltrosItens = {}): Promise<ItemComFluxo[]> {
  return listarItensCom(await clienteServidor(), f);
}

/** Itens do mês (pelas pontas das semanas da grade) mais os sem data. */
export async function listarItensDoMes(
  mes: string,
  incluirSemData = true,
): Promise<ItemComFluxo[]> {
  const { inicio, fim } = intervaloDoMes(mes);
  return listarItens({ inicio, fim, incluirSemData });
}

export async function obterItemCom(c: Cliente, id: string): Promise<ItemDetalhe | null> {
  const { data, error } = await c.from("plan_itens").select(SELECT_ITEM).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const item = data as unknown as ItemPlano & {
    campanha: { nome: string } | null;
    produto: { nome: string } | null;
  };
  const [fluxos, de, para, filhos, pai, historico] = await Promise.all([
    listarFluxosCom(c),
    c
      .from("plan_relacoes")
      .select("id, tipo, outro:plan_itens!plan_relacoes_para_id_fkey(id, titulo, status)")
      .eq("de_id", id),
    c
      .from("plan_relacoes")
      .select("id, tipo, outro:plan_itens!plan_relacoes_de_id_fkey(id, titulo, status)")
      .eq("para_id", id),
    c.from("plan_itens").select("id, titulo, status, prazo").eq("pai_id", id).order("prazo"),
    item.pai_id
      ? c.from("plan_itens").select("id, titulo").eq("id", item.pai_id).maybeSingle()
      : Promise.resolve({ data: null }),
    c
      .from("plan_historico")
      .select("*")
      .eq("item_id", id)
      .order("em", { ascending: false })
      .limit(100),
  ]);
  const ids = [
    ...new Set((historico.data ?? []).map((h) => h.usuario_id).filter((u): u is string => !!u)),
  ];
  const nomes = ids.length
    ? await c.from("usuarios_app").select("id, nome").in("id", ids)
    : { data: [] };
  const nomePor = new Map((nomes.data ?? []).map((u) => [u.id, u.nome]));
  const [comFluxo] = anexarFluxo([item], fluxos);
  type Outro = { id: string; titulo: string; status: string };
  const relacoes = [
    ...((de.data ?? []) as unknown as { id: string; tipo: string; outro: Outro | null }[]).flatMap(
      (r) => (r.outro ? [{ id: r.id, tipo: r.tipo, direcao: "de" as const, outro: r.outro }] : []),
    ),
    ...(
      (para.data ?? []) as unknown as { id: string; tipo: string; outro: Outro | null }[]
    ).flatMap((r) =>
      r.outro ? [{ id: r.id, tipo: r.tipo, direcao: "para" as const, outro: r.outro }] : [],
    ),
  ];
  return {
    ...comFluxo,
    relacoes,
    filhos: filhos.data ?? [],
    pai: (pai.data as { id: string; titulo: string } | null) ?? null,
    historico: (historico.data ?? []).map((h) => ({
      ...h,
      usuario_nome: h.usuario_id ? (nomePor.get(h.usuario_id) ?? null) : null,
    })),
  };
}
export async function obterItem(id: string): Promise<ItemDetalhe | null> {
  return obterItemCom(await clienteServidor(), id);
}

export async function listarCampanhas(): Promise<
  (Campanha & { itens: number; fechados: number })[]
> {
  const c = await clienteServidor();
  const [{ data, error }, itens, fluxos] = await Promise.all([
    c
      .from("plan_campanhas")
      .select("*")
      .order("inicio", { ascending: false, nullsFirst: false })
      .order("nome"),
    c.from("plan_itens").select("campanha_id, tipo, status").not("campanha_id", "is", null),
    listarFluxosCom(c),
  ]);
  if (error) throw error;
  const fechado = new Set(fluxos.filter((f) => f.fechado).map((f) => `${f.tipo}:${f.codigo}`));
  return (data ?? []).map((ca) => {
    const meus = (itens.data ?? []).filter((i) => i.campanha_id === ca.id);
    return {
      ...ca,
      itens: meus.length,
      fechados: meus.filter((i) => fechado.has(`${i.tipo}:${i.status}`)).length,
    };
  });
}

export async function listarModelos(somenteAtivos = false): Promise<Modelo[]> {
  const c = await clienteServidor();
  let q = c.from("plan_modelos").select("*").order("tipo").order("nome");
  if (somenteAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listarRecorrencias(): Promise<
  (RecorrenciaPlano & { modelo: { nome: string; tipo: string } | null })[]
> {
  const c = await clienteServidor();
  const { data, error } = await c
    .from("plan_recorrencias")
    .select("*, modelo:plan_modelos(nome, tipo)")
    .order("criado_em");
  if (error) throw error;
  return (data ?? []) as unknown as (RecorrenciaPlano & {
    modelo: { nome: string; tipo: string } | null;
  })[];
}

export type Opcao = { id: string; nome: string };
export async function opcoesPlanejamento(): Promise<{
  campanhas: Opcao[];
  produtos: Opcao[];
  categorias: Opcao[];
  modelos: (Opcao & { tipo: string })[];
  fluxos: FluxoPlano[];
}> {
  const c = await clienteServidor();
  const [campanhas, produtos, categorias, modelos, fluxos] = await Promise.all([
    c.from("plan_campanhas").select("id, nome").neq("status", "cancelada").order("nome"),
    c
      .from("produtos")
      .select("id, nome")
      .in("status", ["ativo", "rascunho", "pausado"])
      .order("nome")
      .limit(500),
    c.from("categorias").select("id, nome").eq("escopo", "planejamento").order("nome"),
    c.from("plan_modelos").select("id, nome, tipo").eq("ativo", true).order("nome"),
    listarFluxosCom(c),
  ]);
  return {
    campanhas: campanhas.data ?? [],
    produtos: (produtos.data ?? []).map((p) => ({ id: p.id, nome: p.nome })),
    categorias: categorias.data ?? [],
    modelos: modelos.data ?? [],
    fluxos,
  };
}

export type ProximosItens = {
  proximos: Pick<
    ItemComFluxo,
    | "id"
    | "titulo"
    | "tipo"
    | "prazo"
    | "inicio"
    | "horario"
    | "status_nome"
    | "formato"
    | "canal_publicacao"
  >[];
  atrasados: number;
};

/** Dashboard: abertos de hoje até hoje + dias, mais a contagem de atrasados. */
export async function proximosItens(hoje: string, dias = 7): Promise<ProximosItens> {
  const c = await clienteServidor();
  const [janela, antigos] = await Promise.all([
    listarItensCom(c, { inicio: hoje, fim: somarDias(hoje, dias), abertos: true, limite: 200 }),
    listarItensCom(c, {
      inicio: "2000-01-01",
      fim: somarDias(hoje, -1),
      abertos: true,
      limite: 500,
    }),
  ]);
  return {
    proximos: janela.slice(0, 8).map((i) => ({
      id: i.id,
      titulo: i.titulo,
      tipo: i.tipo,
      prazo: i.prazo,
      inicio: i.inicio,
      horario: i.horario,
      status_nome: i.status_nome,
      formato: i.formato,
      canal_publicacao: i.canal_publicacao,
    })),
    atrasados: antigos.filter((i) => atrasado(i, hoje)).length,
  };
}
