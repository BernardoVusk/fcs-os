import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/tipos/banco";
import { env } from "@/lib/env";

/** Cliente com a sessão do usuário (cookies). RLS vale. Server components e actions. */
export async function clienteServidor() {
  const jar = await cookies();
  return createServerClient<Database>(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) jar.set(name, value, options);
        } catch {
          // Server component não escreve cookie; o proxy renova a sessão.
        }
      },
    },
    global: { headers: { "x-origem": "web" } },
  });
}
