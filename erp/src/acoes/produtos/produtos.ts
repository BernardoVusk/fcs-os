"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoFracao,
  campoValor,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { PAPEIS_BOM } from "@/dominio/produtos/bom";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());
const sku = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .regex(/^[A-Za-z0-9._-]{1,40}$/, { error: "sku_invalido" })
    .nullable(),
);
const inteiroMin1 = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))),
  z.number().int().min(1, { error: "inteiro_invalido" }).nullable(),
);

const produtoSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(160, { error: "nome_longo" }),
  sku,
  descricao: textoOpcional(4000),
  categoria_id: uuidOuNulo,
  status: z.enum(["rascunho", "ativo", "pausado", "descontinuado"], { error: "tipo_invalido" }),
  peso_g: campoValor,
  tempo_impressao_min: campoValor,
  pecas_por_ciclo: inteiroMin1,
  taxa_falha_pct: campoFracao,
  tempo_preparo_min: campoValor,
  tempo_acabamento_min: campoValor,
  tempo_embalagem_min: campoValor,
  insumo_impressao_id: uuidOuNulo,
  impressora_padrao_id: uuidOuNulo,
  margem_alvo: campoFracao,
  observacoes_fabricacao: textoOpcional(4000),
  licenca: textoOpcional(200),
  cor: textoOpcional(40),
  material: textoOpcional(40),
  tamanho: textoOpcional(40),
  acabamento: textoOpcional(80),
});

const CAMPOS_PRODUTO = [
  "id",
  "nome",
  "sku",
  "descricao",
  "categoria_id",
  "status",
  "peso_g",
  "tempo_impressao_min",
  "pecas_por_ciclo",
  "taxa_falha_pct",
  "tempo_preparo_min",
  "tempo_acabamento_min",
  "tempo_embalagem_min",
  "insumo_impressao_id",
  "impressora_padrao_id",
  "margem_alvo",
  "observacoes_fabricacao",
  "licenca",
  "licenca_comercial",
  "cor",
  "material",
  "tamanho",
  "acabamento",
] as const;

export async function salvarProduto(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const c = lerCampos(fd, CAMPOS_PRODUTO);
  const r = produtoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const { cor, material, tamanho, acabamento, ...d } = r.data;
  const linha = {
    ...d,
    pecas_por_ciclo: d.pecas_por_ciclo ?? 1,
    licenca_comercial: c.licenca_comercial === "sim",
    atributos: { cor, material, tamanho, acabamento },
  };
  const supabase = await clienteServidor();
  if (c.id) {
    const { error } = await supabase.from("produtos").update(linha).eq("id", c.id);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    revalidatePath("/catalogo", "layout");
    return {
      erros: {},
      ok: true,
      mensagem: "Produto salvo. Recalcule o custo se mudou peso, tempo ou material.",
      id: c.id,
    };
  }
  const { data, error } = await supabase.from("produtos").insert(linha).select("id").single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/catalogo", "layout");
  redirect(`/catalogo/produtos/${data.id}`);
}

const variacaoSchema = z.object({
  produto_id: z.uuid(),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  sku,
  peso_g: campoValor,
  tempo_impressao_min: campoValor,
  pecas_por_ciclo: inteiroMin1,
  taxa_falha_pct: campoFracao,
  tempo_preparo_min: campoValor,
  tempo_acabamento_min: campoValor,
  tempo_embalagem_min: campoValor,
  insumo_impressao_id: uuidOuNulo,
  impressora_padrao_id: uuidOuNulo,
  cor: textoOpcional(40),
  material: textoOpcional(40),
  tamanho: textoOpcional(40),
  acabamento: textoOpcional(80),
});

