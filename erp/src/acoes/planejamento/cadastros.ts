"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoInteiro,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { statusPadraoCom } from "@/dados/planejamento/planejamento";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { ocorrencias } from "@/dominio/financeiro/recorrencia";
import { somarDias } from "@/dominio/planejamento/calendario";
import {
  CANAIS_PUBLICACAO,
  checklistDeTexto,
  checklistInicial,
  FORMATOS,
  lerCamposModelo,
  lerChecklist,
  lerTags,
  PRIORIDADES,
  TIPOS_ITEM,
} from "@/dominio/planejamento/tipos";

const dataOuNula = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "data_invalida" })
    .nullable(),
);
const enumOuNulo = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.preprocess((v) => (v === "" ? null : v), z.enum(valores).nullable());

function revalidar() {
  revalidatePath("/planejamento", "layout");
  revalidatePath("/");
}

export async function salvarCampanha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("planejamento");
  const c = lerCampos(fd, [
    "id",
    "nome",
    "inicio",
    "fim",
    "objetivo",
    "status",
    "observacoes",
  ] as const);
  const r = z
    .object({
      nome: z.string().trim().min(1, { error: "nome_obrigatorio" }).max(120),
      inicio: dataOuNula,
      fim: dataOuNula,
      objetivo: textoOpcional(1000),
      status: z.preprocess(
        (v) => (v === "" ? "planejada" : v),
        z.enum(["planejada", "ativa", "concluida", "cancelada"]),
      ),
      observacoes: textoOpcional(2000),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.inicio && r.data.fim && r.data.fim < r.data.inicio)
    return { erros: { fim: "prazo_antes_do_inicio" } };
  const linha = {
    ...r.data,
    objetivo: r.data.objetivo ?? null,
    observacoes: r.data.observacoes ?? null,
  };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("plan_campanhas").update(linha).eq("id", c.id)
    : await supabase.from("plan_campanhas").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar();
  return { erros: {}, ok: true, mensagem: "Campanha salva." };
}

export async function salvarModelo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("planejamento");
  const c = lerCampos(fd, [
    "id",
    "nome",
    "tipo",
    "titulo",
    "prioridade",
    "canal_publicacao",
    "formato",
    "briefing",
    "cta",
    "legenda",
    "tags",
    "responsavel",
    "checklist",
    "ativo",
  ] as const);
  const r = z
    .object({
      nome: z.string().trim().min(1, { error: "nome_obrigatorio" }).max(120),
      tipo: z.enum(TIPOS_ITEM, { error: "tipo_invalido" }),
      titulo: textoOpcional(160),
      prioridade: enumOuNulo(PRIORIDADES),
      canal_publicacao: enumOuNulo(CANAIS_PUBLICACAO),
      formato: enumOuNulo(FORMATOS),
      briefing: textoOpcional(4000),
      cta: textoOpcional(300),
      legenda: textoOpcional(3000),
      responsavel: textoOpcional(80),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  const campos_padrao = lerCamposModelo({
    titulo: d.titulo,
    prioridade: d.prioridade,
    canal_publicacao: d.canal_publicacao,
    formato: d.formato,
    briefing: d.briefing,
    cta: d.cta,
    legenda: d.legenda,
    responsavel: d.responsavel,
    tags: lerTags(c.tags),
  });
  const checklist_padrao = c.checklist.trim()
    ? checklistDeTexto(c.checklist)
    : checklistInicial(d.formato);
  const linha = {
    nome: d.nome,
    tipo: d.tipo,
    campos_padrao,
    checklist_padrao,
    ativo: c.id ? c.ativo === "sim" : true,
  };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("plan_modelos").update(linha).eq("id", c.id)
    : await supabase.from("plan_modelos").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar();
  return { erros: {}, ok: true, mensagem: "Modelo salvo." };
}

export async function salvarRecorrenciaPlano(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("planejamento");
  const c = lerCampos(fd, [
    "id",
    "modelo_id",
    "frequencia",
    "dia",
    "inicio",
    "fim",
    "ativo",
    "observacoes",
  ] as const);
  const r = z
    .object({
      modelo_id: z.uuid({ error: "modelo_obrigatorio" }),
      frequencia: z.enum(["semanal", "mensal", "anual"], { error: "tipo_invalido" }),
      dia: z.preprocess((v) => (v === "" ? null : v), campoInteiro.nullable()),
      inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "data_invalida" }),
      fim: dataOuNula,
      observacoes: textoOpcional(500),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (d.dia != null && (d.dia < 0 || d.dia > 31)) return { erros: { dia: "valor_invalido" } };
  const linha = {
    ...d,
    observacoes: d.observacoes ?? null,
    ativo: c.id ? c.ativo === "sim" : true,
  };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("plan_recorrencias").update(linha).eq("id", c.id)
    : await supabase.from("plan_recorrencias").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar();
  return {
    erros: {},
    ok: true,
    mensagem: "Recorrência salva. Use Gerar para criar os itens dos próximos 60 dias.",
  };
}

/** Gera os itens das recorrências ativas até 60 dias à frente, um por (recorrência, prazo). */
export async function gerarRecorrenciasPlano(): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data: recorrencias } = await supabase
    .from("plan_recorrencias")
    .select("*, modelo:plan_modelos(*)")
    .eq("ativo", true);
  const hoje = hojeSaoPaulo();
  const limite = somarDias(hoje, 60);
  let gerados = 0;
  for (const r of recorrencias ?? []) {
    const modelo = r.modelo as unknown as {
      id: string;
      tipo: string;
      campos_padrao: unknown;
      checklist_padrao: unknown;
      ativo: boolean;
    } | null;
    if (!modelo || !modelo.ativo) continue;
    const m = lerCamposModelo(modelo.campos_padrao);
    const status = await statusPadraoCom(supabase, modelo.tipo);
    if (!status) continue;
    const lista = ocorrencias(
      {
        frequencia: r.frequencia as "semanal" | "mensal" | "anual",
        dia: r.dia,
        inicio: r.inicio,
        fim: r.fim,
      },
      hoje,
      3,
    ).filter((o) => o.data_prevista >= hoje && o.data_prevista <= limite);
    for (const o of lista) {
      const { data: existente } = await supabase
        .from("plan_itens")
        .select("id")
        .eq("recorrencia_id", r.id)
        .eq("prazo", o.data_prevista)
        .maybeSingle();
      if (existente) continue;
      const { error } = await supabase.from("plan_itens").insert({
        tipo: modelo.tipo,
        status,
        titulo: m.titulo ?? `Recorrente ${o.data_prevista}`,
        prioridade: m.prioridade ?? "media",
        prazo: o.data_prevista,
        canal_publicacao: m.canal_publicacao ?? null,
        formato: m.formato ?? null,
        briefing: m.briefing ?? null,
        cta: m.cta ?? null,
        legenda: m.legenda ?? null,
        responsavel: m.responsavel ?? null,
        tags: m.tags ?? [],
        checklist: checklistInicial(
          m.formato ?? null,
          lerChecklist(modelo.checklist_padrao).map((i) => i.nome),
        ),
        modelo_id: modelo.id,
        recorrencia_id: r.id,
        origem: "recorrencia",
      });
      if (!error) gerados++;
    }
  }
  revalidar();
  return { ok: true, mensagem: `${gerados} item(ns) gerado(s) para os próximos 60 dias.` };
}

