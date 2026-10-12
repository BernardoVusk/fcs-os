"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoInteiro,
  errosDoZod,
  lerCampos,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";

const ESCOPOS = ["produto", "insumo", "financeiro", "conhecimento", "planejamento"] as const;

const schema = z.object({
  escopo: z.enum(ESCOPOS, { error: "escopo_invalido" }),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  pai_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  cor: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, { error: "cor_invalida" })
      .nullable(),
  ),
  ordem: campoInteiro,
});

export async function salvarCategoria(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["id", "escopo", "nome", "pai_id", "cor", "ordem"] as const);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  if (campos.id && r.data.pai_id === campos.id) return { erros: { pai_id: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const linha = { ...r.data, ordem: r.data.ordem ?? 0 };
  const { error } = campos.id
    ? await supabase.from("categorias").update(linha).eq("id", campos.id)
    : await supabase.from("categorias").insert(linha);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/categorias");
  return { erros: {}, ok: true, mensagem: "Categoria salva." };
}

export async function alternarAtivoCategoria(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data } = await supabase.from("categorias").select("ativo").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  const { error } = await supabase.from("categorias").update({ ativo: !data.ativo }).eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/categorias");
  return { ok: true, mensagem: data.ativo ? "Categoria inativada." : "Categoria reativada." };
}