export async function salvarVariacao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const c = lerCampos(fd, [
    "id",
    "ativo",
    "produto_id",
    "nome",
    "sku",
    "peso_g",
    "tempo_impressao_min",
    "pecas_por_ciclo",
    "taxa_falha_pct",
    "tempo_preparo_min",
    "tempo_acabamento_min",
    "tempo_embalagem_min",
    "insumo_impressao_id",
    "impressora_padrao_id",
    "cor",
    "material",
    "tamanho",
    "acabamento",
  ] as const);
  const r = variacaoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const { cor, material, tamanho, acabamento, ...d } = r.data;
  const atributos = Object.fromEntries(
    Object.entries({ cor, material, tamanho, acabamento }).filter(([, v]) => v != null),
  );
  const linha = { ...d, atributos, ativo: c.id ? c.ativo === "sim" : true };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("produtos_variacoes").update(linha).eq("id", c.id)
    : await supabase.from("produtos_variacoes").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(`/catalogo/produtos/${d.produto_id}`);
  return { erros: {}, ok: true, mensagem: "Variação salva." };
}

const materialSchema = z.object({
  produto_id: z.uuid(),
  variacao_id: uuidOuNulo,
  insumo_id: z.uuid({ error: "insumo_obrigatorio" }),
  quantidade: campoValor,
  unidade: z.string().regex(/^[a-z]{1,6}$/, { error: "unidade_invalida" }),
  papel: z.enum(PAPEIS_BOM, { error: "papel_invalido" }),
  por: z.enum(["peca", "pedido"], { error: "tipo_invalido" }),
  observacoes: textoOpcional(300),
});

export async function salvarMaterial(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const c = lerCampos(fd, [
    "id",
    "produto_id",
    "variacao_id",
    "insumo_id",
    "quantidade",
    "unidade",
    "papel",
    "por",
    "observacoes",
  ] as const);
  const r = materialSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.quantidade == null || r.data.quantidade <= 0)
    return { erros: { quantidade: "quantidade_invalida" } };
  const linha = { ...r.data, quantidade: r.data.quantidade };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("produtos_materiais").update(linha).eq("id", c.id)
    : await supabase.from("produtos_materiais").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  await marcarCustoDesatualizado(r.data.produto_id);
  revalidatePath(`/catalogo/produtos/${r.data.produto_id}`);
  return { erros: {}, ok: true, mensagem: "Material salvo." };
}

export async function removerMaterial(id: string, produtoId: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("produtos_materiais").delete().eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  await marcarCustoDesatualizado(produtoId);
  revalidatePath(`/catalogo/produtos/${produtoId}`);
  return { ok: true, mensagem: "Material removido." };
}

const precoSchema = z.object({
  produto_id: z.uuid(),
  variacao_id: uuidOuNulo,
  canal_id: z.uuid({ error: "canal_obrigatorio" }),
  preco_venda: campoValor,
  vigente_desde: z.iso.date({ error: "data_invalida" }),
  vigente_ate: z.preprocess(
    (v) => (v === "" ? null : v),
    z.iso.date({ error: "data_invalida" }).nullable(),
  ),
  observacoes: textoOpcional(300),
});

export async function salvarPreco(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const c = lerCampos(fd, [
    "produto_id",
    "variacao_id",
    "canal_id",
    "preco_venda",
    "vigente_desde",
    "vigente_ate",
    "observacoes",
  ] as const);
  const r = precoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.preco_venda == null) return { erros: { preco_venda: "preco_obrigatorio" } };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("produtos_precos_canal")
    .insert({ ...r.data, preco_venda: r.data.preco_venda });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(`/catalogo/produtos/${r.data.produto_id}`);
  revalidatePath("/catalogo/produtos");
  return { erros: {}, ok: true, mensagem: "Preço registrado." };
}

export async function encerrarPreco(id: string, produtoId: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("produtos_precos_canal")
    .update({ vigente_ate: hoje })
    .eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(`/catalogo/produtos/${produtoId}`);
  return { ok: true, mensagem: "Vigência encerrada hoje." };
}

export async function alterarStatusProduto(
  id: string,
  status: "rascunho" | "ativo" | "pausado" | "descontinuado",
): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("produtos").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/catalogo", "layout");
  return { ok: true, mensagem: "Situação alterada." };
}

/** Marca o custo como desatualizado (sem apagar o cálculo salvo) quando a ficha ou a BOM mudam. */
async function marcarCustoDesatualizado(produtoId: string) {
  const supabase = await clienteServidor();
  await supabase
    .from("produtos")
    .update({ custo_atualizado_em: null })
    .eq("id", produtoId)
    .not("custo_atual", "is", null);
}
