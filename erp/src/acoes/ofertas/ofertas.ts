"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro, erroPt } from "@/lib/erros-pt";
import { Limitador } from "@/lib/limite";
import { lerNumeroPt, percentualParaFracao } from "@/lib/formatos/numero";
import { localParaIso } from "@/lib/formatos/data";
import type { EstadoForm, ResultadoAcao } from "@/lib/forms";
import type { Json } from "@/tipos/banco";
import { lerUrlOferta } from "@/dominio/ofertas/urls";
import { lerPlataforma, PLATAFORMA_ROTULO, type Plataforma } from "@/dominio/ofertas/plataformas";
import {
  linkColadoAceito,
  ORIGEM_LINK_ROTULO,
  type OrigemLink,
} from "@/dominio/ofertas/links-afiliado";
import { CAMPOS_PRODUTO, produtoVazio, type DadosProduto } from "@/dominio/ofertas/produto";
import { escolherModelo } from "@/dominio/ofertas/modelos";
import { cupomCompativel, cupomPodeSair } from "@/dominio/ofertas/cupons";
import { carregarCredenciais } from "@/integracoes/credenciais";
import { converterLink, resolverParaProduto } from "@/integracoes/conversor";
import { buscarProdutoShopee } from "@/integracoes/shopee";
import {
  montarEnviosCupom,
  montarEnviosOferta,
  type LinkPronto,
} from "@/integracoes/montar-envios";
import { redigir } from "@/integracoes/segredo";
import { anunciantesAwin } from "@/dados/ofertas/integracoes";
import { listarModelos, plataformasLiberadas } from "@/dados/ofertas/cadastros";
import { obterOferta, ofertasDoProduto } from "@/dados/ofertas/ofertas";

const limite = new Limitador(30, 60_000);

async function escrita() {
  try {
    return await exigirEscrita("ofertas");
  } catch (e) {
    return (e as Error).message === "mfa_pendente" ? "mfa_pendente" : null;
  }
}

export type Analise =
  | {
      ok: true;
      plataforma: Plataforma;
      url: string;
      urlProduto: string;
      chaveProduto: string | null;
      anuncianteAwin: number | null;
      jaAfiliado: boolean;
      produto: DadosProduto;
      avisoProduto: string | null;
      link: { ok: true; url: string; origem: string } | { ok: false; erro: string };
      repetidas: { id: string; titulo: string | null; criado_em: string }[];
      liberada: boolean;
    }
  | { ok: false; erro: string };

/** Identifica a plataforma, busca dados por fonte autorizada e tenta converter o link (sem gravar). */
export async function analisarUrl(url: string): Promise<Analise> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  if (!limite.permitir(u.id).permitido) return { ok: false, erro: "muitas_tentativas" };
  const anunciantes = await anunciantesAwin();
  const lida = lerUrlOferta(String(url ?? "").slice(0, 2000), anunciantes);
  if (!lida.ok) return lida;
  const resolvido = await resolverParaProduto(lida.lida, anunciantes);
  const alvo = resolvido.ok ? resolvido.lida : lida.lida;
  const cred = await carregarCredenciais();

  let produto = produtoVazio();
  let avisoProduto: string | null = null;
  if (alvo.plataforma === "shopee" && cred.shopee && alvo.ids.itemId && alvo.ids.shopId) {
    const r = await buscarProdutoShopee(cred.shopee, {
      shopId: alvo.ids.shopId,
      itemId: alvo.ids.itemId,
    });
    if (r.ok) produto = r.dados;
    else
      avisoProduto = `Dados não carregados: ${redigir(erroPt(r.erro) ?? r.erro, cred.segredos)}. Preencha à mão.`;
  } else if (alvo.plataforma === "shopee") {
    avisoProduto = "Sem Open API da Shopee configurada: preencha os dados à mão.";
  } else if (alvo.plataforma === "amazon") {
    avisoProduto =
      "Creators API ainda não liberada: preencha preço e dados conferidos na página do produto.";
  } else {
    avisoProduto = `${PLATAFORMA_ROTULO[alvo.plataforma]} não tem fonte autorizada de dados de produto: preencha à mão.`;
  }

  const conversao = await converterLink({ lida: alvo, atribuicao: {}, anunciantes }, cred);
  const [repetidas, liberadas] = await Promise.all([
    alvo.chaveProduto ? ofertasDoProduto(alvo.chaveProduto) : Promise.resolve([]),
    plataformasLiberadas(),
  ]);
  return {
    ok: true,
    plataforma: alvo.plataforma,
    url: lida.lida.url,
    urlProduto: alvo.url,
    chaveProduto: alvo.chaveProduto,
    anuncianteAwin: alvo.ids.anuncianteAwin ?? null,
    jaAfiliado: lida.lida.jaAfiliado,
    produto,
    avisoProduto,
    link: conversao.ok
      ? { ok: true, url: conversao.url, origem: ORIGEM_LINK_ROTULO[conversao.origem] }
      : { ok: false, erro: redigir(erroPt(conversao.erro) ?? conversao.erro, cred.segredos) },
    repetidas,
    liberada: liberadas.includes(alvo.plataforma),
  };
}

