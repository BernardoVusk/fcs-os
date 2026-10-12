import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";
import { env } from "@/lib/env";

export type Origem = "web" | "mcp" | "script" | "importacao";

/**
 * Service role: ignora RLS. Só para criar usuários (dono), scripts e o servidor MCP.
 * `usuarioId` vai no cabeçalho x-usuario-id, que o banco usa para atribuir autoria
 * (app.usuario_da_requisicao) quando não há sessão. Nunca em componente.
 */
export function clienteAdmin(origem: Origem = "web", usuarioId?: string) {
  const headers: Record<string, string> = { "x-origem": origem };
  if (usuarioId) headers["x-usuario-id"] = usuarioId;
  return createClient<Database>(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}
