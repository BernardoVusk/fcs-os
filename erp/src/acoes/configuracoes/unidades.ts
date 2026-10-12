"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";
import { lerNumeroPt } from "@/lib/formatos/numero";

const schema = z.object({
  codigo: z.string().regex(/^[a-z]{1,6}$/, { error: "codigo_invalido" }),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(40, { error: "nome_longo" }),
  base: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^[a-z]{1,6}$/).nullable()),
  fator_para_base: z.preprocess(
    (v) => lerNumeroPt(String(v ?? "")) ?? Number.NaN,
    z.number({ error: "numero_invalido" }).positive({ error: "numero_invalido" }),
  ),
});

export async function salvarUnidade(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["editando", "codigo", "nome", "base", "fator_para_base"] as const);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.base === r.data.codigo) return { erros: { base: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const { error } =
    campos.editando === "sim"
      ? await supabase
          .from("unidades")
          .update({ nome: r.data.nome, base: r.data.base, fator_para_base: r.data.fator_para_base })
          .eq("codigo", r.data.codigo)
      : await supabase.from("unidades").insert(r.data);
  if (error) {
    const chave = error.code === "23505" ? "duplicado" : error.code === "23503" ? "nao_encontrado" : "erro_inesperado";
    return { erros: { _form: chave } };
  }
  revalidatePath("/configuracoes/unidades");
  return { erros: {}, ok: true, mensagem: "Unidade salva." };
}