const opcional = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable());
const preco = z.preprocess(
  (v) => (v === "" || v == null ? null : lerNumeroPt(String(v))),
  z.number({ error: "preco_invalido" }).positive({ error: "preco_invalido" }).max(1e9).nullable(),
);

const schemaOferta = z.object({
  plataforma: z.enum(["shopee", "mercado_livre", "amazon", "awin"]),
  url_original: z
    .string()
    .regex(/^https:\/\//)
    .max(2000),
  url_produto: opcional(2000),
  chave_produto: opcional(300),
  anunciante_awin: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().positive().nullable(),
  ),
  titulo: z.string().min(1, { error: "titulo_produto_obrigatorio" }).max(300),
  imagem_caminho: opcional(300),
  imagem_url: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z
      .string()
      .regex(/^https:\/\//)
      .max(2000)
      .nullable(),
  ),
  preco_atual: preco,
  preco_anterior: preco,
  desconto: z.preprocess(
    (v) => (v === "" || v == null ? null : percentualParaFracao(String(v))),
    z
      .number({ error: "percentual_invalido" })
      .gt(0, { error: "percentual_invalido" })
      .lt(1, { error: "percentual_invalido" })
      .nullable(),
  ),
  preco_pix: preco,
  parcelamento: opcional(120),
  avaliacao: z.preprocess(
    (v) => (v === "" || v == null ? null : lerNumeroPt(String(v))),
    z
      .number({ error: "numero_invalido" })
      .min(0, { error: "numero_invalido" })
      .max(5, { error: "numero_invalido" })
      .nullable(),
  ),
  avaliacoes_qtd: z.preprocess(
    (v) => (v === "" || v == null ? null : lerNumeroPt(String(v))),
    z.number({ error: "inteiro_invalido" }).int({ error: "inteiro_invalido" }).min(0).nullable(),
  ),
  loja: opcional(120),
  preco_variavel: z.boolean(),
  link_colado: opcional(2000),
  cupom_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
  modelo_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
  cta: opcional(200),
  campanha: opcional(60),
});

/** Salva a oferta. Campo que veio da API e não foi editado mantém a fonte; o resto vira "manual". */
export async function salvarOferta(id: string | null, fd: FormData): Promise<EstadoForm> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { erros: { _form: u ?? "sem_permissao" } };
  const bruto: Record<string, unknown> = {};
  for (const k of Object.keys(schemaOferta.shape)) bruto[k] = String(fd.get(k) ?? "").trim();
  bruto.preco_variavel = fd.get("preco_variavel") === "on";
  const r = schemaOferta.safeParse(bruto);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0] ?? "_form")] ??= i.message;
    return { erros };
  }
  const d = r.data;
  if (
    d.link_colado &&
    !linkColadoAceito(
      d.plataforma,
      d.link_colado,
      (await anunciantesAwin()).flatMap((a) => a.dominios),
    )
  )
    return { erros: { link_colado: "link_colado_invalido" } };

  let fontesApi: Record<string, string> = {};
  try {
    fontesApi = JSON.parse(String(fd.get("fontes_api") ?? "{}"));
  } catch {
    fontesApi = {};
  }
  const intocados = new Set(
    String(fd.get("intocados") ?? "")
      .split(",")
      .filter(Boolean),
  );
  const fontes: Record<string, string> = {};
  for (const campo of CAMPOS_PRODUTO) {
    const valor = (d as Record<string, unknown>)[campo];
    if (valor === null || valor === undefined) continue;
    fontes[campo] = intocados.has(campo) && fontesApi[campo] ? fontesApi[campo] : "manual";
  }
  const temPreco = d.preco_atual !== null;
  const apiEm = String(fd.get("dados_api_em") ?? "");
  const precoDaApi = intocados.has("preco_atual") && fontesApi.preco_atual && apiEm;

  const supabase = await clienteServidor();
  if (d.cupom_id) {
    const { data: c } = await supabase
      .from("ofe_cupons")
      .select("plataforma, status, inicio_em, fim_em, validade_confirmada")
      .eq("id", d.cupom_id)
      .maybeSingle();
    if (!c || !cupomCompativel(c, d)) return { erros: { cupom_id: "cupom_incompativel" } };
    if (!cupomPodeSair(c)) return { erros: { cupom_id: "cupom_fora_da_vigencia" } };
  }
  const registro = {
    ...d,
    fontes: fontes as Json,
    dados_atualizados_em: temPreco ? (precoDaApi ? apiEm : new Date().toISOString()) : null,
  };
  const { data, error } = id
    ? await supabase
        .from("ofe_ofertas")
        .update(registro)
        .eq("id", id)
        .neq("status", "arquivada")
        .select("id")
        .single()
    : await supabase.from("ofe_ofertas").insert(registro).select("id").single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  if (id) await supabase.from("ofe_links").delete().eq("oferta_id", id);
  revalidatePath("/ofertas/gerar");
  return { erros: {}, ok: true, mensagem: "Oferta salva.", id: data.id };
}

