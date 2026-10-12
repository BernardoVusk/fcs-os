import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";
import type { EstadoLancamento, TipoLancamento } from "@/dominio/financeiro/estados";
import type { LancamentoProjecao } from "@/dominio/financeiro/projecao";
import type { RealizacaoDre } from "@/dominio/financeiro/dre";

export type Conta = Database["public"]["Tables"]["contas_financeiras"]["Row"];
export type ContaSaldo = Database["public"]["Views"]["contas_saldos"]["Row"];
export type CategoriaFinanceira = Database["public"]["Tables"]["categorias_financeiras"]["Row"];
export type CentroCusto = Database["public"]["Tables"]["centros_custo"]["Row"];
export type Recorrencia = Database["public"]["Tables"]["recorrencias"]["Row"];
export type Lancamento = Database["public"]["Tables"]["lancamentos"]["Row"];
export type LancamentoSituacao = Database["public"]["Views"]["lancamentos_situacao"]["Row"];
export type Realizacao = Database["public"]["Tables"]["lancamentos_realizacoes"]["Row"];
export type ParametroTributario = Database["public"]["Tables"]["parametros_tributarios"]["Row"];
export type Provisao = Database["public"]["Tables"]["provisoes_imposto"]["Row"];

export async function listarContas(): Promise<ContaSaldo[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("contas_saldos").select("*").order("nome");
  if (error) throw error;
  return data;
}
export async function listarContasCompletas(): Promise<Conta[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("contas_financeiras").select("*").order("nome");
  if (error) throw error;
  return data;
}
export async function listarCategoriasFinanceiras(): Promise<CategoriaFinanceira[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .select("*")
    .order("tipo")
    .order("ordem")
    .order("nome");
  if (error) throw error;
  return data;
}
export async function listarCentrosCusto(): Promise<CentroCusto[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("centros_custo").select("*").order("nome");
  if (error) throw error;
  return data;
}
export async function listarRecorrencias(): Promise<
  (Recorrencia & { categoria: { nome: string } | null; conta: { nome: string } | null })[]
> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("recorrencias")
    .select("*, categoria:categorias_financeiras(nome), conta:contas_financeiras(nome)")
    .order("descricao");
  if (error) throw error;
  return data as (Recorrencia & {
    categoria: { nome: string } | null;
    conta: { nome: string } | null;
  })[];
}

export type FiltrosLancamento = {
  estado?: EstadoLancamento | "atrasado" | "abertos";
  tipo?: TipoLancamento;
  inicio?: string;
  fim?: string;
  categoriaId?: string;
  contaId?: string;
  limite?: number;
};

export async function listarLancamentosCom(
  cliente: ClienteBanco,
  f: FiltrosLancamento = {},
): Promise<LancamentoSituacao[]> {
  let q = cliente
    .from("lancamentos_situacao")
    .select("*")
    .order("data_prevista", { ascending: true })
    .order("criado_em", { ascending: true })
    .limit(Math.min(f.limite ?? 500, 2000));
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.inicio) q = q.gte("data_prevista", f.inicio);
  if (f.fim) q = q.lte("data_prevista", f.fim);
  if (f.categoriaId) q = q.eq("categoria_id", f.categoriaId);
  if (f.contaId) q = q.eq("conta_id", f.contaId);
  if (f.estado === "atrasado") q = q.eq("atrasado", true);
  else if (f.estado === "abertos") q = q.in("estado", ["planejado", "parcial"]);
  else if (f.estado) q = q.eq("estado", f.estado);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function listarLancamentos(f: FiltrosLancamento = {}): Promise<LancamentoSituacao[]> {
  return listarLancamentosCom(await clienteServidor(), f);
}

export async function obterLancamento(
  id: string,
): Promise<
  (LancamentoSituacao & { realizacoes: (Realizacao & { conta: { nome: string } | null })[] }) | null
> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("lancamentos_situacao")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: realizacoes } = await supabase
    .from("lancamentos_realizacoes")
    .select("*, conta:contas_financeiras(nome)")
    .eq("lancamento_id", id)
    .order("data");
  return {
    ...data,
    realizacoes: (realizacoes ?? []) as (Realizacao & { conta: { nome: string } | null })[],
  };
}

/** Lançamentos abertos no formato do domínio de projeção. */
export function paraProjecao(lista: LancamentoSituacao[]): LancamentoProjecao[] {
  return lista
    .filter((l) => l.tipo && l.data_prevista)
    .map((l) => ({
      tipo: l.tipo as TipoLancamento,
      data_prevista: l.data_prevista!,
      valor_previsto: Number(l.valor_previsto),
      valor_realizado: Number(l.valor_realizado ?? 0),
      cancelado_em: l.cancelado_em,
      estornado_em: l.estornado_em,
      encerrado_em: l.encerrado_em,
    }));
}

/** Realizações do período com categoria, para a DRE. */
export async function realizacoesDoPeriodo(inicio: string, fim: string): Promise<RealizacaoDre[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("lancamentos_realizacoes")
    .select(
      "valor, data, lancamento:lancamentos(tipo, origem_tipo, estornado_em, categoria:categorias_financeiras(nome, natureza, embutido_no_custo))",
    )
    .gte("data", inicio)
    .lte("data", fim);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const l = r.lancamento as {
      tipo: string;
      origem_tipo: string | null;
      estornado_em: string | null;
      categoria: { nome: string; natureza: string; embutido_no_custo: boolean } | null;
    } | null;
    return {
      tipo: (l?.tipo ?? "despesa") as TipoLancamento,
      data: r.data,
      valor: Number(r.valor),
      categoria: l?.categoria
        ? {
            nome: l.categoria.nome,
            natureza: l.categoria.natureza as "fixa" | "variavel",
            embutido_no_custo: l.categoria.embutido_no_custo,
          }
        : null,
      estorno: l?.origem_tipo === "estorno" || l?.estornado_em != null,
    };
  });
}

export async function tributoVigente(): Promise<ParametroTributario | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("parametros_tributarios")
    .select("*")
    .lte("vigente_desde", new Date().toISOString().slice(0, 10))
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
export async function listarTributos(): Promise<ParametroTributario[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("parametros_tributarios")
    .select("*")
    .order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data;
}
export async function listarProvisoes(): Promise<
  (Provisao & { lancamento: { id: string; valor_previsto: number } | null })[]
> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("provisoes_imposto")
    .select("*, lancamento:lancamentos(id, valor_previsto)")
    .order("competencia", { ascending: false })
    .limit(24);
  if (error) throw error;
  return data as (Provisao & { lancamento: { id: string; valor_previsto: number } | null })[];
}

/** Totais realizados no período para o dashboard: receita recebida e despesas pagas (sem transferências nem estornos). */
export async function realizadoNoPeriodo(
  inicio: string,
  fim: string,
): Promise<{ recebido: number; pago: number } | null> {
  const supabase = await clienteServidor();
  const { count } = await supabase.from("lancamentos").select("id", { count: "exact", head: true });
  if (!count) return null;
  const lista = await realizacoesDoPeriodo(inicio.slice(0, 10), fim.slice(0, 10));
  return lista.reduce(
    (acc, r) => {
      if (r.estorno || r.tipo === "transferencia") return acc;
      if (r.tipo === "receita") acc.recebido = Math.round((acc.recebido + r.valor) * 100) / 100;
      else acc.pago = Math.round((acc.pago + r.valor) * 100) / 100;
      return acc;
    },
    { recebido: 0, pago: 0 },
  );
}
