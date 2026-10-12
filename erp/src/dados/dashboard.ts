import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Periodo } from "@/componentes/painel/SeletorPeriodo";
import { intervaloDoPeriodo } from "@/lib/formatos/periodo";
import { contarAlertasAbertos } from "./alertas";
import { contarConhecimentosAtivos } from "./conhecimento";
import { consumoFilamentoNoPeriodo, contarAbaixoMinimo } from "./estoque/insumos";

export type ResumoInicial = {
  alertasAbertos: number;
  canaisTotal: number;
  canaisComTaxas: number;
  conhecimentosAtivos: number;
  insumosAbaixoMinimo: number;
  /** Gramas consumidas no período; null quando não há filamento cadastrado. */
  consumoFilamentoG: number | null;
};

export async function resumoInicial(periodo: Periodo): Promise<ResumoInicial> {
  const supabase = await clienteServidor();
  const { inicio, fim } = intervaloDoPeriodo(periodo);
  const [
    { data: canais },
    alertasAbertos,
    conhecimentosAtivos,
    insumosAbaixoMinimo,
    consumoFilamentoG,
  ] = await Promise.all([
    supabase.from("canais_venda_vigentes").select("id, comissao_pct").eq("ativo", true),
    contarAlertasAbertos(),
    contarConhecimentosAtivos(),
    contarAbaixoMinimo(),
    consumoFilamentoNoPeriodo(inicio, fim),
  ]);
  const lista = canais ?? [];
  return {
    alertasAbertos,
    conhecimentosAtivos,
    insumosAbaixoMinimo,
    consumoFilamentoG,
    canaisTotal: lista.length,
    canaisComTaxas: lista.filter((c) => c.comissao_pct !== null).length,
  };
}