export async function arquivarOferta(id: string): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_ofertas").update({ status: "arquivada" }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/gerar");
  return { ok: true, mensagem: "Oferta arquivada." };
}

const schemaPublicar = z.object({
  grupos: z.array(z.uuid()).min(1, { error: "grupo_obrigatorio" }).max(50),
  agendado_para: z.string().nullable(),
  texto: z.string().max(4000, { error: "modelo_longo" }).nullable(),
});

export type ResultadoPublicar =
  { ok: true; mensagem: string; id: string } | { ok: false; erro: string };

async function gruposEscolhidos(ids: string[]) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_grupos")
    .select("id, nome, campanha, tag_amazon")
    .in("id", ids)
    .eq("ativo", true)
    .in("funcao", ["destino", "teste"]);
  return data ?? [];
}

function mensagemErro(
  r: { erro: string; grupo?: string; detalhe?: string },
  segredos: string[],
): string {
  const base = erroPt(r.erro) ?? r.erro;
  return redigir(
    `${r.grupo ? `${r.grupo}: ` : ""}${base}${r.detalhe ? ` (${r.detalhe})` : ""}`,
    segredos,
  );
}

/** Publica uma oferta salva nos grupos escolhidos, em modo manual (você publica e marca). */
export async function publicarOferta(
  id: string,
  entrada: { grupos: string[]; agendado_para: string | null; texto: string | null },
): Promise<ResultadoPublicar> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const p = schemaPublicar.safeParse(entrada);
  if (!p.success) return { ok: false, erro: p.error.issues[0].message };
  const quando = p.data.agendado_para ? localParaIso(p.data.agendado_para) : null;
  if (p.data.agendado_para && !quando) return { ok: false, erro: "data_invalida" };

  const oferta = await obterOferta(id);
  if (!oferta || oferta.status === "arquivada") return { ok: false, erro: "oferta_nao_encontrada" };
  if (!(await plataformasLiberadas()).includes(oferta.plataforma))
    return { ok: false, erro: "plataforma_bloqueada" };
  const supabase = await clienteServidor();
  const grupos = await gruposEscolhidos(p.data.grupos);
  if (grupos.length !== p.data.grupos.length) return { ok: false, erro: "grupo_invalido" };

  const [modelos, anunciantes, cred, cupomRes, linksRes] = await Promise.all([
    listarModelos(),
    anunciantesAwin(),
    carregarCredenciais(),
    oferta.cupom_id
      ? supabase
          .from("ofe_cupons")
          .select(
            "plataforma, codigo, descricao, beneficio, regras, valor_minimo, fim_em, validade_confirmada",
          )
          .eq("id", oferta.cupom_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("ofe_links").select("grupo_id, url, origem").eq("oferta_id", id),
  ]);
  const modelo = escolherModelo(modelos, "oferta", oferta.plataforma, oferta.modelo_id);
  const corpo = p.data.texto?.trim() || modelo?.corpo;
  if (!corpo) return { ok: false, erro: "modelo_obrigatorio" };
  const linksExistentes = new Map<string, LinkPronto>();
  for (const l of linksRes.data ?? [])
    if (l.grupo_id) linksExistentes.set(l.grupo_id, { url: l.url, origem: l.origem as OrigemLink });
  const cupomDados = cupomRes.data
    ? { ...cupomRes.data, plataforma: lerPlataforma(cupomRes.data.plataforma)! }
    : null;

  const m = await montarEnviosOferta({
    oferta,
    cupom: cupomDados,
    corpo,
    grupos,
    cred,
    anunciantes,
    linksExistentes,
  });
  if (!m.ok) return { ok: false, erro: mensagemErro(m, cred.segredos) };
  if (m.links.length) {
    const { error } = await supabase.from("ofe_links").upsert(
      m.links.map((l) => ({ oferta_id: id, grupo_id: l.grupo_id, url: l.url, origem: l.origem })),
      { onConflict: "oferta_id,grupo_id" },
    );
    if (error) return { ok: false, erro: chaveDoErro(error) };
  }
  const { data: pub, error } = await supabase.rpc("ofe_criar_publicacao", {
    p_oferta: id,
    p_cupom: oferta.cupom_id as string,
    p_modo: "manual",
    p_agendado_para: quando ?? new Date().toISOString(),
    p_envios: m.envios as unknown as Json,
    p_texto_editado: p.data.texto?.trim() || (null as unknown as string),
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/publicar");
  revalidatePath("/ofertas/gerar");
  const agendado = quando && Date.parse(quando) > Date.now() + 60_000;
  return {
    ok: true,
    id: pub as string,
    mensagem: agendado
      ? `Programado para ${grupos.length} grupo(s). Aparece em Publicar no horário.`
      : `${grupos.length} envio(s) prontos em Publicar.`,
  };
}

/** Publica um cupom sozinho. Link só se for de afiliado (colado e da própria plataforma). */
export async function publicarCupom(
  cupomId: string,
  entrada: {
    grupos: string[];
    agendado_para: string | null;
    texto: string | null;
    link: string | null;
  },
): Promise<ResultadoPublicar> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  const p = schemaPublicar.safeParse(entrada);
  if (!p.success) return { ok: false, erro: p.error.issues[0].message };
  const quando = p.data.agendado_para ? localParaIso(p.data.agendado_para) : null;
  if (p.data.agendado_para && !quando) return { ok: false, erro: "data_invalida" };
  const supabase = await clienteServidor();
  const { data: c } = await supabase
    .from("ofe_cupons")
    .select(
      "plataforma, codigo, descricao, beneficio, regras, valor_minimo, fim_em, validade_confirmada, status, inicio_em, fonte, url_referencia",
    )
    .eq("id", cupomId)
    .maybeSingle();
  const plataforma = lerPlataforma(c?.plataforma);
  if (!c || !plataforma) return { ok: false, erro: "nao_encontrado" };
  if (!cupomPodeSair(c)) return { ok: false, erro: "cupom_fora_da_vigencia" };
  if (!(await plataformasLiberadas()).includes(plataforma))
    return { ok: false, erro: "plataforma_bloqueada" };
  const linkDigitado = entrada.link?.trim() || null;
  let link: LinkPronto | null = null;
  if (linkDigitado) {
    if (
      !linkColadoAceito(
        plataforma,
        linkDigitado,
        (await anunciantesAwin()).flatMap((a) => a.dominios),
      )
    )
      return { ok: false, erro: "link_colado_invalido" };
    link = { url: linkDigitado, origem: "colado" };
  } else if (c.fonte === "awin" && c.url_referencia)
    link = { url: c.url_referencia, origem: "api" };
  const grupos = await gruposEscolhidos(p.data.grupos);
  if (grupos.length !== p.data.grupos.length) return { ok: false, erro: "grupo_invalido" };
  const modelo = escolherModelo(await listarModelos(), "cupom", plataforma, null);
  const corpo = p.data.texto?.trim() || modelo?.corpo;
  if (!corpo) return { ok: false, erro: "modelo_obrigatorio" };
  const m = montarEnviosCupom({ cupom: { ...c, plataforma }, corpo, grupos, link });
  if (!m.ok) return { ok: false, erro: mensagemErro(m, []) };
  const { data: pub, error } = await supabase.rpc("ofe_criar_publicacao", {
    p_oferta: null as unknown as string,
    p_cupom: cupomId,
    p_modo: "manual",
    p_agendado_para: quando ?? new Date().toISOString(),
    p_envios: m.envios as unknown as Json,
    p_texto_editado: p.data.texto?.trim() || (null as unknown as string),
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/publicar");
  return {
    ok: true,
    id: pub as string,
    mensagem: `${grupos.length} envio(s) do cupom prontos em Publicar.`,
  };
}

// Modo assistido ------------------------------------------------------------------------------

export async function marcarPublicado(envioId: string): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  if (!z.uuid().safeParse(envioId).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_marcar_publicado", { p_envio: envioId });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/publicar");
  return { ok: true, mensagem: "Marcado como publicado." };
}

export async function pularEnvio(envioId: string): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  if (!z.uuid().safeParse(envioId).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_pular_envio", { p_envio: envioId, p_motivo: "pulado" });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/publicar");
  return { ok: true, mensagem: "Envio pulado." };
}

export async function cancelarPublicacao(publicacaoId: string): Promise<ResultadoAcao> {
  const u = await escrita();
  if (!u || u === "mfa_pendente") return { ok: false, erro: u ?? "sem_permissao" };
  if (!z.uuid().safeParse(publicacaoId).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_cancelar_publicacao", {
    p_publicacao: publicacaoId,
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/publicar");
  return { ok: true, mensagem: `${data ?? 0} envio(s) cancelado(s).` };
}
