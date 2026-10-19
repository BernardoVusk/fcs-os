"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro } from "@/lib/erros-pt";
import { errosDoZod, type EstadoForm, type ResultadoAcao } from "@/lib/forms";
import type { Json } from "@/tipos/banco";
import { decidirMensagem, MOTIVO_COPIADOR_ROTULO } from "@/dominio/ofertas/copiador";
import { REGRAS_PADRAO } from "@/dominio/ofertas/limpeza";
import { PLATAFORMAS, type Plataforma } from "@/dominio/ofertas/plataformas";
import { linkColadoAceito } from "@/dominio/ofertas/links-afiliado";
import { anunciantesAwin } from "@/dados/ofertas/integracoes";

async function escrita() {
  try {
    await exigirEscrita("ofertas");
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const lista = (v: FormDataEntryValue | null, max = 50) =>
  String(v ?? "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((x) => x.slice(0, 80));

const schema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  grupo_origem_id: z.uuid({ error: "origem_obrigatoria" }),
  numero_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
  plataformas: z.array(z.enum(PLATAFORMAS)).min(1, { error: "plataforma_obrigatoria" }),
  revisao_manual: z.boolean(),
  janela_duplicidade_horas: z.coerce.number({ error: "inteiro_invalido" }).int().min(1).max(720),
  intervalo_minutos: z.coerce.number({ error: "inteiro_invalido" }).int().min(1).max(1440),
});

function ler(fd: FormData) {
  const r = schema.safeParse({
    nome: String(fd.get("nome") ?? "").trim(),
    grupo_origem_id: String(fd.get("grupo_origem_id") ?? ""),
    numero_id: String(fd.get("numero_id") ?? ""),
    plataformas: fd.getAll("plataformas").map(String),
    revisao_manual: fd.get("revisao_manual") === "on",
    janela_duplicidade_horas: String(fd.get("janela_duplicidade_horas") ?? "24"),
    intervalo_minutos: String(fd.get("intervalo_minutos") ?? "5"),
  });
  if (!r.success) return { erro: errosDoZod(r.error) } as const;
  const { intervalo_minutos, ...resto } = r.data;
  return {
    dados: {
      ...resto,
      intervalo_segundos: intervalo_minutos * 60,
      filtros: {
        incluir: lista(fd.get("incluir")),
        excluir: lista(fd.get("excluir")),
        dominiosBloqueados: lista(fd.get("dominios_bloqueados")),
      } as Json,
      limpeza: {
        removerMencoes: fd.get("remover_mencoes") === "on",
        removerConvites: fd.get("remover_convites") === "on",
        removerLinksNaoAutorizados: fd.get("remover_links") === "on",
        frasesRemover: lista(fd.get("frases_remover"), 100),
      } as Json,
    },
  } as const;
}

export async function criarAutomacao(fd: FormData): Promise<EstadoForm> {
  const e = await escrita();
  if (e) return { erros: { _form: e } };
  const r = ler(fd);
  if ("erro" in r) return r.erro!;
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("ofe_automacoes")
    .insert(r.dados)
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/copiador");
  return {
    erros: {},
    ok: true,
    mensagem: "Automação criada em rascunho: escolha os destinos e veja a prévia.",
    id: data.id,
  };
}

export async function salvarAutomacao(id: string, fd: FormData): Promise<EstadoForm> {
  const e = await escrita();
  if (e) return { erros: { _form: e } };
  const r = ler(fd);
  if ("erro" in r) return r.erro!;
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_automacoes").update(r.dados).eq("id", id);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(`/ofertas/copiador/${id}`);
  return { erros: {}, ok: true, mensagem: "Automação atualizada." };
}

export async function salvarDestinosAutomacao(
  id: string,
  grupos: string[],
): Promise<ResultadoAcao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const l = z.array(z.uuid()).max(100).safeParse(grupos);
  if (!l.success) return { ok: false, erro: "grupo_invalido" };
  const supabase = await clienteServidor();
  await supabase.from("ofe_automacoes_destinos").delete().eq("automacao_id", id);
  if (l.data.length) {
    const { error } = await supabase
      .from("ofe_automacoes_destinos")
      .insert(l.data.map((g) => ({ automacao_id: id, grupo_id: g })));
    if (error) return { ok: false, erro: chaveDoErro(error) };
  }
  revalidatePath(`/ofertas/copiador/${id}`);
  return { ok: true, mensagem: `${l.data.length} grupo(s) de destino.` };
}

