"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/tipos/banco";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro, erroPt } from "@/lib/erros-pt";
import { lerCampos, type EstadoForm, type ResultadoAcao } from "@/lib/forms";
import { META_INTEGRACAO, validarCampos } from "@/dominio/ofertas/integracoes";
import { lerPlataforma, PLATAFORMA_ROTULO, type Plataforma } from "@/dominio/ofertas/plataformas";
import { statusDoTeste } from "@/dominio/ofertas/teste-integracao";
import {
  tagAmazonValida,
  ORIGEM_LINK_ROTULO,
  type OrigemLink,
} from "@/dominio/ofertas/links-afiliado";
import { lerUrlOferta } from "@/dominio/ofertas/urls";
import { carregarCredenciais } from "@/integracoes/credenciais";
import { fecharSegredo, redigir } from "@/integracoes/segredo";
import { testarShopee } from "@/integracoes/shopee";
import { listarProgramasAwin, testarAwin } from "@/integracoes/awin";
import { converterLink } from "@/integracoes/conversor";
import { anunciantesAwin } from "@/dados/ofertas/integracoes";

const ROTA = "/ofertas/integracoes";

async function dono(): Promise<boolean> {
  try {
    await exigirEscrita("usuarios");
    return true;
  } catch {
    return false;
  }
}

/** Teste real da plataforma; grava status, último erro e o que ficou confirmado. */
async function testar(p: Plataforma): Promise<ResultadoAcao> {
  const supabase = await clienteServidor();
  const cred = await carregarCredenciais();
  let ok = false;
  let configurada = false;
  let erro: string | undefined;
  let detalhe: string | undefined;
  let recursos: Record<string, unknown> = {};

  if (p === "shopee" && cred.shopee) {
    configurada = true;
    const r = await testarShopee(cred.shopee);
    ok = r.ok;
    if (r.ok) recursos = { conexao: true };
    else ({ erro, detalhe } = r);
  } else if (p === "awin" && cred.awin) {
    configurada = true;
    const r = await testarAwin(cred.awin);
    if (r.ok) {
      const programas = await listarProgramasAwin(cred.awin);
      ok = programas.ok;
      if (programas.ok) {
        const lista = programas.dados;
        if (lista.length > 0) {
          await supabase.from("ofe_awin_anunciantes").upsert(
            lista.map((a) => ({
              advertiser_id: a.advertiserId,
              nome: a.nome,
              dominios: a.dominios,
              deeplink_permitido: a.deeplink,
              sincronizado_em: new Date().toISOString(),
            })),
            { onConflict: "advertiser_id" },
          );
          await supabase
            .from("ofe_awin_anunciantes")
            .delete()
            .not("advertiser_id", "in", `(${lista.map((a) => a.advertiserId).join(",")})`);
        } else {
          await supabase.from("ofe_awin_anunciantes").delete().gt("advertiser_id", 0);
        }
        recursos = { conexao: true, conta: r.dados.conta, anunciantes: lista.length };
      } else ({ erro, detalhe } = programas);
    } else ({ erro, detalhe } = r);
  } else if (p === "amazon" && cred.amazon) {
    configurada = true;
    ok = tagAmazonValida(cred.amazon.tag);
    if (ok) recursos = { links_por_tag: true };
    else erro = "tag_invalida";
  } else if (p === "mercado_livre") {
    configurada = true;
    ok = true;
    recursos = { links_manuais: true };
  }

  const status = statusDoTeste(p, { configurada, ok, erro });
  const mensagemErro = erro
    ? redigir(`${erroPt(erro) ?? erro}${detalhe ? ` (${detalhe})` : ""}`, cred.segredos).slice(
        0,
        500,
      )
    : null;
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("ofe_integracoes")
    .update({
      status,
      recursos: recursos as Json,
      testado_em: configurada ? agora : null,
      ultimo_erro: mensagemErro,
      ultimo_erro_em: mensagemErro ? agora : null,
    })
    .eq("plataforma", p);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  await supabase.rpc("ofe_gerar_alertas");
  revalidatePath(ROTA);
  revalidatePath("/ofertas");
  if (!configurada) return { ok: false, erro: "credencial_ausente" };
  if (!ok) return { ok: false, erro: mensagemErro ?? "erro_inesperado" };
  const nome = PLATAFORMA_ROTULO[p];
  if (p === "mercado_livre")
    return {
      ok: true,
      mensagem: `${nome}: sem API de links. Os links vêm do portal e são colados na oferta.`,
    };
  if (p === "amazon")
    return { ok: true, mensagem: `${nome}: ID de associado válido. Links montados com a tag.` };
  return { ok: true, mensagem: `${nome}: conexão confirmada pela API.` };
}

export async function testarIntegracao(plataforma: string): Promise<ResultadoAcao> {
  if (!(await dono())) return { ok: false, erro: "sem_permissao" };
  const p = lerPlataforma(plataforma);
  if (!p) return { ok: false, erro: "nao_encontrado" };
  return testar(p);
}

