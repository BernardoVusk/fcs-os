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
import { chaveDoErro } from "@/lib/erros-pt";
import type { ParametrosCusto } from "@/dominio/custos/parametros";

const schema = z.object({
  vigente_desde: z.iso.date({ error: "vigencia_invalida" }),
  tarifa_kwh: campoValor,
  custo_hora_mao_obra: campoValor,
  taxa_falha_padrao: campoFracao,
  desperdicio_padrao: campoFracao,
  custo_fixo_mensal: campoValor,
  horas_produtivas_mes: campoValor,
  volume_mensal_estimado: campoInteiro,
  metodo_rateio_fixo: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["hora", "peca", "desligado"], { error: "tipo_invalido" }).nullable(),
  ),
  imposto_pct_estimado: campoFracao,
  metodo_margem_padrao: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["margem", "markup"], { error: "tipo_invalido" }).nullable(),
  ),
  margem_alvo_padrao: campoFracao,
  markup_padrao: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable(),
  ),
  observacoes: textoOpcional(1000),
});

const CAMPOS = [
  "vigente_desde",
  "tarifa_kwh",
  "custo_hora_mao_obra",
  "taxa_falha_padrao",
  "desperdicio_padrao",
  "custo_fixo_mensal",
  "horas_produtivas_mes",
  "volume_mensal_estimado",
  "metodo_rateio_fixo",
  "imposto_pct_estimado",
  "metodo_margem_padrao",
  "margem_alvo_padrao",
  "markup_padrao",
  "observacoes",
] as const;

/** Editar parâmetros é criar uma versão nova; cálculos antigos continuam apontando para a versão que usaram. */
export async function salvarVersaoParametros(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, CAMPOS);
  // Markup é digitado em por cento como os demais percentuais, mas pode passar de 100 %.
  const r = schema.safeParse({
    ...campos,
    markup_padrao: campos.markup_padrao
      ? String(Number(campos.markup_padrao.replace(/\./g, "").replace(",", ".")) / 100)
      : "",
  });
  if (!r.success) return errosDoZod(r.error);
  const { vigente_desde, observacoes, ...dados } = r.data;
  const parametros: ParametrosCusto = dados;
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("parametros_custo")
    .insert({ vigente_desde, observacoes, dados: parametros })
    .select("versao")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/configuracoes/parametros-custo");
  revalidatePath("/catalogo/precificacao", "layout");
  return { erros: {}, ok: true, mensagem: `Versão ${data.versao} dos parâmetros registrada.` };
}

export async function alternarComponente(id: string, ativo: boolean): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("componentes_custo").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/configuracoes/parametros-custo");
  revalidatePath("/catalogo/precificacao", "layout");
  return {
    ok: true,
    mensagem: ativo
      ? "Componente ligado."
      : "Componente desligado. Entra como zero nos próximos cálculos.",
  };
}
