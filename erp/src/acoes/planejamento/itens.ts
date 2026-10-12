"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { statusPadraoCom } from "@/dados/planejamento/planejamento";
import {
  alternarChecklist,
  camposParaDuplicar,
  CANAIS_PUBLICACAO,
  checklistDeTexto,
  checklistInicial,
  FORMATOS,
  lerCamposModelo,
  lerChecklist,
  lerMetricas,
  lerTags,
  ligacoesDeTexto,
  PRIORIDADES,
  TIPOS_ITEM,
  CHAVES_METRICA,
} from "@/dominio/planejamento/tipos";

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());
const dataOuNula = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "data_invalida" })
    .nullable(),
);
const horaOuNula = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, { error: "data_invalida" })
    .nullable(),
);
const enumOuNulo = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.preprocess((v) => (v === "" ? null : v), z.enum(valores).nullable());

const CAMPOS = [
  "id",
  "tipo",
  "titulo",
  "status",
  "prioridade",
  "inicio",
  "prazo",
  "horario",
  "categoria_id",
  "tags",
  "responsavel",
  "canal_publicacao",
  "formato",
  "legenda",
  "briefing",
  "cta",
  "links",
  "referencias",
  "observacoes",
  "checklist",
  "produto_id",
  "campanha_id",
  "pai_id",
  "modelo_id",
  "apos",
  ...CHAVES_METRICA.map((k) => `metrica_${k}` as const),
] as const;

const itemSchema = z.object({
  tipo: z.enum(TIPOS_ITEM, { error: "tipo_invalido" }),
  titulo: z.string().trim().min(1, { error: "titulo_obrigatorio" }).max(160),
  status: z
    .string()
    .regex(/^[a-z_]{0,30}$/)
    .optional(),
  prioridade: z.preprocess((v) => (v === "" ? "media" : v), z.enum(PRIORIDADES)),
  inicio: dataOuNula,
  prazo: dataOuNula,
  horario: horaOuNula,
  categoria_id: uuidOuNulo,
  responsavel: textoOpcional(80),
  canal_publicacao: enumOuNulo(CANAIS_PUBLICACAO),
  formato: enumOuNulo(FORMATOS),
  legenda: textoOpcional(3000),
  briefing: textoOpcional(4000),
  cta: textoOpcional(300),
  observacoes: textoOpcional(2000),
  produto_id: uuidOuNulo,
  campanha_id: uuidOuNulo,
  pai_id: uuidOuNulo,
  modelo_id: uuidOuNulo,
});

function revalidar(id?: string) {
  revalidatePath("/planejamento", "layout");
  revalidatePath("/");
  if (id) revalidatePath(`/planejamento/itens/${id}`);
}