/** Salva identificadores públicos e, se digitados, os segredos (cifrados); depois testa. */
export async function salvarIntegracao(plataforma: string, fd: FormData): Promise<EstadoForm> {
  if (!(await dono())) return { erros: { _form: "sem_permissao" } };
  const p = lerPlataforma(plataforma);
  if (!p) return { erros: { _form: "nao_encontrado" } };
  const meta = META_INTEGRACAO[p];
  const supabase = await clienteServidor();
  const { data: atual } = await supabase
    .from("ofe_integracoes")
    .select("identificadores, segredo_configurado_em")
    .eq("plataforma", p)
    .single();
  const publicos = lerCampos(
    fd,
    meta.publicos.map((c) => c.nome),
  );
  const secretos = lerCampos(
    fd,
    meta.secretos.map((c) => c.nome),
  );
  const digitouSegredo = Object.values(secretos).some((v) => v.length > 0);
  const erros = {
    ...validarCampos(meta.publicos, publicos, true),
    ...validarCampos(meta.secretos, secretos, !atual?.segredo_configurado_em || digitouSegredo),
  };
  if (Object.keys(erros).length > 0) return { erros };

  const identificadores = Object.fromEntries(
    Object.entries(publicos).filter(([, v]) => v.length > 0),
  );
  const { error } = await supabase
    .from("ofe_integracoes")
    .update({ identificadores })
    .eq("plataforma", p);
  if (error) return { erros: { _form: chaveDoErro(error) } };

  if (digitouSegredo) {
    let fechado;
    try {
      fechado = fecharSegredo(p, secretos);
    } catch (e) {
      return {
        erros: {
          _form:
            (e as Error).message === "chave_cripto_ausente"
              ? "chave_cripto_ausente"
              : "erro_inesperado",
        },
      };
    }
    const { error: e2 } = await supabase.rpc("ofe_salvar_segredo", {
      p_plataforma: p,
      p_segredo: fechado.segredo,
      p_chave_id: fechado.chaveId,
    });
    if (e2) return { erros: { _form: chaveDoErro(e2) } };
  }
  const teste = await testar(p);
  return teste.ok
    ? { erros: {}, ok: true, mensagem: `Salvo. ${teste.mensagem ?? ""}`.trim() }
    : {
        erros: {},
        ok: true,
        mensagem: `Salvo, mas o teste falhou: ${erroPt(teste.erro) ?? teste.erro}`,
      };
}

export async function removerCredencial(plataforma: string): Promise<ResultadoAcao> {
  if (!(await dono())) return { ok: false, erro: "sem_permissao" };
  const p = lerPlataforma(plataforma);
  if (!p) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_remover_segredo", { p_plataforma: p });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  await supabase.rpc("ofe_gerar_alertas");
  revalidatePath(ROTA);
  return {
    ok: true,
    mensagem: "Credencial removida. Links dessa plataforma voltam a exigir link colado.",
  };
}

const schemaConformidade = z.object({
  observacao: z
    .string()
    .min(3, { error: "observacao_obrigatoria" })
    .max(500, { error: "texto_longo" }),
});

/** Trava de conformidade: o dono registra que o canal WhatsApp está cadastrado no programa. */
export async function registrarConformidade(plataforma: string, fd: FormData): Promise<EstadoForm> {
  let usuario;
  try {
    usuario = await exigirEscrita("usuarios");
  } catch {
    return { erros: { _form: "sem_permissao" } };
  }
  const p = lerPlataforma(plataforma);
  if (!p) return { erros: { _form: "nao_encontrado" } };
  const r = schemaConformidade.safeParse({ observacao: String(fd.get("observacao") ?? "").trim() });
  if (!r.success) return { erros: { observacao: r.error.issues[0].message } };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_integracoes")
    .update({
      conformidade_em: new Date().toISOString(),
      conformidade_por: usuario.id,
      conformidade_observacao: r.data.observacao,
    })
    .eq("plataforma", p);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(ROTA);
  return {
    erros: {},
    ok: true,
    mensagem: `${PLATAFORMA_ROTULO[p]} liberada para publicar em grupos.`,
  };
}

export async function retirarConformidade(plataforma: string): Promise<ResultadoAcao> {
  if (!(await dono())) return { ok: false, erro: "sem_permissao" };
  const p = lerPlataforma(plataforma);
  if (!p) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_integracoes")
    .update({ conformidade_em: null, conformidade_por: null, conformidade_observacao: null })
    .eq("plataforma", p);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(ROTA);
  return { ok: true, mensagem: `${PLATAFORMA_ROTULO[p]} volta a gerar só rascunho.` };
}

export type ResultadoTesteConversao =
  { ok: true; url: string; origem: string } | { ok: false; erro: string };

/** Converte uma URL de exemplo sem gravar nada, para conferir a atribuição. */
export async function testarConversao(
  plataforma: string,
  url: string,
): Promise<ResultadoTesteConversao> {
  if (!(await dono())) return { ok: false, erro: "sem_permissao" };
  const p = lerPlataforma(plataforma);
  if (!p) return { ok: false, erro: "nao_encontrado" };
  const anunciantes = await anunciantesAwin();
  const lida = lerUrlOferta(String(url ?? ""), anunciantes);
  if (!lida.ok) return { ok: false, erro: lida.erro };
  if (lida.lida.plataforma !== p) return { ok: false, erro: "plataforma_diferente" };
  const cred = await carregarCredenciais();
  const r = await converterLink(
    { lida: lida.lida, atribuicao: { campanha: "teste" }, anunciantes },
    cred,
  );
  if (!r.ok) {
    const texto = `${erroPt(r.erro) ?? r.erro}${"detalhe" in r && r.detalhe ? ` (${r.detalhe})` : ""}`;
    return { ok: false, erro: redigir(texto, cred.segredos) };
  }
  return { ok: true, url: r.url, origem: ORIGEM_LINK_ROTULO[r.origem as OrigemLink] };
}
