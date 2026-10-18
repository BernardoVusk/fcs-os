import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarIntegracoes, type Integracao } from "./integracoes";

export type ResumoPainelOfertas = {
  integracoes: Integracao[];
  alertasAbertos: number;
};

/** Números do painel de Grupos de Ofertas. Cada contagem vem de tabela real; nada é estimado. */
export async function resumoPainelOfertas(): Promise<ResumoPainelOfertas> {
  const supabase = await clienteServidor();
  const agora = new Date().toISOString();
  const [integracoes, alertas] = await Promise.all([
    listarIntegracoes(),
    supabase
      .from("alertas")
      .select("id", { count: "exact", head: true })
      .like("tipo", "ofe\\_%")
      .is("resolvido_em", null)
      .or(`silenciado_ate.is.null,silenciado_ate.lt.${agora}`),
  ]);
  return { integracoes, alertasAbertos: alertas.count ?? 0 };
}
