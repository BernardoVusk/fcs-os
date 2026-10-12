"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoFracao,
  campoInteiro,
  campoValor,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { TIPOS_CANAL } from "@/dominio/configuracao/canais";

const canalSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  tipo: z.enum(TIPOS_CANAL, { error: "tipo_invalido" }),
  observacoes: textoOpcional(2000),
});

export async function salvarCanal(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["id", "nome", "tipo", "observacoes", "ativo"] as const);
  const r = canalSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const linha = { ...r.data, ativo: campos.id ? campos.ativo === "sim" : true };
  const { error } = campos.id
    ? await supabase.from("canais_venda").update(linha).eq("id", campos.id)
    : await supabase.from("canais_venda").insert(linha);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/canais", "layout");
  revalidatePath("/");
  return { erros: {}, ok: true, mensagem: "Canal salvo." };
}

const taxasSchema = z.object({
  canal_id: z.uuid(),
  vigente_desde: z.iso.date({ error: "data_invalida" }),
  comissao_pct: campoFracao,
  taxa_fixa_item: campoValor,
  taxa_pagamento_pct: campoFracao,
  ads_pct_padrao: campoFracao,
  frete_subsidio_padrao: campoValor,
  dias_repasse: campoInteiro,
  observacoes: textoOpcional(1000),
});

export async function salvarTaxas(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, [
    "canal_id",
    "vigente_desde",
    "comissao_pct",
    "taxa_fixa_item",
    "taxa_pagamento_pct",
    "ads_pct_padrao",
    "frete_subsidio_padrao",
    "dias_repasse",
    "observacoes",
  ] as const);
  const r = taxasSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.from("canais_venda_taxas").insert(r.data);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/canais", "layout");
  revalidatePath("/");
  return { erros: {}, ok: true, mensagem: "Vigência de taxas registrada." };
}

export async function excluirTaxas(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("canais_venda_taxas").delete().eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/canais", "layout");
  return { ok: true, mensagem: "Vigência removida." };
}
