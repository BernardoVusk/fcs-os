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
import { lerNumeroPt } from "@/lib/formatos/numero";
import { atualizarResumoCom } from "@/dados/vendas/pedidos";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());

const itemSchema = z.object({
  produto_id: z.uuid().nullable(),
  variacao_id: z.uuid().nullable(),
  titulo: z.string().max(200).nullable(),
  quantidade: z.number().int().min(1),
  preco_unitario: z.number().min(0),
  desconto: z.number().min(0).default(0),
});

const pedidoSchema = z.object({
  canal_id: z.uuid({ error: "canal_obrigatorio" }),
  codigo_externo: textoOpcional(80),
  cliente_id: uuidOuNulo,
  data_pedido: z.iso.date({ error: "data_invalida" }),
  descontos_vendedor: campoValor,
  frete_cobrado: campoValor,
  frete_pago: campoValor,
  comissao_pct: campoFracao,
  taxa_pagamento_pct: campoFracao,
  taxa_fixa_item: campoValor,
  taxas_canal_informadas: campoValor,
  taxas_pagamento_informadas: campoValor,
  observacoes: textoOpcional(2000),
  itens: z.array(itemSchema).min(1, { error: "pedido_sem_itens" }).max(100),
});

export async function salvarPedido(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("vendas");
  const c = lerCampos(fd, [
    "id",
    "canal_id",
    "codigo_externo",
    "cliente_id",
    "data_pedido",
    "descontos_vendedor",
    "frete_cobrado",
    "frete_pago",
    "comissao_pct",
    "taxa_pagamento_pct",
    "taxa_fixa_item",
    "taxas_canal_informadas",
    "taxas_pagamento_informadas",
    "observacoes",
    "itens",
  ] as const);
  let itens: unknown = [];
  try {
    itens = JSON.parse(c.itens || "[]");
  } catch {
    return { erros: { _form: "entradas_invalidas" } };
  }
  const r = pedidoSchema.safeParse({ ...c, itens });
  if (!r.success) return errosDoZod(r.error);
  const { itens: lista, ...cab } = r.data;
  const supabase = await clienteServidor();
  const cabecalho = {
    canal_id: cab.canal_id,
    codigo_externo: cab.codigo_externo,
    cliente_id: cab.cliente_id,
    data_pedido: cab.data_pedido,
    descontos_vendedor: cab.descontos_vendedor ?? 0,
    frete_cobrado: cab.frete_cobrado ?? 0,
    frete_pago: cab.frete_pago ?? 0,
    comissao_pct: cab.comissao_pct,
    taxa_pagamento_pct: cab.taxa_pagamento_pct,
    taxa_fixa_item: cab.taxa_fixa_item,
    taxas_canal_informadas: cab.taxas_canal_informadas,
    taxas_pagamento_informadas: cab.taxas_pagamento_informadas,
    observacoes: cab.observacoes,
  };
  let pedidoId = c.id;
  if (pedidoId) {
    const { data: atual } = await supabase
      .from("pedidos")
      .select("data_envio, status:pedidos_status(fechado)")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!atual) return { erros: { _form: "nao_encontrado" } };
    if ((atual.status as { fechado: boolean } | null)?.fechado || atual.data_envio)
      return { erros: { _form: "pedido_fechado" } };
    const { error } = await supabase.from("pedidos").update(cabecalho).eq("id", pedidoId);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    const { error: e2 } = await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);
    if (e2) return { erros: { _form: chaveDoErro(e2) } };
  } else {
    const { data: padrao } = await supabase
      .from("pedidos_status")
      .select("id")
      .eq("padrao", true)
      .maybeSingle();
    if (!padrao) return { erros: { _form: "status_invalido" } };
    const { data, error } = await supabase
      .from("pedidos")
      .insert({ ...cabecalho, status_id: padrao.id, origem: "manual" })
      .select("id, status_id")
      .single();
    if (error) return { erros: { _form: chaveDoErro(error) } };
    pedidoId = data.id;
    await supabase.from("pedidos_eventos").insert({
      pedido_id: pedidoId,
      de_status_id: null,
      para_status_id: data.status_id,
      origem: "manual",
      nota: "Pedido criado",
    });
  }
  const { error: e3 } = await supabase
    .from("pedidos_itens")
    .insert(lista.map((i, ordem) => ({ ...i, pedido_id: pedidoId, ordem })));
  if (e3) return { erros: { _form: chaveDoErro(e3) } };
  await atualizarResumoCom(supabase, pedidoId);
  revalidatePath("/vendas", "layout");
  revalidatePath("/");
  redirect(`/vendas/pedidos/${pedidoId}`);
}

export async function mudarStatusPedido(
  id: string,
  codigo: string,
  nota?: string,
): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("vendas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("mudar_status_pedido", {
    p_pedido: id,
    p_status_codigo: codigo,
    p_nota: nota,
    p_origem: "manual",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  await atualizarResumoCom(supabase, id);
  const r = data as { status: string; baixados: number; mudou: boolean };
  revalidatePath("/vendas", "layout");
  revalidatePath("/catalogo", "layout");
  revalidatePath("/");
  return {
    ok: true,
    mensagem:
      r.baixados > 0
        ? `Status alterado; ${r.baixados} peça(s) baixada(s) do estoque de prontas.`
        : "Status alterado.",
  };
}