/** Cria ou atualiza um item. Na criação, modelo preenche o que veio vazio e dá o checklist. */
export async function salvarItem(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("planejamento");
  const c = lerCampos(fd, CAMPOS);
  const r = itemSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (d.inicio && d.prazo && d.prazo < d.inicio)
    return { erros: { prazo: "prazo_antes_do_inicio" } };
  if (c.id && d.pai_id === c.id) return { erros: { pai_id: "relacao_reflexiva" } };
  const supabase = await clienteServidor();
  const metricas: Record<string, number> = {};
  for (const k of CHAVES_METRICA) {
    const v = c[`metrica_${k}`];
    if (v !== "") {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n) && n >= 0) metricas[k] = n;
    }
  }
  const base = {
    tipo: d.tipo,
    titulo: d.titulo,
    prioridade: d.prioridade,
    inicio: d.inicio,
    prazo: d.prazo,
    horario: d.horario,
    categoria_id: d.categoria_id,
    tags: lerTags(c.tags),
    responsavel: d.responsavel ?? null,
    canal_publicacao: d.canal_publicacao,
    formato: d.formato,
    legenda: d.legenda ?? null,
    briefing: d.briefing ?? null,
    cta: d.cta ?? null,
    links: ligacoesDeTexto(c.links),
    referencias: ligacoesDeTexto(c.referencias),
    observacoes: d.observacoes ?? null,
    produto_id: d.produto_id,
    campanha_id: d.campanha_id,
    pai_id: d.pai_id,
    metricas: lerMetricas(metricas),
  };
  if (c.id) {
    const { data: atual } = await supabase
      .from("plan_itens")
      .select("checklist")
      .eq("id", c.id)
      .maybeSingle();
    if (!atual) return { erros: { _form: "item_nao_encontrado" } };
    // Edição do checklist por texto preserva o que já estava feito, pelo nome.
    const feitos = new Set(
      lerChecklist(atual.checklist)
        .filter((i) => i.feito)
        .map((i) => i.nome),
    );
    const checklist = checklistDeTexto(c.checklist).map((i) => ({
      ...i,
      feito: feitos.has(i.nome),
    }));
    const { error } = await supabase
      .from("plan_itens")
      .update({ ...base, ...(d.status ? { status: d.status } : {}), checklist })
      .eq("id", c.id);
    if (error) return { erros: { _form: chaveDoErro(error) } };
    revalidar(c.id);
    return { erros: {}, ok: true, mensagem: "Item salvo.", id: c.id };
  }
  const status = d.status || (await statusPadraoCom(supabase, d.tipo));
  if (!status) return { erros: { _form: "status_invalido" } };
  let linha = {
    ...base,
    status,
    modelo_id: d.modelo_id,
    origem: d.modelo_id ? "modelo" : "manual",
  };
  let checklist = c.checklist.trim() ? checklistDeTexto(c.checklist) : checklistInicial(d.formato);
  if (d.modelo_id) {
    const { data: modelo } = await supabase
      .from("plan_modelos")
      .select("*")
      .eq("id", d.modelo_id)
      .maybeSingle();
    if (modelo) {
      const m = lerCamposModelo(modelo.campos_padrao);
      linha = {
        ...linha,
        prioridade: c.prioridade ? linha.prioridade : (m.prioridade ?? linha.prioridade),
        canal_publicacao: linha.canal_publicacao ?? m.canal_publicacao ?? null,
        formato: linha.formato ?? m.formato ?? null,
        briefing: linha.briefing ?? m.briefing ?? null,
        cta: linha.cta ?? m.cta ?? null,
        legenda: linha.legenda ?? m.legenda ?? null,
        responsavel: linha.responsavel ?? m.responsavel ?? null,
        tags: linha.tags.length ? linha.tags : (m.tags ?? []),
      };
      const nomesModelo = lerChecklist(modelo.checklist_padrao).map((i) => i.nome);
      if (!c.checklist.trim()) checklist = checklistInicial(linha.formato, nomesModelo);
    }
  }
  const { data: novo, error } = await supabase
    .from("plan_itens")
    .insert({ ...linha, checklist })
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar(novo.id);
  if (c.apos === "abrir") redirect(`/planejamento/itens/${novo.id}`);
  return { erros: {}, ok: true, mensagem: "Item criado.", id: novo.id };
}

export async function mudarStatusItem(id: string, status: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!/^[a-z_]{2,30}$/.test(status)) return { ok: false, erro: "status_invalido" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("plan_itens").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar(id);
  return { ok: true, mensagem: "Status alterado." };
}

export async function alternarItemChecklist(id: string, indice: number): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data } = await supabase.from("plan_itens").select("checklist").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "item_nao_encontrado" };
  const lista = lerChecklist(data.checklist);
  if (indice < 0 || indice >= lista.length) return { ok: false, erro: "item_nao_encontrado" };
  const { error } = await supabase
    .from("plan_itens")
    .update({ checklist: alternarChecklist(lista, indice) })
    .eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar(id);
  return { ok: true };
}

/** Duplica e abre a cópia (sem datas, status e checklist zerados). */
export async function duplicarItem(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data } = await supabase.from("plan_itens").select("*").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "item_nao_encontrado" };
  const copia = camposParaDuplicar(data);
  const status = await statusPadraoCom(supabase, data.tipo);
  if (!status) return { ok: false, erro: "status_invalido" };
  const { data: novo, error } = await supabase
    .from("plan_itens")
    .insert({
      ...copia,
      status,
      links: copia.links as never,
      referencias: copia.referencias as never,
    })
    .select("id")
    .single();
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  redirect(`/planejamento/itens/${novo.id}`);
}

/** Só o dono apaga; o resto cancela pelo status. */
export async function excluirItem(id: string): Promise<ResultadoAcao> {
  let usuario: Awaited<ReturnType<typeof exigirEscrita>>;
  try {
    usuario = await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (usuario.papel !== "dono") return { ok: false, erro: "sem_permissao" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("plan_itens").delete().eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  redirect("/planejamento/lista");
}

export async function adicionarRelacao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("planejamento");
  const c = lerCampos(fd, ["de_id", "para_id", "tipo"] as const);
  const r = z
    .object({ de_id: z.uuid(), para_id: z.uuid(), tipo: z.enum(["bloqueia", "relacionada"]) })
    .safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.de_id === r.data.para_id) return { erros: { para_id: "relacao_reflexiva" } };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("plan_relacoes").insert(r.data);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidar(r.data.de_id);
  revalidar(r.data.para_id);
  return { erros: {}, ok: true, mensagem: "Relação adicionada." };
}

export async function removerRelacao(id: string, itemId: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("planejamento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("plan_relacoes").delete().eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar(itemId);
  return { ok: true, mensagem: "Relação removida." };
}
