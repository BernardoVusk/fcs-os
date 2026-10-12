"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { lerNumeroPt } from "@/lib/formatos/numero";

const numero = (min: number, chave: string) =>
  z.number({ error: chave }).min(min, { error: chave }).finite();

const itemSchema = z.object({
  insumo_id: z.uuid({ error: "insumo_obrigatorio" }),
  quantidade: z.number({ error: "quantidade_invalida" }).gt(0, { error: "quantidade_invalida" }),
  unidade: z.string().regex(/^[a-z]{1,6}$/, { error: "unidade_invalida" }),
  preco_unitario: numero(0, "preco_invalido"),
  desconto_item: numero(0, "numero_invalido").default(0),
  peso_util_g: z.number().gt(0).nullable().default(null),
  lote_codigo: z.string().max(40).nullable().default(null),
});

const compraSchema = z.object({
  fornecedor_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  data: z.iso.date({ error: "data_invalida" }),
  numero_documento: textoOpcional(60),
  frete: numero(0, "numero_invalido"),
  desconto_total: numero(0, "numero_invalido"),
  outros_custos: numero(0, "numero_invalido"),
  preco_inclui_frete: z.boolean(),
  metodo_rateio: z.enum(["valor", "quantidade"], { error: "tipo_invalido" }),
  observacoes: textoOpcional(2000),
  itens: z.array(itemSchema).min(1, { error: "compra_sem_itens" }).max(100),
});

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** O formulário envia o cabeçalho em campos e os itens em um JSON (números já normalizados no cliente). */
export async function salvarCompra(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("estoque");
  const c = lerCampos(fd, [
    "id",
    "fornecedor_id",
    "data",
    "numero_documento",
    "frete",
    "desconto_total",
    "outros_custos",
    "preco_inclui_frete",
    "metodo_rateio",
    "observacoes",
    "itens",
  ] as const);
  const r = compraSchema.safeParse({
    ...c,
    frete: lerNumeroPt(c.frete) ?? 0,
    desconto_total: lerNumeroPt(c.desconto_total) ?? 0,
    outros_custos: lerNumeroPt(c.outros_custos) ?? 0,
    preco_inclui_frete: c.preco_inclui_frete === "sim",
    itens: lerJson(c.itens) ?? [],
  });
  if (!r.success) return errosDoZod(r.error);
  const { itens, ...cabecalho } = r.data;
  const supabase = await clienteServidor();
  let compraId = c.id;
  if (compraId) {
    const { data: atual } = await supabase
      .from("compras")
      .select("status")
      .eq("id", compraId)
      .maybeSingle();
    if (!atual) return { erros: { _form: "nao_encontrado" } };
    if (atual.status !== "rascunho") return { erros: { _form: "compra_nao_rascunho" } };
    const { error } = await supabase.from("compras").update(cabecalho).eq("id", compraId);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    const { error: e2 } = await supabase.from("compras_itens").delete().eq("compra_id", compraId);
    if (e2) return { erros: { _form: chaveDoErro(e2) } };
  } else {
    const { data, error } = await supabase.from("compras").insert(cabecalho).select("id").single();
    if (error) return { erros: { _form: chaveDoErro(error) } };
    compraId = data.id;
  }
  const { error: e3 } = await supabase
    .from("compras_itens")
    .insert(itens.map((i, ordem) => ({ ...i, compra_id: compraId, ordem })));
  if (e3) return { erros: { _form: chaveDoErro(e3) } };
  revalidatePath("/estoque/compras", "layout");
  redirect(`/estoque/compras/${compraId}`);
}

export async function confirmarCompra(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("estoque");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("confirmar_compra", { p_compra: id });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  const r = data as { itens: number; lotes: number };
  // Custo de reposição mudou: produtos que usam esses insumos ficam marcados para recálculo (Fase 5).
  const { data: itens } = await supabase
    .from("compras_itens")
    .select("insumo_id")
    .eq("compra_id", id);
  const insumos = [...new Set((itens ?? []).map((i) => i.insumo_id))];
  if (insumos.length > 0) {
    const { data: usados } = await supabase
      .from("produtos_materiais")
      .select("produto_id")
      .in("insumo_id", insumos);
    const produtoIds = [...new Set((usados ?? []).map((m) => m.produto_id))];
    await supabase
      .from("produtos")
      .update({ custo_atualizado_em: null })
      .in("insumo_impressao_id", insumos)
      .not("custo_atual", "is", null);
    if (produtoIds.length > 0)
      await supabase
        .from("produtos")
        .update({ custo_atualizado_em: null })
        .in("id", produtoIds)
        .not("custo_atual", "is", null);
  }
  revalidatePath("/catalogo", "layout");
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: `Compra confirmada: ${r.lotes} lote(s) criado(s).` };
}

export async function cancelarCompra(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("estoque");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("compras")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("status", "rascunho")
    .select("id");
  if (error) return { ok: false, erro: chaveDoErro(error) };
  if (!data || data.length === 0) return { ok: false, erro: "compra_ja_confirmada" };
  revalidatePath("/estoque/compras", "layout");
  return { ok: true, mensagem: "Compra cancelada." };
}