/** Fluxo de status por tipo: só o dono mexe. */
export async function salvarFluxo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const usuario = await exigirEscrita("planejamento");
  if (usuario.papel !== "dono") return { erros: { _form: "sem_permissao" } };
  const c = lerCampos(fd, ["id", "tipo", "codigo", "nome", "ordem", "fechado", "cor"] as const);
  const r = z
    .object({
      tipo: z.enum(TIPOS_ITEM, { error: "tipo_invalido" }),
      codigo: z.string().regex(/^[a-z_]{2,30}$/, { error: "codigo_invalido" }),
      nome: z.string().trim().min(1, { error: "nome_obrigatorio" }).max(40),
      ordem: z.preprocess((v) => (v === "" ? 0 : v), campoInteiro),
      cor: z.preprocess(
        (v) => (v === "" ? null : v),
        z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .nullable(),
      ),
    })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const linha = { ...r.data, ordem: r.data.ordem ?? 0, fechado: c.fechado === "sim" };
  const supabase = await clienteServidor();
  const { error } = c.id
    ? await supabase.from("plan_fluxos").update(linha).eq("id", c.id)
    : await supabase.from("plan_fluxos").insert(linha);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar();
  return { erros: {}, ok: true, mensagem: "Status salvo." };
}

export async function excluirFluxo(id: string): Promise<ResultadoAcao> {
  let usuario: Awaited<ReturnType<typeof exigirEscrita>>;
  try {
    usuario = await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (usuario.papel !== "dono") return { ok: false, erro: "sem_permissao" };
  const supabase = await clienteServidor();
  const { data: f } = await supabase
    .from("plan_fluxos")
    .select("tipo, codigo, padrao")
    .eq("id", id)
    .maybeSingle();
  if (!f) return { ok: false, erro: "item_nao_encontrado" };
  if (f.padrao) return { ok: false, erro: "status_padrao_nao_apagavel" };
  const { count } = await supabase
    .from("plan_itens")
    .select("id", { count: "exact", head: true })
    .eq("tipo", f.tipo)
    .eq("status", f.codigo);
  if ((count ?? 0) > 0) return { ok: false, erro: "status_em_uso" };
  const { error } = await supabase.from("plan_fluxos").delete().eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  return { ok: true, mensagem: "Status removido." };
}