export async function mudarStatusAutomacao(
  id: string,
  acao: "ativar" | "pausar" | "encerrar" | "rascunho",
): Promise<ResultadoAcao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const supabase = await clienteServidor();
  if (acao === "ativar") {
    const { count } = await supabase
      .from("ofe_automacoes_destinos")
      .select("grupo_id", { count: "exact", head: true })
      .eq("automacao_id", id);
    if (!count) return { ok: false, erro: "grupo_obrigatorio" };
  }
  const status = {
    ativar: "ativa",
    pausar: "pausada",
    encerrar: "encerrada",
    rascunho: "rascunho",
  }[acao];
  const { error } = await supabase
    .from("ofe_automacoes")
    .update({ status, ultimo_erro: null })
    .eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(`/ofertas/copiador/${id}`);
  revalidatePath("/ofertas/copiador");
  const msg = {
    ativar: "Automação ativa: mensagens novas da origem passam pelas regras.",
    pausar: "Automação pausada.",
    encerrar: "Automação encerrada.",
    rascunho: "De volta à prévia: mensagens são registradas, nada sai.",
  }[acao];
  return { ok: true, mensagem: msg };
}

/** Aprova uma mensagem em revisão, com texto e link de afiliado opcionais (Mercado Livre exige). */
export async function aprovarMensagem(
  id: string,
  texto: string,
  link: string,
  plataforma: string,
): Promise<ResultadoAcao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const t = String(texto ?? "").trim();
  if (t.length > 4000) return { ok: false, erro: "modelo_longo" };
  const l = String(link ?? "").trim();
  if (
    l &&
    !linkColadoAceito(
      plataforma as Plataforma,
      l,
      (await anunciantesAwin()).flatMap((x) => x.dominios),
    )
  )
    return { ok: false, erro: "link_colado_invalido" };
  if (plataforma === "mercado_livre" && !l) return { ok: false, erro: "link_manual_obrigatorio" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_enfileirar_mensagem", {
    p_mensagem: id,
    p_texto: t || (null as unknown as string),
    p_link_colado: l || (null as unknown as string),
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/copiador", "layout");
  if (data !== "publicada")
    return { ok: false, erro: data === "ignorada" ? "duplicado" : "plataforma_bloqueada" };
  return { ok: true, mensagem: "Aprovada: os envios saem conforme o número e os limites." };
}

export async function descartarMensagem(id: string): Promise<ResultadoAcao> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_descartar_mensagem", { p_mensagem: id });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/copiador", "layout");
  return { ok: true, mensagem: "Mensagem descartada." };
}

export type TesteRegras =
  | {
      ok: true;
      acao: string;
      motivo: string | null;
      texto: string | null;
      removidos: string[];
      plataforma: string | null;
    }
  | { ok: false; erro: string };

/** Testa as regras da automação num texto colado, sem gravar nada. */
export async function testarRegras(id: string, texto: string): Promise<TesteRegras> {
  const e = await escrita();
  if (e) return { ok: false, erro: e };
  const supabase = await clienteServidor();
  const { data: a } = await supabase
    .from("ofe_automacoes")
    .select("plataformas, filtros, limpeza, revisao_manual")
    .eq("id", id)
    .single();
  if (!a) return { ok: false, erro: "nao_encontrado" };
  const d = decidirMensagem(
    String(texto ?? "").slice(0, 4096),
    {
      plataformas: a.plataformas as Plataforma[],
      filtros: { incluir: [], excluir: [], dominiosBloqueados: [], ...(a.filtros as object) },
      limpeza: { ...REGRAS_PADRAO, ...(a.limpeza as object) },
      revisaoManual: a.revisao_manual,
    },
    await anunciantesAwin(),
  );
  if (d.acao === "ignorar")
    return {
      ok: true,
      acao: "Ignorada",
      motivo: MOTIVO_COPIADOR_ROTULO[d.motivo] ?? d.motivo,
      texto: null,
      removidos: [],
      plataforma: null,
    };
  return {
    ok: true,
    acao: d.acao === "publicar" ? "Publicaria" : "Iria para revisão",
    motivo: d.motivo ? (MOTIVO_COPIADOR_ROTULO[d.motivo] ?? d.motivo) : null,
    texto: d.texto,
    removidos: d.removidos,
    plataforma: d.lida.plataforma,
  };
}
