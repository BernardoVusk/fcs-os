"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro, erroPt } from "@/lib/erros-pt";
import { errosDoZod, type EstadoForm, type ResultadoAcao } from "@/lib/forms";
import { lerNumeroPt } from "@/lib/formatos/numero";
import { localParaIso } from "@/lib/formatos/data";
import type { Json } from "@/tipos/banco";
import { lerCsvShopee, linksColados } from "@/dominio/ofertas/fila";
import { lerUrlOferta, type AnuncianteAwin } from "@/dominio/ofertas/urls";
import { lerPlataforma, PLATAFORMA_ROTULO, type Plataforma } from "@/dominio/ofertas/plataformas";
import { escolherModelo, renderizarModelo } from "@/dominio/ofertas/modelos";
import { valoresDaOferta } from "@/dominio/ofertas/mensagem";
import { cupomPodeSair } from "@/dominio/ofertas/cupons";
import { VARIAVEL_DESCRICAO, type Variavel } from "@/dominio/ofertas/modelos";
import { carregarCredenciais } from "@/integracoes/credenciais";
import { resolverParaProduto, type Credenciais } from "@/integracoes/conversor";
import { buscarProdutoShopee } from "@/integracoes/shopee";
import { prepararEnvio, type CupomPreparo } from "@/integracoes/preparo";
import { anunciantesAwin } from "@/dados/ofertas/integracoes";
import { listarModelos, plataformasLiberadas } from "@/dados/ofertas/cadastros";
import { contextoEnvioManual, manuaisParaPreparar } from "@/dados/ofertas/filas";

async function escrita() {
  try {
    await exigirEscrita("ofertas");
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const rota = (id: string) => `/ofertas/filas/${id}`;
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "hora_invalida" });

const schemaFila = z
  .object({
    nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
    numero_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
    modelo_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
    intervalo_minutos: z.coerce
      .number({ error: "inteiro_invalido" })
      .int({ error: "inteiro_invalido" })
      .min(1)
      .max(1440),
    janela_inicio: hora,
    janela_fim: hora,
    inicio_em: z.string().nullable(),
    reinicio_diario: z.boolean(),
    manual_expira_horas: z.coerce.number({ error: "inteiro_invalido" }).int().min(1).max(72),
  })
  .refine((f) => f.janela_fim > f.janela_inicio, {
    error: "janela_invalida",
    path: ["janela_fim"],
  });

function lerFila(fd: FormData) {
  const t = (k: string, p = "") => String(fd.get(k) ?? p).trim();
  const inicio = t("inicio_em");
  return {
    nome: t("nome"),
    numero_id: t("numero_id"),
    modelo_id: t("modelo_id"),
    intervalo_minutos: t("intervalo_minutos", "15"),
    janela_inicio: t("janela_inicio", "08:00"),
    janela_fim: t("janela_fim", "22:00"),
    inicio_em: inicio ? (localParaIso(inicio) ?? "invalida") : null,
    reinicio_diario: fd.get("reinicio_diario") === "on",
    manual_expira_horas: t("manual_expira_horas", "6"),
  };
}

function registroFila(d: z.infer<typeof schemaFila>) {
  const { intervalo_minutos, ...resto } = d;
  return { ...resto, intervalo_segundos: intervalo_minutos * 60 };
}

export async function criarFila(fd: FormData): Promise<EstadoForm> {
  const erro = await escrita();
  if (erro) return { erros: { _form: erro } };
  const bruto = lerFila(fd);
  if (bruto.inicio_em === "invalida") return { erros: { inicio_em: "data_invalida" } };
  const r = schemaFila.safeParse(bruto);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("ofe_filas")
    .insert(registroFila(r.data))
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/ofertas/filas");
  return {
    erros: {},
    ok: true,
    mensagem: "Fila criada. Escolha os grupos e adicione as ofertas.",
    id: data.id,
  };
}

export async function salvarFila(id: string, fd: FormData): Promise<EstadoForm> {
  const erro = await escrita();
  if (erro) return { erros: { _form: erro } };
  const bruto = lerFila(fd);
  if (bruto.inicio_em === "invalida") return { erros: { inicio_em: "data_invalida" } };
  const r = schemaFila.safeParse(bruto);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_filas").update(registroFila(r.data)).eq("id", id);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(rota(id));
  return { erros: {}, ok: true, mensagem: "Fila atualizada." };
}

