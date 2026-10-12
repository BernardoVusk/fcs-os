"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { formatarMoeda } from "@/lib/formatos/moeda";
import {
  contextoProdutoCom,
  entradasDoContexto,
  type ContextoProduto,
} from "@/dados/produtos/calculo";
import { calcular } from "@/dominio/custos/motor";
import { avaliarPreco } from "@/dominio/precos/preco";
import { FALTA_ROTULO } from "@/dominio/produtos/calculo-produto";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";

type Motivo = "manual" | "recalculo";

/** Calcula um produto (ou variação) sem canal, grava o snapshot e atualiza o cache da ficha. */
async function calcularEGravar(
  cliente: ClienteBanco,
  ctx: ContextoProduto,
  motivo: Motivo,
): Promise<
  | {
      ok: true;
      custo_total: number;
      custo_variavel: number;
      custo_exato: string;
      fixo_exato: string;
      calculoId: string;
    }
  | { ok: false; faltam: string[] }
> {
  const m = entradasDoContexto(ctx, null);
  if (!m.ok) return { ok: false, faltam: m.faltam };
  const resultado = calcular(m.entradas);
  const nome = ctx.variacao ? `${ctx.produto.nome} (${ctx.variacao.nome})` : ctx.produto.nome;
  const { data, error } = await cliente
    .from("calculos_custo")
    .insert({
      nome,
      produto_id: ctx.produto.id,
      variacao_id: ctx.variacao?.id ?? null,
      insumo_id: ctx.insumo?.id ?? null,
      impressora_id: ctx.impressora?.id ?? null,
      parametros_versao: ctx.parametros?.versao ?? null,
      entradas: JSON.parse(JSON.stringify(m.entradas)),
      resultado: JSON.parse(JSON.stringify(resultado)),
      custo_variavel: resultado.custo.custo_variavel,
      custo_unitario_total: resultado.custo.custo_total,
      preco_sugerido: null,
      metodo_margem: null,
      margem_alvo: m.entradas.margem_alvo,
      markup_alvo: null,
      versao_motor: resultado.versao_motor,
      motivo,
    })
    .select("id")
    .single();
  if (error) throw error;
  const cache = {
    custo_atual: resultado.custo.custo_total,
    custo_variavel_atual: resultado.custo.custo_variavel,
    calculo_atual_id: data.id,
  };
  if (ctx.variacao)
    await cliente.from("produtos_variacoes").update(cache).eq("id", ctx.variacao.id);
  else
    await cliente
      .from("produtos")
      .update({ ...cache, custo_atualizado_em: new Date().toISOString() })
      .eq("id", ctx.produto.id);
  return {
    ok: true,
    custo_total: resultado.custo.custo_total,
    custo_variavel: resultado.custo.custo_variavel,
    custo_exato: resultado.custo.exato.custo_total,
    fixo_exato: resultado.custo.exato.fixo_rateado,
    calculoId: data.id,
  };
}

/** Margem em cada preço vigente do produto; abre ou resolve o alerta margem_reduzida. */
async function avaliarMargens(
  cliente: ClienteBanco,
  ctx: ContextoProduto,
  custoExato: string,
  fixoExato: string,
): Promise<{ abaixo: string[] }> {
  const { data: precos } = await cliente
    .from("produtos_precos_vigentes")
    .select("*")
    .eq("produto_id", ctx.produto.id)
    .is("variacao_id", null);
  const alvo = ctx.produto.margem_alvo ?? ctx.parametros?.dados.margem_alvo_padrao ?? null;
  const imposto = ctx.parametros?.dados.imposto_pct_estimado ?? null;
  const abaixo: string[] = [];
  for (const p of precos ?? []) {
    const canal = ctx.canais.find((c) => c.id === p.canal_id);
    if (!canal?.taxas || imposto == null || p.preco_venda == null) continue;
    const a = avaliarPreco(
      {
        custo_total: custoExato,
        fixo_rateado: fixoExato,
        complementares_pedido: ctx.bom.por_pedido,
        canal: { ...canal.taxas, imposto_pct: imposto },
      },
      p.preco_venda,
    );
    await cliente
      .from("produtos_precos_canal")
      .update({ margem_estimada_cache: a.margem, calculo_custo_id: ctx.produto.calculo_atual_id })
      .eq("id", p.id!);
    if (alvo != null && a.margem < alvo)
      abaixo.push(`${canal.nome} (${(a.margem * 100).toFixed(1)} %)`);
  }
  if (abaixo.length > 0) {
    const { error } = await cliente.from("alertas").insert({
      tipo: "margem_reduzida",
      severidade: "atencao",
      titulo: `Margem abaixo do alvo: ${ctx.produto.nome}`,
      descricao: `Com o custo atual, a margem ficou abaixo de ${((alvo ?? 0) * 100).toFixed(0)} % em: ${abaixo.join(", ")}. Revise o preço.`,
      entidade_tipo: "produto",
      entidade_id: ctx.produto.id,
    });
    if (error && error.code !== "23505") throw error;
  } else {
    await cliente
      .from("alertas")
      .update({ resolvido_em: new Date().toISOString() })
      .eq("tipo", "margem_reduzida")
      .eq("entidade_tipo", "produto")
      .eq("entidade_id", ctx.produto.id)
      .is("resolvido_em", null);
  }
  return { abaixo };
}