export async function devolverPedido(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("vendas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("devolver_pedido", {
    p_pedido: id,
    p_nota: "Devolução registrada pela tela",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  await atualizarResumoCom(supabase, id);
  revalidatePath("/vendas", "layout");
  revalidatePath("/catalogo", "layout");
  return {
    ok: true,
    mensagem: `Devolução registrada: ${(data as { devolvidos: number }).devolvidos} peça(s) de volta ao estoque.`,
  };
}

/** Cria a ordem de produção de um item do pedido com a quantidade que falta em peças prontas. */
export async function criarOrdemDoItem(itemId: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("producao");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data: item } = await supabase
    .from("pedidos_itens")
    .select("*, pedido:pedidos(codigo, prazo:data_pedido)")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || !item.produto_id) return { ok: false, erro: "produto_obrigatorio" };
  const { data: produto } = await supabase
    .from("produtos")
    .select(
      "impressora_padrao_id, tempo_impressao_min, pecas_por_ciclo, custo_variavel_atual, calculo_atual_id",
    )
    .eq("id", item.produto_id)
    .single();
  const ciclos = Math.ceil(item.quantidade / (produto?.pecas_por_ciclo ?? 1));
  const { data, error } = await supabase
    .from("ordens_producao")
    .insert({
      produto_id: item.produto_id,
      variacao_id: item.variacao_id,
      pedido_item_id: item.id,
      impressora_id: produto?.impressora_padrao_id ?? null,
      quantidade_planejada: item.quantidade,
      tempo_previsto_min:
        produto?.tempo_impressao_min == null ? null : Number(produto.tempo_impressao_min) * ciclos,
      calculo_estimado_id: produto?.calculo_atual_id ?? null,
      custo_estimado:
        produto?.custo_variavel_atual == null
          ? null
          : Math.round(Number(produto.custo_variavel_atual) * item.quantidade * 10000) / 10000,
      instrucoes: `Pedido ${(item.pedido as { codigo: string } | null)?.codigo ?? ""}`,
    })
    .select("id, codigo")
    .single();
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/producao", "layout");
  revalidatePath("/vendas", "layout");
  return { ok: true, mensagem: `Ordem ${data.codigo} criada na fila.` };
}

const clienteSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(160, { error: "nome_longo" }),
  email: textoOpcional(160),
  telefone: textoOpcional(40),
  documento: textoOpcional(20),
  canal_origem_id: uuidOuNulo,
  observacoes: textoOpcional(2000),
  cidade: textoOpcional(80),
  uf: textoOpcional(2),
  cep: textoOpcional(10),
  logradouro: textoOpcional(200),
});

export async function salvarCliente(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("vendas");
  const c = lerCampos(fd, [
    "id",
    "nome",
    "email",
    "telefone",
    "documento",
    "canal_origem_id",
    "observacoes",
    "cidade",
    "uf",
    "cep",
    "logradouro",
  ] as const);
  const r = clienteSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const { cidade, uf, cep, logradouro, ...dados } = r.data;
  const linha = { ...dados, endereco: { cidade, uf, cep, logradouro } };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("clientes").update(linha).eq("id", c.id)
    : await supabase.from("clientes").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/vendas", "layout");
  return { erros: {}, ok: true, mensagem: "Cliente salvo." };
}

export async function anonimizarCliente(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("vendas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("anonimizar_cliente", { p_cliente: id });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/vendas", "layout");
  return { ok: true, mensagem: "Dados pessoais removidos; o histórico de pedidos continua." };
}

const statusSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(60),
  ordem: z.preprocess(
    (v) => lerNumeroPt(String(v ?? "")) ?? NaN,
    z.number().int({ error: "inteiro_invalido" }),
  ),
  cor: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, { error: "cor_invalida" })
      .nullable(),
  ),
});

/** Nome, ordem, cor e situação de um status; as flags estruturais ficam fixas pelos códigos (um só gera recebível, um só baixa estoque). */
export async function salvarStatusPedido(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const c = lerCampos(fd, ["id", "nome", "ordem", "cor", "ativo"] as const);
  const r = statusSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (!z.uuid().safeParse(c.id).success) return { erros: { _form: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const { data: atual } = await supabase
    .from("pedidos_status")
    .select("gera_recebivel, baixa_estoque, padrao")
    .eq("id", c.id)
    .maybeSingle();
  if (!atual) return { erros: { _form: "nao_encontrado" } };
  const ativo = c.ativo === "sim";
  if (!ativo && (atual.gera_recebivel || atual.baixa_estoque || atual.padrao))
    return { erros: { _form: "status_estrutural" } };
  const { error } = await supabase
    .from("pedidos_status")
    .update({ ...r.data, ativo })
    .eq("id", c.id);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/configuracoes/status-pedido");
  revalidatePath("/vendas", "layout");
  return { erros: {}, ok: true, mensagem: "Status salvo." };
}
