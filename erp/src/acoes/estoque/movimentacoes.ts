"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoValor,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";

const movimentacaoSchema = z.object({
  insumo_id: z.uuid({ error: "insumo_obrigatorio" }),
  lote_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  tipo: z.enum(["consumo_producao", "saida", "ajuste", "perda", "devolucao"], {
    error: "tipo_invalido",
  }),
  direcao: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["entrada", "saida"]).default("saida"),
  ),
  quantidade: campoValor,
  motivo: textoOpcional(300),
  justificativa: textoOpcional(500),
});

export async function registrarMovimentacao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("estoque");
  const campos = lerCampos(fd, [
    "insumo_id",
    "lote_id",
    "tipo",
    "direcao",
    "quantidade",
    "motivo",
    "justificativa",
    "permitir_negativo",
  ] as const);
  const r = movimentacaoSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (d.quantidade == null || d.quantidade <= 0)
    return { erros: { quantidade: "quantidade_invalida" } };
  if (d.tipo !== "ajuste" && !d.motivo) return { erros: { motivo: "motivo_obrigatorio" } };
  const permitirNegativo = campos.permitir_negativo === "sim" && d.tipo === "consumo_producao";
  if (permitirNegativo && !d.lote_id) return { erros: { lote_id: "lote_obrigatorio" } };
  if (permitirNegativo && !d.justificativa)
    return { erros: { justificativa: "justificativa_obrigatoria" } };
  const quantidade =
    d.tipo === "ajuste" && d.direcao === "entrada" ? d.quantidade : -Math.abs(d.quantidade);
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("movimentar_estoque", {
    p_insumo: d.insumo_id,
    p_lote: d.lote_id ?? undefined,
    p_tipo: d.tipo,
    p_quantidade: d.tipo === "ajuste" ? quantidade : Math.abs(quantidade),
    p_motivo: d.motivo ?? undefined,
    p_origem_tipo: "manual",
    p_permitir_negativo: permitirNegativo,
    p_justificativa: d.justificativa ?? undefined,
  });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  const resultado = data as { movimentacoes: string[]; alertas: string[] };
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
  const avisos = resultado.alertas ?? [];
  const mensagem = avisos.includes("estoque_negativo")
    ? "Movimentação registrada. O lote ficou negativo e um alerta foi aberto."
    : avisos.includes("lote_dividido")
      ? "Movimentação registrada. O lote em uso não bastou; o restante saiu do lote mais antigo."
      : "Movimentação registrada.";
  return { erros: {}, ok: true, mensagem };
}

export async function estornarMovimentacao(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("estoque");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("estornar_movimentacao", {
    p_movimentacao: id,
    p_motivo: "Estorno manual pela tela",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: "Movimentação estornada." };
}