export async function salvarDestinos(id: string, grupos: string[]): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const lista = z.array(z.uuid()).max(100).safeParse(grupos);
  if (!lista.success) return { ok: false, erro: "grupo_invalido" };
  const supabase = await clienteServidor();
  const { error: e1 } = await supabase.from("ofe_filas_destinos").delete().eq("fila_id", id);
  if (e1) return { ok: false, erro: chaveDoErro(e1) };
  if (lista.data.length) {
    const { error } = await supabase
      .from("ofe_filas_destinos")
      .insert(lista.data.map((g) => ({ fila_id: id, grupo_id: g })));
    if (error) return { ok: false, erro: chaveDoErro(error) };
  }
  revalidatePath(rota(id));
  return { ok: true, mensagem: `${lista.data.length} grupo(s) de destino.` };
}

async function proximaPosicao(filaId: string): Promise<number> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_filas_itens")
    .select("posicao")
    .eq("fila_id", filaId)
    .order("posicao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.posicao ?? 0) + 1;
}

export type ResultadoInclusao = {
  ok: boolean;
  mensagem?: string;
  erro?: string;
  detalhes?: string[];
};

/** Links colados (até 30 por vez): cria uma oferta por link, com dados da API quando houver. */
export async function adicionarLinks(filaId: string, texto: string): Promise<ResultadoInclusao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const links = linksColados(String(texto ?? "")).slice(0, 30);
  if (!links.length) return { ok: false, erro: "url_invalida" };
  const [anunciantes, cred] = await Promise.all([anunciantesAwin(), carregarCredenciais()]);
  const supabase = await clienteServidor();
  let posicao = await proximaPosicao(filaId);
  const detalhes: string[] = [];
  let incluidos = 0;
  let incompletos = 0;
  for (const url of links) {
    const lida = lerUrlOferta(url, anunciantes);
    if (!lida.ok) {
      detalhes.push(`${url}: ${erroPt(lida.erro)}`);
      continue;
    }
    const resolvido = await resolverParaProduto(lida.lida, anunciantes);
    const alvo = resolvido.ok ? resolvido.lida : lida.lida;
    const registro: Record<string, unknown> = {
      plataforma: alvo.plataforma,
      url_original: lida.lida.url,
      url_produto: alvo.url,
      chave_produto: alvo.chaveProduto,
      anunciante_awin: alvo.ids.anuncianteAwin ?? null,
      status: "rascunho",
      fontes: {},
    };
    if (alvo.plataforma === "shopee" && cred.shopee && alvo.ids.itemId && alvo.ids.shopId) {
      const p = await buscarProdutoShopee(cred.shopee, {
        shopId: alvo.ids.shopId,
        itemId: alvo.ids.itemId,
      });
      if (p.ok) {
        Object.assign(registro, {
          titulo: p.dados.titulo,
          imagem_url: p.dados.imagem_url,
          preco_atual: p.dados.preco_atual,
          desconto: p.dados.desconto,
          avaliacao: p.dados.avaliacao,
          loja: p.dados.loja,
          preco_variavel: p.dados.preco_variavel,
          fontes: p.dados.fontes,
          dados_atualizados_em: p.dados.atualizado_em,
          status: p.dados.titulo ? "pronta" : "rascunho",
        });
      }
    }
    const { data: o, error } = await supabase
      .from("ofe_ofertas")
      .insert(registro as never)
      .select("id, titulo")
      .single();
    if (error) {
      detalhes.push(`${url}: ${erroPt(chaveDoErro(error))}`);
      continue;
    }
    await supabase
      .from("ofe_filas_itens")
      .insert({ fila_id: filaId, oferta_id: o.id, posicao: posicao++ });
    incluidos += 1;
    if (!o.titulo) incompletos += 1;
  }
  revalidatePath(rota(filaId));
  return {
    ok: incluidos > 0,
    erro: incluidos ? undefined : "nenhum_link_valido",
    mensagem: `${incluidos} oferta(s) na fila${incompletos ? `; ${incompletos} sem nome ou preço: complete em Gerar oferta antes de ativar` : ""}.`,
    detalhes,
  };
}

