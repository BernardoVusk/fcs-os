import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { contarAlertasAbertos } from "./alertas";
import { contarConhecimentosAtivos } from "./conhecimento";

export type ResumoInicial = { alertasAbertos: number; canaisTotal: number; canaisComTaxas: number; conhecimentosAtivos: number };

export async function resumoInicial(): Promise<ResumoInicial> {
  const supabase = await clienteServidor();
  const [{ data: canais }, alertasAbertos, conhecimentosAtivos] = await Promise.all([
    supabase.from("canais_venda_vigentes").select("id, comissao_pct").eq("ativo", true),
    contarAlertasAbertos(),
    contarConhecimentosAtivos(),
  ]);
  const lista = canais ?? [];
  return {
    alertasAbertos,
    conhecimentosAtivos,
    canaisTotal: lista.length,
    canaisComTaxas: lista.filter((c) => c.comissao_pct !== null).length,
  };
}
