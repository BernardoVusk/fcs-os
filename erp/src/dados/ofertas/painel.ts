import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarIntegracoes, type Integracao } from "./integracoes";
import { workerOnline } from "./whatsapp";

export type ResumoPainelOfertas = {
  integracoes: Integracao[];
  alertasAbertos: number;
  worker: { online: boolean; ultimo: string | null };
  numeros: Record<string, number>;
  grupos: Record<string, number>;
  envios7d: Record<string, number>;
  programados: number;
  automacoes: Record<string, number>;
  cupons: { ativos: number; vencendo: number };
  cliques30d: { total: number; importadoEm: string | null } | null;
  comissao30d: { total: number; importadoEm: string | null } | null;
};

const contar = <T extends string>(
  linhas: { [k: string]: unknown }[] | null,
  campo: string,
): Record<T, number> => {
  const r = {} as Record<T, number>;
  for (const l of linhas ?? []) {
    const k = String(l[campo] ?? "sem") as T;
    r[k] = (r[k] ?? 0) + 1;
  }
  return r;
};

/** Números do painel. Cada contagem vem de tabela real; o que não foi importado fica nulo. */
export async function resumoPainelOfertas(): Promise<ResumoPainelOfertas> {
  const supabase = await clienteServidor();
  const agora = new Date();
  const iso = (ms: number) => new Date(agora.getTime() + ms).toISOString();
  const [
    integracoes,
    alertas,
    worker,
    numeros,
    grupos,
    envios,
    programados,
    automacoes,
    cupAtivos,
    cupVencendo,
    cliques,
    conv,
    imps,
  ] = await Promise.all([
    listarIntegracoes(),
    supabase
      .from("alertas")
      .select("id", { count: "exact", head: true })
      .like("tipo", "ofe\\_%")
      .is("resolvido_em", null)
      .or(`silenciado_ate.is.null,silenciado_ate.lt.${agora.toISOString()}`),
    workerOnline(),
    supabase.from("ofe_numeros").select("id, estado:ofe_numeros_estado(status)").eq("ativo", true),
    supabase.from("ofe_grupos").select("funcao").eq("ativo", true).limit(5000),
    supabase
      .from("ofe_envios")
      .select("status")
      .gte("agendado_para", iso(-7 * 86_400_000))
      .limit(20000),
    supabase
      .from("ofe_envios")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando")
      .gt("agendado_para", agora.toISOString()),
    supabase.from("ofe_automacoes").select("status"),
    supabase
      .from("ofe_cupons")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
      .or(`fim_em.is.null,fim_em.gt.${agora.toISOString()}`),
    supabase
      .from("ofe_cupons")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
      .gt("fim_em", agora.toISOString())
      .lte("fim_em", iso(7 * 86_400_000)),
    supabase
      .from("ofe_cliques_importados")
      .select("cliques")
      .gte("dia", iso(-30 * 86_400_000).slice(0, 10))
      .limit(20000),
    supabase
      .from("ofe_conversoes")
      .select("comissao")
      .gte("ocorrida_em", iso(-30 * 86_400_000))
      .limit(20000),
    supabase
      .from("ofe_importacoes")
      .select("tipo, importado_em")
      .order("importado_em", { ascending: false })
      .limit(50),
  ]);
  const estadoNumeros = (numeros.data ?? []).map((n) => ({
    status: (n.estado as unknown as { status: string } | null)?.status ?? "desconectado",
  }));
  const ultima = (tipo: string) =>
    (imps.data ?? []).find((i) => i.tipo === tipo)?.importado_em ?? null;
  return {
    integracoes,
    alertasAbertos: alertas.count ?? 0,
    worker,
    numeros: contar(estadoNumeros, "status"),
    grupos: contar(grupos.data, "funcao"),
    envios7d: contar(envios.data, "status"),
    programados: programados.count ?? 0,
    automacoes: contar(automacoes.data, "status"),
    cupons: { ativos: cupAtivos.count ?? 0, vencendo: cupVencendo.count ?? 0 },
    cliques30d: ultima("cliques")
      ? {
          total: (cliques.data ?? []).reduce((s, c) => s + c.cliques, 0),
          importadoEm: ultima("cliques"),
        }
      : null,
    comissao30d: ultima("conversoes")
      ? {
          total: (conv.data ?? []).reduce((s, c) => s + Number(c.comissao ?? 0), 0),
          importadoEm: ultima("conversoes"),
        }
      : null,
  };
}