/** CSV de links em massa do portal da Shopee (coluna Offer Link). */
export async function importarCsvShopee(filaId: string, texto: string): Promise<ResultadoInclusao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const r = lerCsvShopee(String(texto ?? "").slice(0, 2_000_000));
  if (!r.ok)
    return {
      ok: false,
      erro: r.erro,
      detalhes: r.colunas.length ? [`Colunas encontradas: ${r.colunas.join(", ")}`] : [],
    };
  const supabase = await clienteServidor();
  let posicao = await proximaPosicao(filaId);
  let incluidos = 0;
  const agora = new Date().toISOString();
  for (const l of r.linhas) {
    const lida = lerUrlOferta(l.urlProduto ?? l.link);
    const preco = l.preco ? lerNumeroPt(l.preco) : null;
    const fontes: Record<string, string> = {};
    if (l.nome) fontes.titulo = "csv_shopee";
    if (preco) fontes.preco_atual = "csv_shopee";
    const { data: o, error } = await supabase
      .from("ofe_ofertas")
      .insert({
        plataforma: "shopee",
        url_original: l.urlProduto ?? l.link,
        url_produto: l.urlProduto,
        chave_produto: lida.ok ? lida.lida.chaveProduto : null,
        titulo: l.nome,
        preco_atual: preco && preco > 0 ? preco : null,
        link_colado: l.link,
        fontes: fontes as Json,
        dados_atualizados_em: preco ? agora : null,
        status: l.nome ? "pronta" : "rascunho",
      })
      .select("id")
      .single();
    if (error) continue;
    await supabase
      .from("ofe_filas_itens")
      .insert({ fila_id: filaId, oferta_id: o.id, posicao: posicao++ });
    incluidos += 1;
  }
  revalidatePath(rota(filaId));
  return {
    ok: incluidos > 0,
    erro: incluidos ? undefined : "nenhum_link_valido",
    mensagem: `${incluidos} linha(s) importada(s), ${r.ignoradas.length} ignorada(s).`,
    detalhes: r.ignoradas.slice(0, 20).map((i) => `Linha ${i.linha}: ${i.motivo}`),
  };
}

export async function adicionarOfertaFila(
  filaId: string,
  ofertaId: string,
): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  if (!z.uuid().safeParse(filaId).success || !z.uuid().safeParse(ofertaId).success)
    return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_filas_itens")
    .insert({ fila_id: filaId, oferta_id: ofertaId, posicao: await proximaPosicao(filaId) });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(rota(filaId));
  return { ok: true, mensagem: "Oferta adicionada ao fim da fila." };
}

export async function adicionarCupomFila(filaId: string, cupomId: string): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_filas_itens")
    .insert({ fila_id: filaId, cupom_id: cupomId, posicao: await proximaPosicao(filaId) });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(rota(filaId));
  return { ok: true, mensagem: "Cupom adicionado ao fim da fila." };
}

export async function moverItem(
  filaId: string,
  itemId: string,
  direcao: "cima" | "baixo",
): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const supabase = await clienteServidor();
  const { data: itens } = await supabase
    .from("ofe_filas_itens")
    .select("id, posicao")
    .eq("fila_id", filaId)
    .order("posicao")
    .order("criado_em");
  const lista = itens ?? [];
  const i = lista.findIndex((x) => x.id === itemId);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };
  const ordem = [...lista];
  [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  for (let k = 0; k < ordem.length; k++)
    if (ordem[k].posicao !== k + 1)
      await supabase
        .from("ofe_filas_itens")
        .update({ posicao: k + 1 })
        .eq("id", ordem[k].id);
  revalidatePath(rota(filaId));
  return { ok: true, mensagem: "Ordem atualizada." };
}

export async function removerItem(filaId: string, itemId: string): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_filas_itens")
    .delete()
    .eq("id", itemId)
    .eq("fila_id", filaId);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(rota(filaId));
  return { ok: true, mensagem: "Item removido da fila." };
}

export async function editarTextoItem(
  filaId: string,
  itemId: string,
  texto: string,
): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const t = String(texto ?? "").trim();
  if (t.length > 4000) return { ok: false, erro: "modelo_longo" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_filas_itens")
    .update({ texto_editado: t || null })
    .eq("id", itemId)
    .eq("fila_id", filaId);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(rota(filaId));
  return { ok: true, mensagem: t ? "Texto desta postagem salvo." : "Volta a usar o modelo." };
}

function formaDeLink(
  plataforma: Plataforma,
  url: string,
  linkColado: string | null,
  cred: Credenciais,
  anunciantes: AnuncianteAwin[],
): string | null {
  if (linkColado) return null;
  if (plataforma === "mercado_livre") return "link_manual_obrigatorio";
  if (plataforma === "shopee") return cred.shopee ? null : "conversao_indisponivel";
  if (plataforma === "amazon") return cred.amazon ? null : "conversao_indisponivel";
  const lida = lerUrlOferta(url, anunciantes);
  return cred.awin && lida.ok && (lida.lida.ids.anuncianteAwin || lida.lida.linkCurto)
    ? null
    : "conversao_indisponivel";
}

