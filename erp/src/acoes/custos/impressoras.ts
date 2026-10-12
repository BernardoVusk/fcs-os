"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoInteiro,
  campoValor,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";

const schema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  fabricante: textoOpcional(80),
  modelo: textoOpcional(80),
  custo_aquisicao: campoValor,
  valor_residual: campoValor,
  data_aquisicao: z.preprocess(
    (v) => (v === "" ? null : v),
    z.iso.date({ error: "data_invalida" }).nullable(),
  ),
  vida_util_horas: campoInteiro,
  potencia_media_w: campoValor,
  custo_manutencao_ano: campoValor,
  custo_consumiveis_ano: campoValor,
  horas_produtivas_ano: campoInteiro,
  status: z.enum(["ativa", "manutencao", "inativa"], { error: "tipo_invalido" }),
  observacoes: textoOpcional(2000),
});

const CAMPOS = [
  "id",
  "nome",
  "fabricante",
  "modelo",
  "custo_aquisicao",
  "valor_residual",
  "data_aquisicao",
  "vida_util_horas",
  "potencia_media_w",
  "custo_manutencao_ano",
  "custo_consumiveis_ano",
  "horas_produtivas_ano",
  "status",
  "observacoes",
] as const;

export async function salvarImpressora(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("producao");
  const campos = lerCampos(fd, CAMPOS);
  const r = schema.safeParse({ ...campos, status: campos.status || "ativa" });
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (
    d.custo_aquisicao != null &&
    d.valor_residual != null &&
    d.valor_residual > d.custo_aquisicao
  ) {
    return { erros: { valor_residual: "residual_maior_que_aquisicao" } };
  }
  if (d.vida_util_horas === 0) return { erros: { vida_util_horas: "impressora_sem_vida_util" } };
  if (d.horas_produtivas_ano === 0)
    return { erros: { horas_produtivas_ano: "impressora_sem_horas_ano" } };
  const linha = { ...d, valor_residual: d.valor_residual ?? 0 };
  const supabase = await clienteServidor();
  const { error } = campos.id
    ? await supabase.from("impressoras").update(linha).eq("id", campos.id)
    : await supabase.from("impressoras").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/producao/impressoras");
  revalidatePath("/catalogo/precificacao", "layout");
  return { erros: {}, ok: true, mensagem: "Impressora salva." };
}
