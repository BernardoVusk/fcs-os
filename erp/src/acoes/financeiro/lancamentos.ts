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
import { lerNumeroPt } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { ocorrencias } from "@/dominio/financeiro/recorrencia";
import { hojeSaoPaulo } from "@/lib/formatos/data";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());
const data = z.iso.date({ error: "data_invalida" });

const lancamentoSchema = z.object({
  tipo: z.enum(["receita", "despesa", "transferencia"], { error: "tipo_invalido" }),
  descricao: z
    .string()
    .min(1, { error: "descricao_obrigatoria" })
    .max(200, { error: "nome_longo" }),
  categoria_id: uuidOuNulo,
  centro_custo_id: uuidOuNulo,
  conta_id: uuidOuNulo,
  conta_destino_id: uuidOuNulo,
  valor_previsto: campoValor,
  data_prevista: data,
  competencia: z.preprocess((v) => (v === "" ? null : v), data.nullable()),
  forma_pagamento: textoOpcional(40),
  observacoes: textoOpcional(2000),
});

const todasPaths = [
  "id",
  "tipo",
  "descricao",
  "categoria_id",
  "centro_custo_id",
  "conta_id",
  "conta_destino_id",
  "valor_previsto",
  "data_prevista",
  "competencia",
  "forma_pagamento",
  "observacoes",
  "realizar_agora",
] as const;

export async function salvarLancamento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, todasPaths);
  const r = lancamentoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (d.valor_previsto == null || d.valor_previsto <= 0)
    return { erros: { valor_previsto: "valor_invalido" } };
  if (
    d.tipo === "transferencia" &&
    (!d.conta_id || !d.conta_destino_id || d.conta_id === d.conta_destino_id)
  )
    return { erros: { conta_destino_id: "transferencia_contas" } };
  const competencia = d.competencia ?? `${d.data_prevista.slice(0, 7)}-01`;
  const linha = {
    ...d,
    valor_previsto: d.valor_previsto,
    competencia,
    conta_destino_id: d.tipo === "transferencia" ? d.conta_destino_id : null,
  };
  const supabase = await clienteServidor();
  if (c.id) {
    const { data: atual } = await supabase
      .from("lancamentos_situacao")
      .select("estado")
      .eq("id", c.id)
      .maybeSingle();
    if (!atual || atual.estado !== "planejado")
      return { erros: { _form: "lancamento_nao_aberto" } };
    const { error } = await supabase.from("lancamentos").update(linha).eq("id", c.id);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    revalidatePath("/financeiro", "layout");
    return { erros: {}, ok: true, mensagem: "Lançamento salvo." };
  }
  const { data: novo, error } = await supabase
    .from("lancamentos")
    .insert({ ...linha, origem_tipo: "manual" })
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  if (c.realizar_agora === "sim") {
    if (!d.conta_id)
      return {
        erros: { conta_id: "conta_obrigatoria" },
        ok: true,
        mensagem: "Lançamento criado como planejado: escolha a conta para realizar.",
      };
    const { error: e2 } = await supabase.rpc("realizar_lancamento", {
      p_lancamento: novo.id,
      p_valor: d.valor_previsto,
      p_conta: d.conta_id,
      p_data: d.data_prevista,
    });
    if (e2)
      return {
        erros: { _form: chaveDoErro(e2) },
        ok: true,
        mensagem: "Lançamento criado, mas não foi possível realizar.",
      };
  }
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
  return {
    erros: {},
    ok: true,
    mensagem:
      c.realizar_agora === "sim" ? "Lançamento registrado e realizado." : "Lançamento planejado.",
    id: novo.id,
  };
}

const realizarSchema = z.object({
  lancamento_id: z.uuid(),
  valor: campoValor,
  conta_id: z.uuid({ error: "conta_obrigatoria" }),
  data: data,
  observacao: textoOpcional(300),
  encerrar: z.enum(["sim", ""]).optional(),
  motivo: textoOpcional(300),
});

export async function realizarLancamento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, [
    "lancamento_id",
    "valor",
    "conta_id",
    "data",
    "observacao",
    "encerrar",
    "motivo",
  ] as const);
  const r = realizarSchema.safeParse({ ...c, encerrar: c.encerrar || "" });
  if (!r.success) return errosDoZod(r.error);
  if (r.data.valor == null || r.data.valor <= 0) return { erros: { valor: "valor_invalido" } };
  const supabase = await clienteServidor();
  const { data: res, error } = await supabase.rpc("realizar_lancamento", {
    p_lancamento: r.data.lancamento_id,
    p_valor: r.data.valor,
    p_conta: r.data.conta_id,
    p_data: r.data.data,
    p_observacao: r.data.observacao ?? undefined,
    p_encerrar: r.data.encerrar === "sim",
    p_motivo: r.data.motivo ?? undefined,
  });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  const d = res as { realizado: number; restante: number };
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
  return {
    erros: {},
    ok: true,
    mensagem:
      d.restante > 0
        ? `Realizado ${formatarMoeda(r.data.valor)}; restam ${formatarMoeda(d.restante)}.`
        : "Lançamento realizado por completo.",
  };
}

