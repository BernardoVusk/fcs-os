import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { contarAlertasAbertos } from "./alertas";

export type ResumoInicial = { alertasAbertos: number; canaisTotal: number; canaisComTaxas: number };

export async function resumoInicial(): Promise<ResumoInicial> {
  const supabase = await clienteServidor();
  const [{ data: canais }, alertasAbertos] = await Promise.all([
    supabase.from("canais_venda_vigentes").select("id, comissao_pct").eq("ativo", true),
    contarAlertasAbertos(),
  ]);
  const lista = canais ?? [];
  return {
    alertasAbertos,
    canaisTotal: lista.length,
    canaisComTaxas: lista.filter((c) => c.comissao_pct !== null).length,
  };
}