export type ProblemaFila = { item: string; nome: string; problema: string };

/** Prévia e validação de todos os itens antes de ativar (nada é enviado aqui). */
export async function validarFila(
  id: string,
): Promise<{ ok: boolean; problemas: ProblemaFila[]; erro?: string }> {
  const erro = await escrita();
  if (erro) return { ok: false, problemas: [], erro };
  const supabase = await clienteServidor();
  const [
    { data: fila },
    { data: itens },
    { data: destinos },
    modelos,
    liberadas,
    cred,
    anunciantes,
  ] = await Promise.all([
    supabase.from("ofe_filas").select("modelo_id").eq("id", id).single(),
    supabase
      .from("ofe_filas_itens")
      .select("id, texto_editado, ativo, oferta:ofe_ofertas(*), cupom:ofe_cupons(*)")
      .eq("fila_id", id)
      .eq("ativo", true),
    supabase.from("ofe_filas_destinos").select("grupo:ofe_grupos(ativo, funcao)").eq("fila_id", id),
    listarModelos(),
    plataformasLiberadas(),
    carregarCredenciais(),
    anunciantesAwin(),
  ]);
  const problemas: ProblemaFila[] = [];
  const validos = (destinos ?? []).filter((d) => {
    const g = d.grupo as unknown as { ativo: boolean; funcao: string } | null;
    return g?.ativo && (g.funcao === "destino" || g.funcao === "teste");
  });
  if (!validos.length)
    problemas.push({ item: "", nome: "Fila", problema: "Nenhum grupo de destino ativo." });
  if (!(itens ?? []).length)
    problemas.push({ item: "", nome: "Fila", problema: "Nenhum item ativo." });
  for (const it of itens ?? []) {
    const o = it.oferta as unknown as Record<string, unknown> | null;
    const c = it.cupom as unknown as (CupomPreparo & { status: string }) | null;
    const plataforma = lerPlataforma(o?.plataforma ?? c?.plataforma);
    const nome = (o?.titulo as string | null) ?? (c ? `Cupom ${c.codigo ?? ""}` : "Item");
    if (!plataforma) continue;
    if (!liberadas.includes(plataforma))
      problemas.push({
        item: it.id,
        nome,
        problema: `${PLATAFORMA_ROTULO[plataforma]} sem canal liberado em Integrações.`,
      });
    if (c && !cupomPodeSair(c))
      problemas.push({ item: it.id, nome, problema: "Cupom fora da vigência." });
    if (o) {
      if (o.status === "arquivada")
        problemas.push({ item: it.id, nome, problema: "Oferta arquivada." });
      const falta = formaDeLink(
        plataforma,
        String(o.url_produto ?? o.url_original),
        (o.link_colado as string | null) ?? null,
        cred,
        anunciantes,
      );
      if (falta) problemas.push({ item: it.id, nome, problema: erroPt(falta) ?? falta });
      const modelo = escolherModelo(
        modelos,
        "oferta",
        plataforma,
        fila?.modelo_id ?? (o.modelo_id as string | null),
      );
      const corpo = it.texto_editado?.trim() || modelo?.corpo;
      if (!corpo) problemas.push({ item: it.id, nome, problema: "Sem modelo de mensagem." });
      else {
        const r = renderizarModelo(
          corpo,
          valoresDaOferta({ ...(o as Record<string, never>), plataforma } as never, "[link]", null),
        );
        if (r.ausentes.length)
          problemas.push({
            item: it.id,
            nome,
            problema: `Faltam: ${r.ausentes.map((a) => VARIAVEL_DESCRICAO[a as Variavel] ?? a).join(", ")}.`,
          });
      }
    }
  }
  return { ok: problemas.length === 0, problemas };
}

