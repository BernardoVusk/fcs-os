"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoValor,
  errosDoZod,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { localParaIso } from "@/lib/formatos/data";
import { PLATAFORMAS } from "@/dominio/ofertas/plataformas";
import { validarModelo } from "@/dominio/ofertas/modelos";
import { carregarCredenciais } from "@/integracoes/credenciais";
import { listarCuponsAwin } from "@/integracoes/awin";
import { lerCsvCupons } from "@/dominio/ofertas/cupons";
import { separar } from "@/dominio/ofertas/fila";
import { chaveDoErro, erroPt } from "@/lib/erros-pt";
import { redigir } from "@/integracoes/segredo";

async function escrita(area: "ofertas" | "usuarios" = "ofertas") {
  try {
    return await exigirEscrita(area);
  } catch (e) {
    return (e as Error).message === "mfa_pendente" ? "mfa_pendente" : null;
  }
}

const vazioNulo = (v: unknown) => (v === "" || v == null ? null : v);

// Grupos -------------------------------------------------------------------------------------

const schemaGrupo = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(120, { error: "nome_longo" }),
  funcao: z.enum(["destino", "teste", "monitorado", "nenhuma"], { error: "tipo_invalido" }),
  link_convite: z.preprocess(
    vazioNulo,
    z
      .string()
      .regex(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/, {
        error: "link_convite_invalido",
      })
      .nullable(),
  ),
  tag_amazon: z.preprocess(
    vazioNulo,
    z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{1,40}-2\d$/, { error: "tag_invalida" })
      .nullable(),
  ),
  campanha: textoOpcional(60),
  observacoes: textoOpcional(1000),
});

export async function salvarGrupo(id: string | null, fd: FormData): Promise<EstadoForm> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const r = schemaGrupo.safeParse(
    Object.fromEntries(
      ["nome", "funcao", "link_convite", "tag_amazon", "campanha", "observacoes"].map((k) => [
        k,
        String(fd.get(k) ?? "").trim(),
      ]),
    ),
  );
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data, error } = id
    ? await supabase
        .from("ofe_grupos")
        .update(r.data)
        .eq("id", id)
        .neq("funcao", "origem")
        .select("id")
        .single()
    : await supabase
        .from("ofe_grupos")
        .insert({ ...r.data, cadastro: "manual" })
        .select("id")
        .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/grupos");
  return {
    erros: {},
    ok: true,
    mensagem: id ? "Grupo atualizado." : "Grupo cadastrado.",
    id: data.id,
  };
}

const schemaAutorizacao = z.object({
  descricao: z
    .string()
    .min(10, { error: "autorizacao_obrigatoria" })
    .max(500, { error: "texto_longo" }),
});

/** Grupo de origem (copiador) só com autorização registrada pelo dono: quem autorizou e como. */
export async function autorizarOrigem(id: string, fd: FormData): Promise<EstadoForm> {
  const u = await escrita("usuarios");
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const r = schemaAutorizacao.safeParse({ descricao: String(fd.get("descricao") ?? "").trim() });
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_grupos")
    .update({
      funcao: "origem",
      autorizado_em: new Date().toISOString(),
      autorizado_por: u.id,
      autorizacao_descricao: r.data.descricao,
    })
    .eq("id", id);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/grupos");
  return { erros: {}, ok: true, mensagem: "Grupo marcado como origem autorizada." };
}

export async function retirarOrigem(id: string): Promise<ResultadoAcao> {
  const u = await escrita("usuarios");
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_grupos")
    .update({
      funcao: "monitorado",
      autorizado_em: null,
      autorizado_por: null,
      autorizacao_descricao: null,
    })
    .eq("id", id)
    .eq("funcao", "origem");
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/grupos");
  return { ok: true, mensagem: "O grupo deixou de ser origem. Automações dele param." };
}

export async function alternarGrupoAtivo(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_grupos").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/grupos");
  return {
    ok: true,
    mensagem: ativo ? "Grupo reativado." : "Grupo desativado: não recebe novas publicações.",
  };
}

// Cupons -------------------------------------------------------------------------------------

