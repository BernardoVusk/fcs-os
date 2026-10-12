"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";

const schema = z.object({
  email: z.email({ error: "email_invalido" }),
  senha: z.string().min(1, { error: "senha_obrigatoria" }).max(200),
  voltar: z.string().max(300).optional(),
});

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const campos = lerCampos(fd, ["email", "senha", "voltar"] as const);
  const r = schema.safeParse({ ...campos, voltar: campos.voltar || undefined });
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: r.data.email,
    password: r.data.senha,
  });
  if (error) return { erros: { _form: "credenciais_invalidas" } };
  const v = r.data.voltar;
  redirect(v && v.startsWith("/") && !v.startsWith("//") ? v : "/");
}
