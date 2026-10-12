"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { PAPEIS } from "@/lib/auth/papeis";
import { errosDoZod, lerCampos, type EstadoForm, type ResultadoAcao } from "@/lib/forms";

const criarSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(120, { error: "nome_longo" }),
  email: z.email({ error: "email_invalido" }),
  senha: z.string().min(10, { error: "senha_curta" }).max(200),
  papel: z.enum(PAPEIS, { error: "papel_invalido" }),
});

export async function criarUsuario(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("usuarios");
  const r = criarSchema.safeParse(lerCampos(fd, ["nome", "email", "senha", "papel"] as const));
  if (!r.success) return errosDoZod(r.error);
  const admin = clienteAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: r.data.email,
    password: r.data.senha,
    email_confirm: true,
  });
  if (error) {
    return { erros: { _form: error.message.toLowerCase().includes("already") ? "duplicado" : "erro_inesperado" } };
  }
  const supabase = await clienteServidor();
  const { error: erroLinha } = await supabase
    .from("usuarios_app")
    .insert({ id: data.user.id, nome: r.data.nome, papel: r.data.papel });
  if (erroLinha) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { erros: { _form: "erro_inesperado" } };
  }
  revalidatePath("/configuracoes/usuarios");
  return { erros: {}, ok: true, mensagem: "Usuário criado." };
}

const alterarSchema = z.object({ papel: z.enum(PAPEIS).optional(), ativo: z.boolean().optional() });

export async function alterarUsuario(id: string, mudanca: { papel?: string; ativo?: boolean }): Promise<ResultadoAcao> {
  let eu;
  try {
    eu = await exigirEscrita("usuarios");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const r = alterarSchema.safeParse(mudanca);
  if (!r.success) return { ok: false, erro: "papel_invalido" };
  if (id === eu.id && (r.data.ativo === false || (r.data.papel && r.data.papel !== "dono"))) {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("usuarios_app").update(r.data).eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/usuarios");
  return { ok: true, mensagem: "Usuário atualizado." };
}
