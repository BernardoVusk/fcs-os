import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

/** Confirma que o objeto chegou ao bucket (com a sessão do usuário, então a RLS do bucket vale). */
export async function objetoExiste(bucket: string, caminho: string): Promise<boolean> {
  const supabase = await clienteServidor();
  const barra = caminho.lastIndexOf("/");
  const pasta = barra >= 0 ? caminho.slice(0, barra) : "";
  const nome = barra >= 0 ? caminho.slice(barra + 1) : caminho;
  const { data } = await supabase.storage.from(bucket).list(pasta, { search: nome, limit: 5 });
  return (data ?? []).some((o) => o.name === nome);
}
