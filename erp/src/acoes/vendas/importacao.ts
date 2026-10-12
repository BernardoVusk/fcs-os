"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoForm, ResultadoAcao } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import {
  hashTexto,
  lerPedidosCsv,
  MAPEAMENTO_PADRAO,
  type MapeamentoPedidos,
} from "@/dominio/vendas/importacao-pedidos";
import { atualizarResumoCom } from "@/dados/vendas/pedidos";

const mapaSchema = z
  .object({
    codigo_externo: z.string().min(1),
    data_pedido: z.string().min(1),
    item_quantidade: z.string().min(1),
    item_preco: z.string().min(1),
    formato_data: z.enum(["iso", "br", "br_hora"]).optional(),
  })
  .catchall(z.string().optional());

/** Guarda o mapeamento de colunas do canal (hipótese inicial por tipo, conferida com o arquivo real). */
export async function salvarMapeamento(
  canalId: string,
  mapa: Record<string, string>,
): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const r = mapaSchema.safeParse(mapa);
  if (!r.success) return { ok: false, erro: "entradas_invalidas" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("canais_venda")
    .update({ mapeamento_pedidos: r.data })
    .eq("id", canalId);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/vendas/importar");
  return { ok: true, mensagem: "Mapeamento salvo." };
}

/**
 * Importa pedidos de um CSV do canal. Idempotente por hash do arquivo e por (canal, código externo):
 * pedido novo entra com status padrão e evento; pedido conhecido só atualiza cabeçalho e avança status.
 */
