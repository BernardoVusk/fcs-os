"use server";

import { revalidatePath } from "next/cache";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { EstadoForm } from "@/lib/forms";
import { lerCatalogo, nomeSugerido } from "@/dominio/produtos/importacao-csv";

/**
 * Importa um CSV do catálogo (dados/catalogo). Idempotente por (canal, id do anúncio): anúncio novo cria
 * produto em rascunho com nome sugerido e preço vigente; anúncio conhecido só atualiza métricas e preço.
 * Peso, tempo e material nunca são preenchidos pela importação.
 */
export async function importarCatalogo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { erros: { arquivo: "arquivo_obrigatorio" } };
  if (arquivo.size > 5 * 1024 * 1024) return { erros: { arquivo: "arquivo_grande" } };
  let leitura;
  try {
    leitura = lerCatalogo(await arquivo.text());
  } catch {
    return { erros: { arquivo: "csv_invalido" } };
  }
  if (leitura.linhas.length === 0) return { erros: { arquivo: "csv_vazio" } };
  const supabase = await clienteServidor();
  const { data: canais } = await supabase.from("canais_venda").select("id, tipo, nome");
  const canalPorTipo = new Map((canais ?? []).map((c) => [c.tipo, c.id]));
  const chaves = leitura.linhas.map((l) => l.codigo_externo);
  const { data: existentes } = await supabase
    .from("produtos_anuncios")
    .select("id, produto_id, canal_id, codigo_externo")
    .in("codigo_externo", chaves);
  const porChave = new Map((existentes ?? []).map((a) => [`${a.canal_id}:${a.codigo_externo}`, a]));
  let criadas = 0;
  let atualizadas = 0;
  const ignoradas = leitura.ignoradas.map((i) => `linha ${i.linha}: ${i.motivo}`);
  for (const l of leitura.linhas) {
    const canalId = canalPorTipo.get(l.canal.replace(/-/g, "_"));
    if (!canalId) {
      ignoradas.push(`${l.canal} ${l.codigo_externo}: canal não cadastrado`);
      continue;
    }
    const metricas = {
      titulo: l.titulo,
      preco: l.preco,
      estoque: l.estoque,
      vendas_total: l.vendas_total,
      vendas_periodo: l.vendas_periodo,
      visitas_periodo: l.visitas_periodo,
      conversao: l.conversao,
      nota: l.nota,
      avaliacoes: l.avaliacoes,
      fotos: l.fotos,
      categoria_externa: l.categoria_externa,
      coletado_em: l.coletado_em,
    };
    const existente = porChave.get(`${canalId}:${l.codigo_externo}`);
    if (existente) {
      const { error } = await supabase
        .from("produtos_anuncios")
        .update(metricas)
        .eq("id", existente.id);
      if (error) {
        ignoradas.push(`${l.canal} ${l.codigo_externo}: ${error.message}`);
        continue;
      }
      if (l.preco != null)
        await registrarPrecoSeMudou(
          supabase,
          existente.produto_id,
          canalId,
          l.preco,
          l.coletado_em,
        );
      atualizadas++;
      continue;
    }
    const { data: produto, error: e1 } = await supabase
      .from("produtos")
      .insert({
        nome: nomeSugerido(l.titulo),
        descricao: l.titulo,
        status: "rascunho",
        origem: "importacao",
      })
      .select("id")
      .single();
    if (e1) {
      ignoradas.push(`${l.canal} ${l.codigo_externo}: ${e1.message}`);
      continue;
    }
    const { error: e2 } = await supabase
      .from("produtos_anuncios")
      .insert({
        produto_id: produto.id,
        canal_id: canalId,
        codigo_externo: l.codigo_externo,
        ...metricas,
      });
    if (e2) {
      ignoradas.push(`${l.canal} ${l.codigo_externo}: ${e2.message}`);
      continue;
    }
    if (l.preco != null) {
      await supabase
        .from("produtos_precos_canal")
        .insert({
          produto_id: produto.id,
          canal_id: canalId,
          preco_venda: l.preco,
          vigente_desde: l.coletado_em ?? new Date().toISOString().slice(0, 10),
          origem: "importacao",
        });
    }
    criadas++;
  }
  revalidatePath("/catalogo", "layout");
  const resumo = `${criadas} produto(s) criado(s) em rascunho, ${atualizadas} anúncio(s) atualizado(s), ${ignoradas.length} linha(s) ignorada(s).`;
  return {
    erros: {},
    ok: true,
    mensagem:
      ignoradas.length > 0
        ? `${resumo} Ignoradas: ${ignoradas.slice(0, 10).join("; ")}${ignoradas.length > 10 ? "..." : ""}`
        : resumo,
  };
}

async function registrarPrecoSeMudou(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  produtoId: string,
  canalId: string,
  preco: number,
  data: string | null,
) {
  const { data: vigente } = await supabase
    .from("produtos_precos_vigentes")
    .select("preco_venda")
    .eq("produto_id", produtoId)
    .eq("canal_id", canalId)
    .is("variacao_id", null)
    .maybeSingle();
  if (vigente && Number(vigente.preco_venda) === preco) return;
  await supabase
    .from("produtos_precos_canal")
    .insert({
      produto_id: produtoId,
      canal_id: canalId,
      preco_venda: preco,
      vigente_desde: data ?? new Date().toISOString().slice(0, 10),
      origem: "importacao",
    });
}
