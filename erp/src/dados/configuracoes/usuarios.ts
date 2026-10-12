import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { lerPapel, type Papel } from "@/lib/auth/papeis";

export type UsuarioLista = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
};

/** Só o dono chama (a página exige leitura da área usuarios). E-mails vêm do Auth pela service role. */
export async function listarUsuarios(): Promise<UsuarioLista[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, nome, papel, ativo, criado_em")
    .order("nome");
  if (error) throw error;
  const { data: auth, error: erroAuth } = await clienteAdmin().auth.admin.listUsers({
    perPage: 1000,
  });
  if (erroAuth) throw erroAuth;
  const emails = new Map(auth.users.map((u) => [u.id, u.email ?? ""]));
  return data.map((u) => ({
    ...u,
    papel: lerPapel(u.papel) ?? "leitura",
    email: emails.get(u.id) ?? "",
  }));
}
