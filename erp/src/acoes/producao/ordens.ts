"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { lerNumeroPt } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { ESTADOS_ORDEM, podeTransitar, type EstadoOrdem } from "@/dominio/producao/custo-realizado";
import { fichaEfetiva } from "@/dominio/produtos/heranca";
import { contextoProdutoCom } from "@/dados/produtos/calculo";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());

const ordemSchema = z.object({
  produto_id: z.uuid({ error: "produto_obrigatorio" }),
  variacao_id: uuidOuNulo,
  quantidade_planejada: campoInteiro,
  impressora_id: uuidOuNulo,
  lote_id: uuidOuNulo,
  prazo: z.preprocess(
    (v) => (v === "" ? null : v),
    z.iso.date({ error: "data_invalida" }).nullable(),
  ),
  prioridade: campoInteiro,
  instrucoes: textoOpcional(2000),
  responsavel: textoOpcional(80),
});

export async function criarOrdem(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("producao");
  const c = lerCampos(fd, [
    "produto_id",
    "variacao_id",
    "quantidade_planejada",
    "impressora_id",
    "lote_id",
    "prazo",
    "prioridade",
    "instrucoes",
    "responsavel",
  ] as const);
  const r = ordemSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (!d.quantidade_planejada || d.quantidade_planejada < 1)
    return { erros: { quantidade_planejada: "quantidade_invalida" } };
  const supabase = await clienteServidor();
  const { data: produto } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", d.produto_id)
    .maybeSingle();
  if (!produto) return { erros: { produto_id: "nao_encontrado" } };
  const variacao = d.variacao_id
    ? (await supabase.from("produtos_variacoes").select("*").eq("id", d.variacao_id).maybeSingle())
        .data
    : null;
  const ficha = fichaEfetiva(
    { ...produto, atributos: {} },
    variacao ? { ...variacao, atributos: null } : null,
  );
  const ciclos = Math.ceil(d.quantidade_planejada / (ficha.pecas_por_ciclo ?? 1));
  const tempoPrevisto =
    ficha.tempo_impressao_min == null ? null : Number(ficha.tempo_impressao_min) * ciclos;
  const custoUnit = variacao?.custo_variavel_atual ?? produto.custo_variavel_atual;
  const linha = {
    produto_id: d.produto_id,
    variacao_id: d.variacao_id,
    quantidade_planejada: d.quantidade_planejada,
    impressora_id: d.impressora_id ?? ficha.impressora_padrao_id,
    lote_id: d.lote_id,
    prazo: d.prazo,
    prioridade: d.prioridade ?? 0,
    instrucoes: d.instrucoes,
    responsavel: d.responsavel,
    tempo_previsto_min: tempoPrevisto,
    calculo_estimado_id: variacao?.calculo_atual_id ?? produto.calculo_atual_id,
    custo_estimado:
      custoUnit == null
        ? null
        : Math.round(Number(custoUnit) * d.quantidade_planejada * 10000) / 10000,
  };
  const { data, error } = await supabase
    .from("ordens_producao")
    .insert(linha)
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/producao", "layout");
  revalidatePath("/");
  redirect(`/producao/ordens/${data.id}`);
}

export async function mudarEstadoOrdem(id: string, para: EstadoOrdem): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("producao");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!ESTADOS_ORDEM.includes(para) || para === "concluida")
    return { ok: false, erro: "transicao_invalida" };
  const supabase = await clienteServidor();
  const { data: atual } = await supabase
    .from("ordens_producao")
    .select("status, inicio_real")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return { ok: false, erro: "ordem_nao_encontrada" };
  if (atual.status === "concluida" || !podeTransitar(atual.status as EstadoOrdem, para))
    return { ok: false, erro: "transicao_invalida" };
  const mudanca: { status: EstadoOrdem; inicio_real?: string } = { status: para };
  if (para === "imprimindo" && !atual.inicio_real) mudanca.inicio_real = new Date().toISOString();
  const { error } = await supabase.from("ordens_producao").update(mudanca).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/producao", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: "Ordem atualizada." };
}

const consumoSchema = z.array(
  z.object({
    insumo_id: z.uuid(),
    lote_id: z.uuid().nullable(),
    quantidade: z.number().min(0),
    quantidade_prevista: z.number().nullable().optional(),
  }),
);

