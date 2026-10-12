import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Tables } from "@/tipos/banco";

export type Auditoria = Tables<"auditoria">;
export type LinhaAuditoria = Auditoria & { usuario_nome: string | null; campos: string[] };

export type FiltrosAuditoria = {
  tabela?: string;
  acao?: "insert" | "update" | "delete";
  origem?: string;
  registro?: string;
  inicio?: string;
  fim?: string;
  limite?: number;
};

/** Chaves que mudaram entre antes e depois (update) ou todas as chaves (insert e delete). */
export function camposAlterados(antes: unknown, depois: unknown): string[] {
  const a = (antes ?? {}) as Record<string, unknown>;
  const d = (depois ?? {}) as Record<string, unknown>;
  const chaves = new Set([...Object.keys(a), ...Object.keys(d)]);
  return [...chaves]
    .filter((k) => k !== "atualizado_em" && JSON.stringify(a[k]) !== JSON.stringify(d[k]))
    .sort();
}

export async function listarAuditoria(f: FiltrosAuditoria = {}): Promise<LinhaAuditoria[]> {
  const c = await clienteServidor();
  let q = c
    .from("auditoria")
    .select("*")
    .order("em", { ascending: false })
    .limit(f.limite ?? 200);
  if (f.tabela) q = q.eq("tabela", f.tabela);
  if (f.acao) q = q.eq("acao", f.acao);
  if (f.origem) q = q.eq("origem", f.origem);
  if (f.registro) q = q.eq("registro_id", f.registro);
  if (f.inicio) q = q.gte("em", f.inicio);
  if (f.fim) q = q.lt("em", f.fim);
  const { data, error } = await q;
  if (error) throw error;
  const lista = data ?? [];
  const ids = [...new Set(lista.map((l) => l.usuario_id).filter((u): u is string => !!u))];
  const nomes = ids.length
    ? await c.from("usuarios_app").select("id, nome").in("id", ids)
    : { data: [] };
  const nomePor = new Map((nomes.data ?? []).map((u) => [u.id, u.nome]));
  return lista.map((l) => ({
    ...l,
    usuario_nome: l.usuario_id ? (nomePor.get(l.usuario_id) ?? null) : null,
    campos:
      l.acao === "update"
        ? camposAlterados(l.antes, l.depois)
        : Object.keys((l.depois ?? l.antes ?? {}) as object).sort(),
  }));
}

/** Tabelas e origens presentes na auditoria, para os filtros. */
export async function opcoesAuditoria(): Promise<{ tabelas: string[]; origens: string[] }> {
  const c = await clienteServidor();
  const { data } = await c
    .from("auditoria")
    .select("tabela, origem")
    .order("em", { ascending: false })
    .limit(5000);
  const tabelas = [...new Set((data ?? []).map((l) => l.tabela))].sort();
  const origens = [...new Set((data ?? []).map((l) => l.origem))].sort();
  return { tabelas, origens };
}
