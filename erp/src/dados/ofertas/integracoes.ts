import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { AnuncianteAwin } from "@/dominio/ofertas/urls";
import {
  lerPlataforma,
  type Plataforma,
  type StatusIntegracao,
} from "@/dominio/ofertas/plataformas";

export type Integracao = {
  id: string;
  plataforma: Plataforma;
  status: StatusIntegracao;
  identificadores: Record<string, string>;
  recursos: Record<string, unknown>;
  segredo_configurado_em: string | null;
  testado_em: string | null;
  ultimo_erro: string | null;
  ultimo_erro_em: string | null;
  conformidade_em: string | null;
  conformidade_observacao: string | null;
  conformidade_por_nome: string | null;
};

/** As quatro integrações, sem segredo (a tabela de segredos nem é visível pela sessão). */
export async function listarIntegracoes(): Promise<Integracao[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_integracoes")
    .select(
      "id, plataforma, status, identificadores, recursos, segredo_configurado_em, testado_em, ultimo_erro, ultimo_erro_em, conformidade_em, conformidade_observacao, por:usuarios_app(nome)",
    )
    .order("plataforma");
  const saida: Integracao[] = [];
  for (const l of data ?? []) {
    const p = lerPlataforma(l.plataforma);
    if (!p) continue;
    saida.push({
      id: l.id,
      plataforma: p,
      status: l.status as StatusIntegracao,
      identificadores: (l.identificadores ?? {}) as Record<string, string>,
      recursos: (l.recursos ?? {}) as Record<string, unknown>,
      segredo_configurado_em: l.segredo_configurado_em,
      testado_em: l.testado_em,
      ultimo_erro: l.ultimo_erro,
      ultimo_erro_em: l.ultimo_erro_em,
      conformidade_em: l.conformidade_em,
      conformidade_observacao: l.conformidade_observacao,
      conformidade_por_nome: (l.por as { nome?: string } | null)?.nome ?? null,
    });
  }
  return saida;
}

export async function anunciantesAwin(): Promise<AnuncianteAwin[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_awin_anunciantes")
    .select("advertiser_id, dominios")
    .limit(2000);
  return (data ?? []).map((a) => ({ advertiserId: a.advertiser_id, dominios: a.dominios }));
}

export async function contarAnunciantesAwin(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("ofe_awin_anunciantes")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}