export async function cancelarLancamento(id: string, motivo: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("financeiro");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("cancelar_lancamento", {
    p_lancamento: id,
    p_motivo: motivo || "Cancelado pela tela",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: "Lançamento cancelado." };
}

export async function estornarLancamento(id: string, motivo: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("financeiro");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("estornar_lancamento", {
    p_lancamento: id,
    p_motivo: motivo || "Estornado pela tela",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: "Estorno registrado como contra-lançamento." };
}

/** Materializa os lançamentos planejados das recorrências ativas para os próximos 3 meses (único por recorrência e competência). */
export async function gerarRecorrencias(): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("financeiro");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data: recorrencias } = await supabase.from("recorrencias").select("*").eq("ativo", true);
  const hoje = hojeSaoPaulo();
  let geradas = 0;
  for (const r of recorrencias ?? []) {
    const lista = ocorrencias(
      {
        frequencia: r.frequencia as "semanal" | "mensal" | "anual",
        dia: r.dia,
        inicio: r.inicio,
        fim: r.fim,
      },
      hoje,
      3,
    );
    for (const o of lista) {
      const { data: existente } = await supabase
        .from("lancamentos")
        .select("id, cancelado_em")
        .eq("recorrencia_id", r.id)
        .eq("competencia", `${o.competencia}-01`)
        .maybeSingle();
      if (existente) continue;
      const { error } = await supabase.from("lancamentos").insert({
        tipo: r.tipo,
        descricao: r.descricao,
        categoria_id: r.categoria_id,
        conta_id: r.conta_id,
        centro_custo_id: r.centro_custo_id,
        valor_previsto: r.valor,
        competencia: `${o.competencia}-01`,
        data_prevista: o.data_prevista,
        recorrencia_id: r.id,
        origem_tipo: "recorrencia",
        origem_id: r.id,
        papel_origem: o.competencia,
      });
      if (!error) geradas++;
    }
  }
  revalidatePath("/financeiro", "layout");
  return { ok: true, mensagem: `${geradas} lançamento(s) gerado(s) para os próximos 3 meses.` };
}

/** Atualiza o modelo da recorrência e replica para os lançamentos ainda planejados. */
export async function salvarRecorrencia(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("financeiro");
  const c = lerCampos(fd, [
    "id",
    "descricao",
    "tipo",
    "categoria_id",
    "conta_id",
    "valor",
    "frequencia",
    "dia",
    "inicio",
    "fim",
    "ativo",
    "observacoes",
  ] as const);
  const schema = z.object({
    descricao: z.string().min(1, { error: "descricao_obrigatoria" }).max(160),
    tipo: z.enum(["receita", "despesa"], { error: "tipo_invalido" }),
    categoria_id: uuidOuNulo,
    conta_id: uuidOuNulo,
    valor: campoValor,
    frequencia: z.enum(["semanal", "mensal", "anual"], { error: "tipo_invalido" }),
    dia: z.preprocess(
      (v) => (v === "" ? null : lerNumeroPt(String(v))),
      z.number().int().min(1).max(31).nullable(),
    ),
    inicio: data,
    fim: z.preprocess((v) => (v === "" ? null : v), data.nullable()),
    observacoes: textoOpcional(1000),
  });
  const r = schema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.valor == null || r.data.valor <= 0) return { erros: { valor: "valor_invalido" } };
  const linha = { ...r.data, valor: r.data.valor, ativo: c.id ? c.ativo === "sim" : true };
  const supabase = await clienteServidor();
  if (c.id) {
    const { error } = await supabase.from("recorrencias").update(linha).eq("id", c.id);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    await supabase
      .from("lancamentos")
      .update({
        descricao: linha.descricao,
        valor_previsto: linha.valor,
        categoria_id: linha.categoria_id,
        conta_id: linha.conta_id,
      })
      .eq("recorrencia_id", c.id)
      .is("cancelado_em", null)
      .is("estornado_em", null)
      .is("encerrado_em", null)
      .not("id", "in", `(select lancamento_id from lancamentos_realizacoes)`);
  } else {
    const { error } = await supabase.from("recorrencias").insert(linha);
    if (error) return { erros: { _form: chaveDoErro(error) } };
  }
  revalidatePath("/financeiro", "layout");
  return {
    erros: {},
    ok: true,
    mensagem: "Recorrência salva. Use Gerar para materializar os próximos meses.",
  };
}