export async function concluirOrdem(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("producao");
  const c = lerCampos(fd, [
    "ordem_id",
    "quantidade_aprovada",
    "quantidade_perdida",
    "tempo_real_min",
    "minutos_mao_de_obra",
    "consumos",
    "motivo_falha",
    "permitir_negativo",
    "justificativa",
  ] as const);
  if (!z.uuid().safeParse(c.ordem_id).success) return { erros: { _form: "ordem_nao_encontrada" } };
  const aprovadas = lerNumeroPt(c.quantidade_aprovada);
  const perdidas = lerNumeroPt(c.quantidade_perdida) ?? 0;
  if (aprovadas == null || aprovadas < 0 || !Number.isInteger(aprovadas))
    return { erros: { quantidade_aprovada: "inteiro_invalido" } };
  if (!Number.isInteger(perdidas) || perdidas < 0)
    return { erros: { quantidade_perdida: "inteiro_invalido" } };
  if (aprovadas + perdidas === 0) return { erros: { _form: "ordem_sem_pecas" } };
  if (perdidas > 0 && !c.motivo_falha) return { erros: { motivo_falha: "motivo_obrigatorio" } };
  let consumos: z.infer<typeof consumoSchema>;
  try {
    const r = consumoSchema.safeParse(JSON.parse(c.consumos || "[]"));
    if (!r.success) return { erros: { _form: "entradas_invalidas" } };
    consumos = r.data;
  } catch {
    return { erros: { _form: "entradas_invalidas" } };
  }
  const permitirNegativo = c.permitir_negativo === "sim";
  if (permitirNegativo && !c.justificativa)
    return { erros: { justificativa: "justificativa_obrigatoria" } };
  const supabase = await clienteServidor();
  const { data: ordem } = await supabase
    .from("ordens_producao")
    .select("id, produto_id, variacao_id, status")
    .eq("id", c.ordem_id)
    .maybeSingle();
  if (!ordem) return { erros: { _form: "ordem_nao_encontrada" } };
  const ctx = await contextoProdutoCom(supabase, ordem.produto_id, ordem.variacao_id);
  const custoHoraMao = ctx?.parametros?.dados.custo_hora_mao_obra ?? 0;
  const { data, error } = await supabase.rpc("concluir_ordem_producao", {
    p_ordem: c.ordem_id,
    p_aprovadas: aprovadas,
    p_perdidas: perdidas,
    p_tempo_real_min: lerNumeroPt(c.tempo_real_min) ?? 0,
    p_minutos_mao_de_obra: lerNumeroPt(c.minutos_mao_de_obra) ?? 0,
    p_consumos: consumos,
    p_custo_hora_mao_obra: custoHoraMao,
    // Complementares saem do estoque pelas linhas de consumo; não entram de novo por peça.
    p_complementares_por_peca: 0,
    p_motivo_falha: c.motivo_falha || undefined,
    p_permitir_negativo: permitirNegativo,
    p_justificativa: c.justificativa || undefined,
  });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  const detalhe = data as { total: number; avisos: string[] };
  revalidatePath("/producao", "layout");
  revalidatePath("/estoque", "layout");
  revalidatePath(`/catalogo/produtos/${ordem.produto_id}`);
  revalidatePath("/");
  const avisos = (detalhe.avisos ?? []).filter(Boolean);
  return {
    erros: {},
    ok: true,
    mensagem: `Ordem concluída. Custo realizado ${formatarMoeda(detalhe.total)}.${avisos.length ? ` Avisos: ${avisos.join(", ")}.` : ""}`,
  };
}

export async function reabrirOrdem(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("producao");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("reabrir_ordem_producao", {
    p_ordem: id,
    p_motivo: "Reaberta pela tela",
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/producao", "layout");
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: "Ordem reaberta: consumo e peças prontas estornados." };
}

const manutencaoSchema = z.object({
  impressora_id: z.uuid(),
  tipo: z.enum(["preventiva", "corretiva"], { error: "tipo_invalido" }),
  data: z.iso.date({ error: "data_invalida" }),
  custo: campoValor,
  descricao: z.string().min(1, { error: "motivo_obrigatorio" }).max(500),
  horas_no_momento: campoValor,
  proxima_em_horas: campoValor,
});

export async function salvarManutencao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("producao");
  const c = lerCampos(fd, [
    "impressora_id",
    "tipo",
    "data",
    "custo",
    "descricao",
    "horas_no_momento",
    "proxima_em_horas",
  ] as const);
  const r = manutencaoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("manutencoes")
    .insert({ ...r.data, custo: r.data.custo ?? 0 });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(`/producao/impressoras/${r.data.impressora_id}`);
  return { erros: {}, ok: true, mensagem: "Manutenção registrada." };
}
