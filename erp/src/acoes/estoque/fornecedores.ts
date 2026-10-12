"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { campoInteiro, errosDoZod, lerCampos, textoOpcional, type EstadoForm } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";

const fornecedorSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(120, { error: "nome_longo" }),
  contato: textoOpcional(200),
  site: textoOpcional(200),
  prazo_medio_dias: campoInteiro,
  observacoes: textoOpcional(2000),
});

export async function salvarFornecedor(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("estoque");
  const campos = lerCampos(fd, [
    "id",
    "ativo",
    "nome",
    "contato",
    "site",
    "prazo_medio_dias",
    "observacoes",
  ] as const);
  const r = fornecedorSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const linha = { ...r.data, ativo: campos.id ? campos.ativo === "sim" : true };
  const supabase = await clienteServidor();
  const { error } = campos.id
    ? await supabase.from("fornecedores").update(linha).eq("id", campos.id)
    : await supabase.from("fornecedores").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/estoque/fornecedores");
  revalidatePath("/estoque/compras", "layout");
  return { erros: {}, ok: true, mensagem: "Fornecedor salvo." };
}