export async function calcularProduto(
  produtoId: string,
  variacaoId: string | null,
): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(produtoId).success) return { ok: false, erro: "nao_encontrado" };
  const cliente = await clienteServidor();
  const ctx = await contextoProdutoCom(cliente, produtoId, variacaoId);
  if (!ctx) return { ok: false, erro: "nao_encontrado" };
  try {
    const r = await calcularEGravar(cliente, ctx, "manual");
    if (!r.ok)
      return {
        ok: false,
        erro: "calculo_incompleto",
        mensagem: r.faltam.map((f) => FALTA_ROTULO[f] ?? f).join(", "),
      };
    let aviso = "";
    if (!ctx.variacao) {
      const m = await avaliarMargens(
        cliente,
        { ...ctx, produto: { ...ctx.produto, calculo_atual_id: r.calculoId } },
        r.custo_exato,
        r.fixo_exato,
      );
      if (m.abaixo.length > 0) aviso = ` Margem abaixo do alvo em ${m.abaixo.join(", ")}.`;
    }
    revalidatePath(`/catalogo/produtos/${produtoId}`);
    revalidatePath("/catalogo", "layout");
    revalidatePath("/");
    return {
      ok: true,
      mensagem: `Custo calculado: ${formatarMoeda(r.custo_total, 4)} por peça.${aviso}`,
    };
  } catch (e) {
    return { ok: false, erro: chaveDoErro(e as { code?: string; message?: string }) };
  }
}

/** Recalcula todos os produtos não descontinuados; grava snapshot só quando o custo mudou ou estava desatualizado. */
export async function recalcularProdutos(): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const cliente = await clienteServidor();
  const { data: produtos } = await cliente
    .from("produtos")
    .select("id, nome, custo_atual, custo_atualizado_em")
    .neq("status", "descontinuado")
    .order("nome");
  let recalculados = 0;
  let incompletos = 0;
  let alertas = 0;
  for (const p of produtos ?? []) {
    const ctx = await contextoProdutoCom(cliente, p.id, null);
    if (!ctx) continue;
    const m = entradasDoContexto(ctx, null);
    if (!m.ok) {
      incompletos++;
      continue;
    }
    const previa = calcular(m.entradas);
    const mudou =
      p.custo_atual == null ||
      Number(p.custo_atual) !== previa.custo.custo_total ||
      p.custo_atualizado_em == null;
    let custoExato = previa.custo.exato.custo_total;
    let fixoExato = previa.custo.exato.fixo_rateado;
    let calculoId = ctx.produto.calculo_atual_id;
    if (mudou) {
      const r = await calcularEGravar(cliente, ctx, "recalculo");
      if (!r.ok) {
        incompletos++;
        continue;
      }
      custoExato = r.custo_exato;
      fixoExato = r.fixo_exato;
      calculoId = r.calculoId;
      recalculados++;
    }
    const a = await avaliarMargens(
      cliente,
      { ...ctx, produto: { ...ctx.produto, calculo_atual_id: calculoId } },
      custoExato,
      fixoExato,
    );
    if (a.abaixo.length > 0) alertas++;
  }
  revalidatePath("/catalogo", "layout");
  revalidatePath("/");
  return {
    ok: true,
    mensagem: `${recalculados} recalculado(s), ${incompletos} sem dados suficientes, ${alertas} com margem abaixo do alvo.`,
  };
}