const schemaCupom = z
  .object({
    plataforma: z.enum(PLATAFORMAS, { error: "tipo_invalido" }),
    codigo: textoOpcional(60),
    descricao: z
      .string()
      .min(1, { error: "descricao_cupom_obrigatoria" })
      .max(300, { error: "texto_longo" }),
    beneficio: textoOpcional(200),
    regras: textoOpcional(2000),
    valor_minimo: campoValor,
    inicio_em: z.string().nullable(),
    fim_em: z.string().nullable(),
    validade_confirmada: z.boolean(),
    url_referencia: z.preprocess(
      vazioNulo,
      z
        .string()
        .regex(/^https:\/\//, { error: "url_nao_https" })
        .max(2000)
        .nullable(),
    ),
    aplicabilidade: textoOpcional(500),
  })
  .refine((c) => !c.inicio_em || !c.fim_em || c.fim_em > c.inicio_em, {
    error: "prazo_antes_do_inicio",
    path: ["fim_em"],
  })
  .refine((c) => !c.validade_confirmada || !!c.fim_em, {
    error: "validade_sem_data",
    path: ["fim_em"],
  });

function lerCupom(fd: FormData) {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const inicio = t("inicio_em");
  const fim = t("fim_em");
  return {
    plataforma: t("plataforma"),
    codigo: t("codigo").toUpperCase(),
    descricao: t("descricao"),
    beneficio: t("beneficio"),
    regras: t("regras"),
    valor_minimo: t("valor_minimo"),
    inicio_em: inicio ? (localParaIso(inicio) ?? "invalida") : null,
    fim_em: fim ? (localParaIso(fim) ?? "invalida") : null,
    validade_confirmada: fd.get("validade_confirmada") === "on",
    url_referencia: t("url_referencia"),
    aplicabilidade: t("aplicabilidade"),
  };
}

export async function salvarCupom(id: string | null, fd: FormData): Promise<EstadoForm> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const bruto = lerCupom(fd);
  if (bruto.inicio_em === "invalida") return { erros: { inicio_em: "data_invalida" } };
  if (bruto.fim_em === "invalida") return { erros: { fim_em: "data_invalida" } };
  const r = schemaCupom.safeParse(bruto);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const dados = { ...r.data, verificado_em: new Date().toISOString() };
  const { data, error } = id
    ? await supabase
        .from("ofe_cupons")
        .update(dados)
        .eq("id", id)
        .eq("fonte", "manual")
        .select("id")
        .single()
    : await supabase
        .from("ofe_cupons")
        .insert({ ...dados, fonte: "manual", verificacao: "manual" })
        .select("id")
        .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/cupons");
  return {
    erros: {},
    ok: true,
    mensagem: id ? "Cupom atualizado." : "Cupom cadastrado.",
    id: data.id,
  };
}

export async function mudarStatusCupom(id: string, status: string): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  if (!["ativo", "pausado", "expirado", "removido"].includes(status))
    return { ok: false, erro: "status_invalido" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_cupons").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/cupons");
  const msg: Record<string, string> = {
    ativo: "Cupom reativado.",
    pausado: "Cupom pausado: não entra em novas publicações.",
    expirado: "Cupom marcado como expirado.",
    removido: "Cupom removido.",
  };
  return { ok: true, mensagem: msg[status] };
}

// Modelos ------------------------------------------------------------------------------------

const schemaModelo = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  tipo: z.enum(["oferta", "cupom"], { error: "tipo_invalido" }),
  plataforma: z.preprocess(vazioNulo, z.enum(PLATAFORMAS).nullable()),
  corpo: z.string().min(1, { error: "conteudo_obrigatorio" }).max(4000, { error: "modelo_longo" }),
  padrao: z.boolean(),
});

export async function salvarModelo(id: string | null, fd: FormData): Promise<EstadoForm> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const r = schemaModelo.safeParse({
    nome: String(fd.get("nome") ?? "").trim(),
    tipo: String(fd.get("tipo") ?? ""),
    plataforma: String(fd.get("plataforma") ?? ""),
    corpo: String(fd.get("corpo") ?? "")
      .replace(/\r\n/g, "\n")
      .trim(),
    padrao: fd.get("padrao") === "on",
  });
  if (!r.success) return errosDoZod(r.error);
  const v = validarModelo(r.data.corpo, r.data.tipo, r.data.plataforma);
  if (v.erros.length)
    return { erros: { corpo: v.erros[0].split(":")[0], _detalhe: v.erros.join(", ") } };
  const supabase = await clienteServidor();
  if (r.data.padrao) {
    let q = supabase
      .from("ofe_modelos")
      .update({ padrao: false })
      .eq("tipo", r.data.tipo)
      .eq("padrao", true);
    q = r.data.plataforma ? q.eq("plataforma", r.data.plataforma) : q.is("plataforma", null);
    if (id) q = q.neq("id", id);
    const { error } = await q;
    if (error) return { erros: { _form: chaveDoErro(error) } };
  }
  const { data, error } = id
    ? await supabase.from("ofe_modelos").update(r.data).eq("id", id).select("id").single()
    : await supabase.from("ofe_modelos").insert(r.data).select("id").single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/modelos");
  const aviso = v.avisos.length
    ? ` Atenção: ${v.avisos.map((a) => a.split(":")[1]).join(", ")} fora de seção bloqueia a publicação quando faltar o dado.`
    : "";
  return { erros: {}, ok: true, mensagem: `Modelo salvo.${aviso}`, id: data.id };
}

