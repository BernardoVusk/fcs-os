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
import { hojeSaoPaulo } from "@/lib/formatos/data";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());

export async function salvarConta(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, [
    "id",
    "nome",
    "tipo",
    "canal_id",
    "saldo_inicial",
    "saldo_inicial_em",
    "ativo",
    "observacoes",
  ] as const);
  const r = z
    .object({
      nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80),
      tipo: z.enum(["banco", "carteira", "saldo_marketplace", "cartao"], {
        error: "tipo_invalido",
      }),
      canal_id: uuidOuNulo,
      saldo_inicial: z.preprocess((v) => (v === "" ? "0" : v), campoValor),
      saldo_inicial_em: z.iso.date({ error: "data_invalida" }),
      observacoes: textoOpcional(1000),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const linha = {
    ...r.data,
    saldo_inicial: r.data.saldo_inicial ?? 0,
    ativo: c.id ? c.ativo === "sim" : true,
  };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("contas_financeiras").update(linha).eq("id", c.id)
    : await supabase.from("contas_financeiras").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/financeiro", "layout");
  return { erros: {}, ok: true, mensagem: "Conta salva." };
}

export async function salvarCategoriaFinanceira(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, [
    "id",
    "nome",
    "tipo",
    "natureza",
    "embutido_no_custo",
    "ordem",
    "ativo",
  ] as const);
  const r = z
    .object({
      nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80),
      tipo: z.enum(["receita", "despesa"], { error: "tipo_invalido" }),
      natureza: z.enum(["fixa", "variavel"], { error: "tipo_invalido" }),
      ordem: z.preprocess((v) => (v === "" ? "0" : v), campoInteiro),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const linha = {
    ...r.data,
    ordem: r.data.ordem ?? 0,
    embutido_no_custo: c.embutido_no_custo === "sim",
    ativo: c.id ? c.ativo === "sim" : true,
  };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("categorias_financeiras").update(linha).eq("id", c.id)
    : await supabase.from("categorias_financeiras").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/financeiro", "layout");
  return { erros: {}, ok: true, mensagem: "Categoria salva." };
}

export async function salvarTributo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, [
    "regime",
    "aliquota_efetiva_pct",
    "base",
    "dia_vencimento",
    "vigente_desde",
    "observacoes",
  ] as const);
  const r = z
    .object({
      regime: z.string().min(1, { error: "nome_obrigatorio" }).max(80),
      aliquota_efetiva_pct: campoFracao,
      base: z.enum(["faturamento_bruto", "receita_liquida"], { error: "tipo_invalido" }),
      dia_vencimento: campoInteiro,
      vigente_desde: z.iso.date({ error: "data_invalida" }),
      observacoes: textoOpcional(1000),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.aliquota_efetiva_pct == null)
    return { erros: { aliquota_efetiva_pct: "percentual_invalido" } };
  const dia = r.data.dia_vencimento ?? 20;
  if (dia < 1 || dia > 28) return { erros: { dia_vencimento: "dia_vencimento_invalido" } };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("parametros_tributarios")
    .insert({ ...r.data, aliquota_efetiva_pct: r.data.aliquota_efetiva_pct, dia_vencimento: dia });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/financeiro", "layout");
  return {
    erros: {},
    ok: true,
    mensagem: "Parâmetro tributário registrado. É estimativa: confira com o contador.",
  };
}

/**
 * Provisão do imposto de uma competência (AAAA-MM): base = soma da base de vendas (ou receita líquida) dos pedidos pagos
 * no mês x alíquota vigente. Um pagável por competência; recalcula enquanto planejado; realizado fica como pago.
 */
export async function provisionarImposto(competencia: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("financeiro");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!/^\d{4}-\d{2}$/.test(competencia)) return { ok: false, erro: "data_invalida" };
  const supabase = await clienteServidor();
  const { data: tributo } = await supabase
    .from("parametros_tributarios")
    .select("*")
    .lte("vigente_desde", `${competencia}-28`)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tributo) return { ok: false, erro: "tributo_nao_configurado" };
  const inicio = `${competencia}-01`;
  const [ano, mes] = competencia.split("-").map(Number);
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("resumo")
    .eq("status_pagamento", "pago")
    .gte("data_pagamento", inicio)
    .lte("data_pagamento", fim);
  const base = (pedidos ?? []).reduce((acc, p) => {
    const r = p.resumo as { base_vendas?: number; receita_liquida?: number | null } | null;
    const v =
      tributo.base === "receita_liquida" ? (r?.receita_liquida ?? 0) : (r?.base_vendas ?? 0);
    return acc + Number(v ?? 0);
  }, 0);
  const valor = Math.round(base * Number(tributo.aliquota_efetiva_pct) * 100) / 100;
  const vencimento = new Date(Date.UTC(ano, mes, Math.min(tributo.dia_vencimento, 28)))
    .toISOString()
    .slice(0, 10);
  const { data: provisao } = await supabase
    .from("provisoes_imposto")
    .select("*")
    .eq("competencia", inicio)
    .maybeSingle();
  let lancamentoId = provisao?.lancamento_id ?? null;
  if (lancamentoId) {
    const { data: situ } = await supabase
      .from("lancamentos_situacao")
      .select("estado")
      .eq("id", lancamentoId)
      .maybeSingle();
    if (situ?.estado === "planejado")
      await supabase
        .from("lancamentos")
        .update({ valor_previsto: Math.max(valor, 0.01), data_prevista: vencimento })
        .eq("id", lancamentoId);
  } else if (valor > 0) {
    const { data: categoria } = await supabase
      .from("categorias_financeiras")
      .select("id")
      .eq("tipo", "despesa")
      .eq("nome", "Impostos")
      .maybeSingle();
    const { data: prov } = provisao
      ? { data: provisao }
      : await supabase
          .from("provisoes_imposto")
          .insert({
            competencia: inicio,
            base_calculo: base,
            aliquota: tributo.aliquota_efetiva_pct,
            valor,
          })
          .select("*")
          .single();
    const { data: lanc, error } = await supabase
      .from("lancamentos")
      .insert({
        tipo: "despesa",
        descricao: `Imposto estimado ${competencia} (${tributo.regime})`,
        categoria_id: categoria?.id ?? null,
        valor_previsto: valor,
        competencia: inicio,
        data_prevista: vencimento,
        origem_tipo: "imposto",
        origem_id: prov!.id,
        papel_origem: "principal",
        observacoes: "Estimativa pela alíquota configurada; realize com o valor real da guia.",
      })
      .select("id")
      .single();
    if (error) return { ok: false, erro: chaveDoErro(error) };
    lancamentoId = lanc.id;
  }
  await supabase.from("provisoes_imposto").upsert(
    {
      competencia: inicio,
      base_calculo: Math.round(base * 100) / 100,
      aliquota: tributo.aliquota_efetiva_pct,
      valor,
      lancamento_id: lancamentoId,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "competencia" },
  );
  revalidatePath("/financeiro", "layout");
  return {
    ok: true,
    mensagem: `Provisão de ${competencia}: base ${base.toFixed(2)}, imposto estimado ${valor.toFixed(2)}.`,
  };
}

export async function provisionarMesAtual(): Promise<ResultadoAcao> {
  return provisionarImposto(hojeSaoPaulo().slice(0, 7));
}