export async function importarPedidos(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("vendas");
  const canalId = String(fd.get("canal_id") ?? "");
  if (!z.uuid().safeParse(canalId).success) return { erros: { canal_id: "canal_obrigatorio" } };
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { erros: { arquivo: "arquivo_obrigatorio" } };
  if (arquivo.size > 10 * 1024 * 1024) return { erros: { arquivo: "arquivo_grande" } };
  const texto = await arquivo.text();
  const hash = await hashTexto(texto);
  const supabase = await clienteServidor();
  const { data: repetida } = await supabase
    .from("importacoes")
    .select("id, em")
    .eq("hash_sha256", hash)
    .maybeSingle();
  if (repetida) return { erros: { arquivo: "importacao_repetida" } };
  const { data: canal } = await supabase
    .from("canais_venda")
    .select("id, tipo, mapeamento_pedidos")
    .eq("id", canalId)
    .maybeSingle();
  if (!canal) return { erros: { canal_id: "canal_obrigatorio" } };
  const mapaGuardado = canal.mapeamento_pedidos as Partial<MapeamentoPedidos>;
  const mapa: MapeamentoPedidos = {
    ...(MAPEAMENTO_PADRAO[canal.tipo] ?? MAPEAMENTO_PADRAO.outro),
    ...Object.fromEntries(Object.entries(mapaGuardado).filter(([, v]) => v)),
  } as MapeamentoPedidos;
  const leitura = lerPedidosCsv(texto, mapa);
  if (leitura.faltando.length > 0)
    return {
      erros: {
        arquivo: "csv_colunas_faltando",
        _form: `Colunas não encontradas para: ${leitura.faltando.join(", ")}. Confira o mapeamento.`,
      },
    };
  if (leitura.pedidos.length === 0) return { erros: { arquivo: "csv_vazio" } };

  const [{ data: padrao }, { data: vigente }, { data: statusLista }] = await Promise.all([
    supabase.from("pedidos_status").select("id").eq("padrao", true).maybeSingle(),
    supabase
      .from("canais_venda_vigentes")
      .select("comissao_pct, taxa_pagamento_pct, taxa_fixa_item")
      .eq("id", canalId)
      .maybeSingle(),
    supabase.from("pedidos_status").select("codigo, nome").eq("ativo", true),
  ]);
  if (!padrao) return { erros: { _form: "status_invalido" } };
  const codigos = leitura.pedidos.map((p) => p.codigo_externo);
  const { data: existentes } = await supabase
    .from("pedidos")
    .select("id, codigo_externo")
    .eq("canal_id", canalId)
    .in("codigo_externo", codigos);
  const porCodigo = new Map((existentes ?? []).map((p) => [p.codigo_externo!, p.id]));
  const anuncios = [
    ...new Set(
      leitura.pedidos
        .flatMap((p) => p.itens.map((i) => i.codigo_anuncio))
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: ligacoes } = anuncios.length
    ? await supabase
        .from("produtos_anuncios")
        .select("codigo_externo, produto_id, variacao_id")
        .eq("canal_id", canalId)
        .in("codigo_externo", anuncios)
    : { data: [] };
  const produtoPorAnuncio = new Map((ligacoes ?? []).map((a) => [a.codigo_externo, a]));
  const skus = [
    ...new Set(
      leitura.pedidos
        .flatMap((p) => p.itens.map((i) => i.sku))
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: porSku } = skus.length
    ? await supabase.from("produtos").select("id, sku").in("sku", skus)
    : { data: [] };
  const produtoPorSku = new Map((porSku ?? []).map((p) => [p.sku!, p.id]));
  const statusPorNome = new Map((statusLista ?? []).map((s) => [s.nome.toLowerCase(), s.codigo]));

  const { data: importacao, error: eImp } = await supabase
    .from("importacoes")
    .insert({
      canal_id: canalId,
      tipo: "pedidos",
      nome_arquivo: arquivo.name,
      hash_sha256: hash,
      total_linhas: leitura.pedidos.length + leitura.ignoradas.length,
    })
    .select("id")
    .single();
  if (eImp) return { erros: { _form: chaveDoErro(eImp) } };
  let criadas = 0;
  let atualizadas = 0;
  const erros: string[] = leitura.ignoradas.map((i) => `linha ${i.linha}: ${i.motivo}`);
  for (const p of leitura.pedidos) {
    const cabecalho = {
      canal_id: canalId,
      codigo_externo: p.codigo_externo,
      data_pedido: p.data_pedido ?? new Date().toISOString().slice(0, 10),
      descontos_vendedor: p.descontos_vendedor,
      frete_cobrado: p.frete_cobrado,
      frete_pago: p.frete_pago,
      taxas_canal_informadas: p.taxas_canal,
      taxas_pagamento_informadas: p.taxas_pagamento,
      total_bruto_informado: p.total_bruto,
      status_canal: p.status_canal,
      comissao_pct: vigente?.comissao_pct ?? null,
      taxa_pagamento_pct: vigente?.taxa_pagamento_pct ?? null,
      taxa_fixa_item: vigente?.taxa_fixa_item ?? null,
    };
    let pedidoId = porCodigo.get(p.codigo_externo);
    if (pedidoId) {
      const { error } = await supabase
        .from("pedidos")
        .update({
          descontos_vendedor: cabecalho.descontos_vendedor,
          frete_cobrado: cabecalho.frete_cobrado,
          frete_pago: cabecalho.frete_pago,
          taxas_canal_informadas: cabecalho.taxas_canal_informadas,
          taxas_pagamento_informadas: cabecalho.taxas_pagamento_informadas,
          total_bruto_informado: cabecalho.total_bruto_informado,
          status_canal: cabecalho.status_canal,
        })
        .eq("id", pedidoId);
      if (error) {
        erros.push(`${p.codigo_externo}: ${error.message}`);
        continue;
      }
      atualizadas++;
    } else {
      const { data, error } = await supabase
        .from("pedidos")
        .insert({
          ...cabecalho,
          status_id: padrao.id,
          origem: "importacao",
          importacao_id: importacao.id,
        })
        .select("id")
        .single();
      if (error) {
        erros.push(`${p.codigo_externo}: ${error.message}`);
        continue;
      }
      pedidoId = data.id;
      await supabase.from("pedidos_eventos").insert({
        pedido_id: pedidoId,
        de_status_id: null,
        para_status_id: padrao.id,
        origem: "importacao",
        nota: `Importado de ${arquivo.name}`,
      });
      const itens = p.itens.map((i, ordem) => {
        const lig = i.codigo_anuncio ? produtoPorAnuncio.get(i.codigo_anuncio) : undefined;
        return {
          pedido_id: pedidoId!,
          ordem,
          produto_id: lig?.produto_id ?? (i.sku ? (produtoPorSku.get(i.sku) ?? null) : null),
          variacao_id: lig?.variacao_id ?? null,
          codigo_anuncio: i.codigo_anuncio,
          titulo: i.titulo,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto: i.desconto,
        };
      });
      const { error: eItens } = await supabase.from("pedidos_itens").insert(itens);
      if (eItens) erros.push(`${p.codigo_externo}: itens: ${eItens.message}`);
      criadas++;
    }
    // Status do canal: só avança, e só quando o nome bate com um status nosso.
    const codigoStatus = p.status_canal
      ? statusPorNome.get(p.status_canal.toLowerCase())
      : undefined;
    if (codigoStatus) {
      const { error } = await supabase.rpc("mudar_status_pedido", {
        p_pedido: pedidoId,
        p_status_codigo: codigoStatus,
        p_nota: `Status do canal: ${p.status_canal}`,
        p_origem: "importacao",
      });
      if (error) erros.push(`${p.codigo_externo}: status: ${error.message}`);
    }
    await atualizarResumoCom(supabase, pedidoId);
  }
  await supabase
    .from("importacoes")
    .update({ criadas, atualizadas, ignoradas: erros.length, erros })
    .eq("id", importacao.id);
  revalidatePath("/vendas", "layout");
  revalidatePath("/");
  const resumo = `${criadas} pedido(s) criado(s), ${atualizadas} atualizado(s), ${erros.length} aviso(s).`;
  return {
    erros: {},
    ok: true,
    mensagem: erros.length
      ? `${resumo} ${erros.slice(0, 8).join("; ")}${erros.length > 8 ? "..." : ""}`
      : resumo,
  };
}
