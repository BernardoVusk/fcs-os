import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { lerPapel, podeEscrever, podeLer, type Area, type Papel } from "@/lib/auth/papeis";

export type UsuarioSessao = { id: string; email: string; nome: string; papel: Papel };

/** Usuário logado com linha ativa em usuarios_app. Cacheado por request. */
export const usuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios_app")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .maybeSingle();
  const papel = lerPapel(data?.papel);
  if (!data || !data.ativo || !papel) return null;
  return { id: data.id, email: user.email ?? "", nome: data.nome, papel };
});

/** Páginas: redireciona quem não pode ler a área. */
export async function exigirLeitura(area: Area): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/sem-acesso");
  if (!podeLer(usuario.papel, area)) redirect(`/sem-acesso?area=${area}`);
  return usuario;
}

/** Actions: lança erro se não pode escrever (uma action pode ser disparada de qualquer página). */
export async function exigirEscrita(area: Area): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual();
  if (!usuario || !podeEscrever(usuario.papel, area)) throw new Error("sem_permissao");
  return usuario;
}
