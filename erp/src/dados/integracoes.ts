import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { TokenLista } from "@/componentes/configuracoes/Tokens";

export async function listarTokens(): Promise<TokenLista[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("tokens_integracao")
    .select("id, nome, prefixo, escopos, expira_em, ultimo_uso_em, revogado_em, criado_em")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data;
}