export async function mudarStatusFila(
  id: string,
  acao: "ativar" | "pausar" | "retomar" | "encerrar",
): Promise<ResultadoAcao & { problemas?: ProblemaFila[] }> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const supabase = await clienteServidor();
  const { data: f } = await supabase.from("ofe_filas").select("status").eq("id", id).single();
  if (!f) return { ok: false, erro: "nao_encontrado" };
  if (acao === "ativar" || acao === "retomar") {
    const v = await validarFila(id);
    if (!v.ok) return { ok: false, erro: "fila_com_problemas", problemas: v.problemas };
  }
  const novo = { ativar: "ativa", retomar: "ativa", pausar: "pausada", encerrar: "encerrada" }[
    acao
  ];
  const extra = acao === "ativar" && f.status !== "pausada" ? { rodada: 0, rodada_data: null } : {};
  const { error } = await supabase
    .from("ofe_filas")
    .update({ status: novo, ...extra })
    .eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  if (novo === "ativa") await supabase.rpc("ofe_avancar_filas");
  revalidatePath(rota(id));
  revalidatePath("/ofertas/filas");
  const msg = {
    ativar: "Fila ativa.",
    retomar: "Fila retomada.",
    pausar: "Fila pausada: nada novo sai até retomar.",
    encerrar: "Fila encerrada.",
  }[acao];
  return { ok: true, mensagem: msg };
}

export async function excluirFila(id: string): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_filas")
    .delete()
    .eq("id", id)
    .in("status", ["rascunho", "encerrada", "pausada"]);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/filas");
  return { ok: true, mensagem: "Fila excluída. O histórico de envios fica." };
}

export async function reenviarEnvios(ids: string[]): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const r = z.array(z.uuid()).min(1).max(200).safeParse(ids);
  if (!r.success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_reenviar", { p_envios: r.data });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/filas", "layout");
  return { ok: true, mensagem: `${data ?? 0} envio(s) voltam para a fila.` };
}

export async function descartarEnvios(ids: string[]): Promise<ResultadoAcao> {
  const erro = await escrita();
  if (erro) return { ok: false, erro };
  const r = z.array(z.uuid()).min(1).max(200).safeParse(ids);
  if (!r.success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("ofe_descartar_envios", { p_envios: r.data });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/filas", "layout");
  return { ok: true, mensagem: `${data ?? 0} envio(s) descartado(s).` };
}

/** Avança filas manuais e prepara os envios do modo assistido (chamado ao abrir Publicar). */
export async function prepararManuais(): Promise<{ preparados: number; falhas: number }> {
  if (await escrita()) return { preparados: 0, falhas: 0 };
  const supabase = await clienteServidor();
  await supabase.rpc("ofe_avancar_filas");
  const ids = await manuaisParaPreparar(20);
  if (!ids.length) return { preparados: 0, falhas: 0 };
  const [modelos, liberadas, cred, anunciantes] = await Promise.all([
    listarModelos(),
    plataformasLiberadas(),
    carregarCredenciais(),
    anunciantesAwin(),
  ]);
  let preparados = 0;
  let falhas = 0;
  for (const id of ids) {
    const ctx = await contextoEnvioManual(id);
    if (!ctx?.publicacao) continue;
    const o = ctx.publicacao.oferta;
    const c = ctx.publicacao.cupom;
    const plataforma = lerPlataforma(o?.plataforma ?? c?.plataforma);
    if (!plataforma) continue;
    const r = await prepararEnvio(
      {
        grupo: ctx.grupo,
        oferta: o ? ({ ...o, plataforma } as never) : null,
        cupom: c ? ({ ...c, plataforma } as never) : null,
        textoEditado: ctx.publicacao.texto_editado,
        modeloFila: ctx.publicacao.fila?.modelo_id ?? null,
        modelos,
        liberada: liberadas.includes(plataforma),
        linkExistente: ctx.link,
        anunciantes,
      },
      cred,
    );
    if (r.ok) {
      if (r.linkNovo && r.link && ctx.publicacao.oferta_id)
        await supabase
          .from("ofe_links")
          .upsert(
            {
              oferta_id: ctx.publicacao.oferta_id,
              grupo_id: ctx.grupo.id,
              url: r.link.url,
              origem: r.link.origem,
            },
            { onConflict: "oferta_id,grupo_id" },
          );
      await supabase.rpc("ofe_preparar_envio", {
        p_envio: id,
        p_texto: r.texto,
        p_link: r.link?.url ?? (null as unknown as string),
        p_origem: r.link?.origem ?? (null as unknown as string),
      });
      preparados += 1;
    } else {
      await supabase.rpc("ofe_preparar_envio", {
        p_envio: id,
        p_texto: null as unknown as string,
        p_link: null as unknown as string,
        p_origem: null as unknown as string,
        p_motivo: r.motivo,
        p_detalhe: r.detalhe ?? (null as unknown as string),
      });
      falhas += 1;
    }
  }
  if (preparados || falhas) revalidatePath("/ofertas/publicar");
  return { preparados, falhas };
}
