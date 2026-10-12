"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, type ResultadoAcao } from "@/lib/forms";
import { ESCOPOS, lerEscopos } from "@/dominio/conhecimento/escopos";

export type ResultadoToken = { ok: true; token: string; prefixo: string } | { ok: false; erros: Record<string, string> };

const schema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  escopos: z.array(z.enum(ESCOPOS)).min(1, { error: "escopo_obrigatorio" }),
  validade_dias: z.enum(["30", "90", "365", "0"]),
});

/** Gera o token em claro uma única vez; o banco guarda só o hash e o prefixo. */
export async function criarToken(fd: FormData): Promise<ResultadoToken> {
  let usuario;
  try {
    usuario = await exigirEscrita("usuarios");
  } catch {
    return { ok: false, erros: { _form: "sem_permissao" } };
  }
  const r = schema.safeParse({
    nome: String(fd.get("nome") ?? "").trim(),
    escopos: lerEscopos(fd.getAll("escopos").map(String)),
    validade_dias: String(fd.get("validade_dias") ?? "90"),
  });
  if (!r.success) return { ok: false, erros: errosDoZod(r.error).erros };
  const token = `fcs_${randomBytes(32).toString("base64url")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const prefixo = token.slice(0, 12);
  const dias = Number(r.data.validade_dias);
  const expira = dias > 0 ? new Date(Date.now() + dias * 86_400_000).toISOString() : null;
  const supabase = await clienteServidor();
  const { error } = await supabase.from("tokens_integracao").insert({
    nome: r.data.nome,
    hash_token: hash,
    prefixo,
    usuario_id: usuario.id,
    escopos: r.data.escopos,
    expira_em: expira,
  });
  if (error) return { ok: false, erros: { _form: "erro_inesperado" } };
  revalidatePath("/configuracoes/integracoes");
  return { ok: true, token, prefixo };
}

export async function revogarToken(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("usuarios");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("tokens_integracao")
    .update({ revogado_em: new Date().toISOString() })
    .eq("id", id)
    .is("revogado_em", null);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/integracoes");
  return { ok: true, mensagem: "Token revogado. O Claude Code deixa de acessar na próxima chamada." };
}