export async function alternarModeloAtivo(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("ofe_modelos")
    .update({ ativo })
    .eq("id", id)
    .or(ativo ? "padrao.eq.true,padrao.eq.false" : "padrao.eq.false")
    .select("id");
  if (error) return { ok: false, erro: chaveDoErro(error) };
  if (!data?.length) return { ok: false, erro: "modelo_padrao_ativo" };
  revalidatePath("/ofertas/modelos");
  return { ok: true, mensagem: ativo ? "Modelo reativado." : "Modelo desativado." };
}

// Cupons automáticos e importação ----------------------------------------------------------

/** Puxa os cupons (voucher) ativos dos anunciantes Awin com parceria, região BR. */
export async function sincronizarCuponsAwin(): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const cred = await carregarCredenciais();
  if (!cred.awin) return { ok: false, erro: "credencial_ausente" };
  const r = await listarCuponsAwin(cred.awin);
  if (!r.ok)
    return {
      ok: false,
      erro: redigir(
        `${erroPt(r.erro) ?? r.erro}${r.detalhe ? ` (${r.detalhe})` : ""}`,
        cred.segredos,
      ),
    };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_registrar_cupons_awin", {
    p_cupons: r.dados.map((c) => ({
      referencia: String(c.promotionId),
      codigo: c.codigo,
      titulo: c.titulo,
      anunciante: c.anunciante,
      termos: c.termos,
      inicio: c.inicio,
      fim: c.fim,
      url: c.urlRastreio,
      advertiser_id: c.advertiserId,
    })),
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/cupons");
  return {
    ok: true,
    mensagem: `${r.dados.length} cupom(ns) lido(s) da Awin, ${data ?? 0} novo(s).`,
  };
}

export async function salvarRegraCupons(fd: FormData): Promise<EstadoForm> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const enviar = fd.get("enviar_awin") === "on";
  const fila = String(fd.get("fila_awin_id") ?? "").trim() || null;
  if (enviar && !fila) return { erros: { fila_awin_id: "fila_obrigatoria" } };
  if (fila && !z.uuid().safeParse(fila).success)
    return { erros: { fila_awin_id: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_cupons_regras")
    .update({ enviar_awin: enviar, fila_awin_id: fila })
    .eq("id", true);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/cupons");
  return {
    erros: {},
    ok: true,
    mensagem: enviar
      ? "Cupons novos da Awin entram na fila escolhida."
      : "Envio automático de cupons desligado.",
  };
}

export async function importarCuponsCsv(
  texto: string,
): Promise<ResultadoAcao & { detalhes?: string[] }> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const matriz = separar(String(texto ?? "").slice(0, 1_000_000));
  if (matriz.length < 2) return { ok: false, erro: "csv_vazio" };
  if (matriz.length > 501) return { ok: false, erro: "csv_grande" };
  const r = lerCsvCupons(matriz);
  const supabase = await clienteServidor();
  let n = 0;
  const detalhes = r.ignoradas.map((i) => `Linha ${i.linha}: ${i.motivo}`);
  for (const l of r.linhas) {
    const { error } = await supabase.from("ofe_cupons").insert({
      plataforma: l.plataforma,
      codigo: l.codigo,
      descricao: l.descricao,
      beneficio: l.beneficio,
      valor_minimo: l.valor_minimo,
      inicio_em: l.inicio,
      fim_em: l.fim,
      validade_confirmada: false,
      url_referencia: l.url,
      regras: l.regras,
      fonte: "csv",
      verificacao: "manual",
      verificado_em: new Date().toISOString(),
    });
    if (error) detalhes.push(`Linha ${l.linha}: ${erroPt(chaveDoErro(error))}`);
    else n += 1;
  }
  revalidatePath("/ofertas/cupons");
  return {
    ok: n > 0,
    erro: n ? undefined : "nenhum_link_valido",
    mensagem: `${n} cupom(ns) importado(s).`,
    detalhes,
  };
}
