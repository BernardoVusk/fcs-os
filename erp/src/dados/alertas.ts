import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Tables } from "@/tipos/banco";

export type Alerta = Tables<"alertas">;

export async function contarAlertasAbertos(): Promise<number> {
  const supabase = await clienteServidor();
  const agora = new Date().toISOString();
  const { count } = await supabase
    .from("alertas")
    .select("id", { count: "exact", head: true })
    .is("resolvido_em", null)
    .or(`silenciado_ate.is.null,silenciado_ate.lt.${agora}`);
  return count ?? 0;
}

export type FiltroAlertas = "abertos" | "silenciados" | "resolvidos";

/** Abertos (sem silêncio vigente), silenciados ou resolvidos (últimos 200). */
export async function listarAlertas(
  filtro: FiltroAlertas = "abertos",
  tipo?: string,
): Promise<Alerta[]> {
  const supabase = await clienteServidor();
  const agora = new Date().toISOString();
  let q = supabase.from("alertas").select("*").limit(200);
  if (filtro === "resolvidos")
    q = q.not("resolvido_em", "is", null).order("resolvido_em", { ascending: false });
  else if (filtro === "silenciados")
    q = q.is("resolvido_em", null).gt("silenciado_ate", agora).order("silenciado_ate");
  else
    q = q
      .is("resolvido_em", null)
      .or(`silenciado_ate.is.null,silenciado_ate.lt.${agora}`)
      .order("severidade")
      .order("criado_em", { ascending: false });
  if (tipo) q = q.eq("tipo", tipo);
  const { data, error } = await q;
  if (error) throw error;
  const lista = data ?? [];
  if (filtro !== "abertos") return lista;
  const peso: Record<string, number> = { critico: 0, atencao: 1, info: 2 };
  return [...lista].sort(
    (a, b) =>
      (peso[a.severidade] ?? 9) - (peso[b.severidade] ?? 9) || (a.criado_em < b.criado_em ? 1 : -1),
  );
}

/** Tipos presentes entre os abertos, com contagem, para os filtros da tela. */
export async function tiposDeAlerta(): Promise<{ tipo: string; total: number }[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("alertas")
    .select("tipo")
    .is("resolvido_em", null)
    .limit(2000);
  const mapa = new Map<string, number>();
  for (const a of data ?? []) mapa.set(a.tipo, (mapa.get(a.tipo) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);
}

/** Rota da entidade ligada ao alerta, para o link "Abrir". */
export function rotaDaEntidade(a: Pick<Alerta, "entidade_tipo" | "entidade_id">): string | null {
  if (!a.entidade_id)
    return a.entidade_tipo === "financeiro" ? "/financeiro/lancamentos?estado=atrasado" : null;
  switch (a.entidade_tipo) {
    case "insumo":
      return `/estoque/insumos/${a.entidade_id}`;
    case "lote":
      return `/estoque/insumos?destaque=${a.entidade_id}`;
    case "produto":
      return `/catalogo/produtos/${a.entidade_id}`;
    case "pedido":
      return `/vendas/pedidos/${a.entidade_id}`;
    case "ordem":
      return `/producao/ordens/${a.entidade_id}`;
    case "impressora":
      return `/producao/impressoras/${a.entidade_id}`;
    case "item_plano":
      return `/planejamento/itens/${a.entidade_id}`;
    case "lancamento":
      return `/financeiro/lancamentos?destaque=${a.entidade_id}`;
    default:
      return null;
  }
}

export const TIPO_ALERTA_ROTULO: Record<string, string> = {
  estoque_baixo: "Estoque abaixo do mínimo",
  estoque_negativo: "Estoque negativo",
  lote_dividido: "Lote dividido no consumo",
  margem_reduzida: "Margem abaixo do alvo",
  divergencia_repasse: "Repasse diferente do previsto",
  prazo_vencido: "Prazo vencido no planejamento",
  ordem_atrasada: "Ordem de produção atrasada",
  pedido_parado: "Pedido pago sem envio",
  lancamento_vencido: "Lançamento vencido",
  manutencao_prevista: "Manutenção prevista",
};
