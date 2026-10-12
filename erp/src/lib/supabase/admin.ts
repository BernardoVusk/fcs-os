import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";
import { env } from "@/lib/env";

export type Origem = "web" | "mcp" | "script" | "importacao";

/** Service role: ignora RLS. Só para criar usuários (dono) e scripts. Nunca em componente. */
export function clienteAdmin(origem: Origem = "web") {
  return createClient<Database>(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origem": origem } },
  });
}
