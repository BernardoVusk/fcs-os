import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { credenciaisDasLinhas, type CredenciaisCarregadas } from "./segredo";

export type { CredenciaisCarregadas };

/**
 * Único ponto do ERP que lê e decifra segredo de integração (service role, decisão registrada em
 * docs/arquitetura.md). Devolve as credenciais em memória para a chamada da API; nunca para a tela.
 */
export async function carregarCredenciais(): Promise<CredenciaisCarregadas> {
  const { data, error } = await clienteAdmin("web")
    .from("ofe_integracoes")
    .select("plataforma, identificadores, segredo:ofe_integracoes_segredos(segredo)");
  if (error) throw new Error("erro_inesperado");
  return credenciaisDasLinhas(
    (data ?? []).map((l) => ({
      plataforma: l.plataforma,
      identificadores: l.identificadores,
      segredo: (l.segredo as { segredo?: string } | null)?.segredo ?? null,
    })),
  );
}
