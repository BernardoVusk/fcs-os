import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";
import { contextoProdutoCom, entradasDoContexto } from "@/dados/produtos/calculo";
import { calcular } from "@/dominio/custos/motor";

// Produto com a ficha do caso A1 (Anexo A): custo 13,2280 por peça; ordem de 2 peças concluída e reaberta.
let dono: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
let versao: number;
let impressoraId: string;
let canalId: string;
let plaId: string;
let imaId: string;
let loteId: string;
let produtoId: string;
let ordemId: string;
const compras: string[] = [];

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("leitura")]);
  const c = dono.cliente;
  versao = (
    await c
      .from("parametros_custo")
      .insert({
        vigente_desde: "2026-01-04",
        dados: {
          tarifa_kwh: 0.95,
          custo_hora_mao_obra: 30,
          metodo_rateio_fixo: "desligado",
          imposto_pct_estimado: 0.06,
          margem_alvo_padrao: 0.25,
          taxa_falha_padrao: 0,
          desperdicio_padrao: 0,
        },
      })
      .select("versao")
      .single()
  ).data!.versao;
  impressoraId = (
    await c
      .from("impressoras")
      .insert({
        nome: `Impressora produção ${sufixo}`,
        custo_aquisicao: 4500,
        valor_residual: 500,
        vida_util_horas: 8000,
        potencia_media_w: 120,
        custo_manutencao_ano: 400,
        custo_consumiveis_ano: 200,
        horas_produtivas_ano: 2000,
      })
      .select("id")
      .single()
  ).data!.id;
  canalId = (
    await c
      .from("canais_venda")
      .insert({ nome: `Canal produção ${sufixo}`, tipo: "outro" })
      .select("id")
      .single()
  ).data!.id;
  await c
    .from("canais_venda_taxas")
    .insert({
      canal_id: canalId,
      vigente_desde: "2026-01-01",
      comissao_pct: 0.14,
      taxa_pagamento_pct: 0.02,
      ads_pct_padrao: 0,
      taxa_fixa_item: 4,
      frete_subsidio_padrao: 0,
    });
  plaId = (
    await c
      .from("insumos")
      .insert({ nome: `PLA produção ${sufixo}`, tipo: "filamento", unidade_base: "g" })
      .select("id")
      .single()
  ).data!.id;
  imaId = (
    await c
      .from("insumos")
      .insert({ nome: `Ímã produção ${sufixo}`, tipo: "componente", unidade_base: "un" })
      .select("id")
      .single()
  ).data!.id;
  const compra = (await c.from("compras").insert({ data: "2026-10-12" }).select("id").single())
    .data!.id;
  compras.push(compra);
  await c.from("compras_itens").insert([
    {
      compra_id: compra,
      ordem: 0,
      insumo_id: plaId,
      quantidade: 1,
      unidade: "un",
      preco_unitario: 125,
      peso_util_g: 1000,
      lote_codigo: `PROD-${sufixo}`,
    },
    {
      compra_id: compra,
      ordem: 1,
      insumo_id: imaId,
      quantidade: 100,
      unidade: "un",
      preco_unitario: 0.4,
    },
  ]);
  const conf = await c.rpc("confirmar_compra", { p_compra: compra });
  if (conf.error) throw conf.error;
  loteId = (await c.from("lotes_insumo").select("id").eq("insumo_id", plaId).single()).data!.id;
  produtoId = (
    await c
      .from("produtos")
      .insert({
        nome: `Produto teste A1 ${sufixo}`,
        sku: `A1-${sufixo}`,
        status: "ativo",
        peso_g: 40,
        tempo_impressao_min: 120,
        pecas_por_ciclo: 1,
        tempo_preparo_min: 5,
        tempo_acabamento_min: 4,
        tempo_embalagem_min: 3,
        insumo_impressao_id: plaId,
        impressora_padrao_id: impressoraId,
        margem_alvo: 0.25,
      })
      .select("id")
      .single()
  ).data!.id;
  await c
    .from("produtos_materiais")
    .insert({
      produto_id: produtoId,
      insumo_id: imaId,
      quantidade: 1,
      unidade: "un",
      papel: "complementar",
      por: "peca",
    });
  await c.from("produtos_precos_canal").insert([
    { produto_id: produtoId, canal_id: canalId, preco_venda: 30, vigente_desde: "2026-01-01" },
    { produto_id: produtoId, canal_id: canalId, preco_venda: 32.51, vigente_desde: "2026-06-01" },
  ]);
});

afterAll(async () => {
  const a = admin();
  if (ordemId) await a.from("ordens_producao").delete().eq("id", ordemId);
  if (produtoId) {
    await a.from("movimentacoes_produto").delete().eq("produto_id", produtoId);
    await a.from("calculos_custo").delete().eq("produto_id", produtoId);
    await a.from("alertas").delete().eq("entidade_id", produtoId);
    await a.from("produtos").delete().eq("id", produtoId);
  }
  for (const id of [plaId, imaId].filter(Boolean)) {
    const { data: lotes } = await a.from("lotes_insumo").select("id").eq("insumo_id", id);
    await a
      .from("alertas")
      .delete()
      .in("entidade_id", [id, ...(lotes ?? []).map((l) => l.id)]);
    await a.from("movimentacoes_estoque").delete().eq("insumo_id", id);
    await a.from("lotes_insumo").delete().eq("insumo_id", id);
  }
  if (compras.length) await a.from("compras").delete().in("id", compras);
  if (plaId) await a.from("insumos").delete().in("id", [plaId, imaId]);
  if (impressoraId) await a.from("impressoras").delete().eq("id", impressoraId);
  if (canalId) await a.from("canais_venda").delete().eq("id", canalId);
  if (versao) await a.from("parametros_custo").delete().eq("versao", versao);
  await Promise.all([dono?.remover(), leitura?.remover()]);
});

describe("produto e custo", () => {
  it("ficha + BOM + insumo + impressora + parâmetros reproduzem o caso A1; preço vigente é o mais recente", async () => {
    const ctx = await contextoProdutoCom(dono.cliente, produtoId, null);
    expect(ctx).not.toBeNull();
    expect(ctx!.custo_g).toBe(0.125);
    expect(ctx!.bom.por_peca).toBe(0.4);
    expect(ctx!.impressora?.custoHora).toEqual({
      depreciacao: 0.5,
      manutencao: 0.2,
      consumiveis: 0.1,
      energia: 0.114,
    });
    const m = entradasDoContexto(ctx!, canalId);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const r = calcular(m.entradas);
    expect(r.custo.custo_total).toBe(13.228);
    expect(r.preco?.margem?.preco).toBe(32.51);
    const { data: vigente } = await leitura.cliente
      .from("produtos_precos_vigentes")
      .select("preco_venda")
      .eq("produto_id", produtoId)
      .single();
    expect(Number(vigente!.preco_venda)).toBe(32.51);
    const { error } = await leitura.cliente.from("produtos").insert({ nome: "não pode" });
    expect(error?.code).toBe("42501");
  });
});

describe("ordem de produção", () => {
  it("concluir consome o lote, calcula o custo realizado só variável, dá entrada nas peças e soma horas; reabrir estorna tudo", async () => {
    const c = dono.cliente;
    const { data: ordem, error } = await c
      .from("ordens_producao")
      .insert({
        produto_id: produtoId,
        impressora_id: impressoraId,
        lote_id: loteId,
        quantidade_planejada: 2,
        tempo_previsto_min: 240,
      })
      .select("id, codigo, status")
      .single();
    expect(error).toBeNull();
    ordemId = ordem!.id;
    expect(ordem!.codigo).toMatch(/^OP-\d{4}$/);
    expect(ordem!.status).toBe("fila");

    const faltando = await c.rpc("concluir_ordem_producao", {
      p_ordem: ordemId,
      p_aprovadas: 2,
      p_perdidas: 0,
      p_tempo_real_min: 240,
      p_minutos_mao_de_obra: 24,
      p_consumos: [{ insumo_id: plaId, lote_id: loteId, quantidade: 5000 }],
      p_custo_hora_mao_obra: 30,
    });
    expect(faltando.error?.message).toBe("estoque_insuficiente");
    expect(
      (await c.from("ordens_producao").select("status").eq("id", ordemId).single()).data!.status,
    ).toBe("fila");

    const r = await c.rpc("concluir_ordem_producao", {
      p_ordem: ordemId,
      p_aprovadas: 2,
      p_perdidas: 0,
      p_tempo_real_min: 240,
      p_minutos_mao_de_obra: 24,
      p_consumos: [
        { insumo_id: plaId, lote_id: loteId, quantidade: 80, quantidade_prevista: 80 },
        { insumo_id: imaId, lote_id: null, quantidade: 2 },
      ],
      p_custo_hora_mao_obra: 30,
    });
    expect(r.error).toBeNull();
    const d = r.data as {
      material: number;
      maquina: number;
      energia: number;
      mao_de_obra: number;
      total: number;
      por_peca_boa: number;
      avisos: string[];
    };
    expect([d.material, d.maquina, d.energia, d.mao_de_obra]).toEqual([10.8, 3.2, 0.456, 12]);
    expect(d.total).toBe(26.456);
    expect(d.por_peca_boa).toBe(13.228);
    expect(d.avisos).toEqual([]);

    const { data: lote } = await c
      .from("lotes_insumo")
      .select("quantidade_atual, valor_atual")
      .eq("id", loteId)
      .single();
    expect([Number(lote!.quantidade_atual), Number(lote!.valor_atual)]).toEqual([920, 115]);
    const { data: estoque } = await c
      .from("estoque_produtos")
      .select("saldo, valor, custo_medio")
      .eq("produto_id", produtoId)
      .is("variacao_id", null)
      .single();
    expect([estoque!.saldo, Number(estoque!.valor), Number(estoque!.custo_medio)]).toEqual([
      2, 26.456, 13.228,
    ]);
    const { data: imp } = await c
      .from("impressoras")
      .select("horas_uso")
      .eq("id", impressoraId)
      .single();
    expect(Number(imp!.horas_uso)).toBe(4);
    const { data: consumos } = await c
      .from("ordens_consumo")
      .select("insumo_id, quantidade_real, valor")
      .eq("ordem_id", ordemId)
      .order("criado_em");
    expect(consumos!.map((x) => [Number(x.quantidade_real), Number(x.valor)])).toEqual([
      [80, 10],
      [2, 0.8],
    ]);

    const busca = await leitura.cliente.rpc("buscar_global", {
      termo: ordem!.codigo.toLowerCase(),
      tipos: ["ordem"],
    });
    expect(busca.data!.map((x) => x.id)).toContain(ordemId);
    const buscaProduto = await leitura.cliente.rpc("buscar_global", {
      termo: `A1-${sufixo}`,
      tipos: ["produto"],
    });
    expect(buscaProduto.data!.map((x) => x.id)).toContain(produtoId);

    const reabrir = await c.rpc("reabrir_ordem_producao", { p_ordem: ordemId, p_motivo: "teste" });
    expect(reabrir.error).toBeNull();
    const { data: lote2 } = await c
      .from("lotes_insumo")
      .select("quantidade_atual, valor_atual")
      .eq("id", loteId)
      .single();
    expect([Number(lote2!.quantidade_atual), Number(lote2!.valor_atual)]).toEqual([1000, 125]);
    const { data: estoque2 } = await c
      .from("estoque_produtos")
      .select("saldo")
      .eq("produto_id", produtoId)
      .is("variacao_id", null)
      .single();
    expect(estoque2!.saldo).toBe(0);
    const { data: reaberta } = await c
      .from("ordens_producao")
      .select("status, custo_realizado")
      .eq("id", ordemId)
      .single();
    expect(reaberta!.status).toBe("acabamento");
    expect(reaberta!.custo_realizado).toBeNull();
    expect(
      Number(
        (await c.from("impressoras").select("horas_uso").eq("id", impressoraId).single()).data!
          .horas_uso,
      ),
    ).toBe(0);

    const semBoas = await c.rpc("concluir_ordem_producao", {
      p_ordem: ordemId,
      p_aprovadas: 0,
      p_perdidas: 2,
      p_tempo_real_min: 60,
      p_minutos_mao_de_obra: 0,
      p_consumos: [{ insumo_id: plaId, lote_id: loteId, quantidade: 80 }],
      p_custo_hora_mao_obra: 30,
      p_motivo_falha: "descolou",
    });
    expect(semBoas.error).toBeNull();
    const d2 = semBoas.data as {
      total: number;
      por_peca_boa: number | null;
      perda_producao: number;
    };
    expect(d2.por_peca_boa).toBeNull();
    expect(d2.perda_producao).toBe(d2.total);
    const { data: estoque3 } = await c
      .from("estoque_produtos")
      .select("saldo")
      .eq("produto_id", produtoId)
      .is("variacao_id", null)
      .single();
    expect(estoque3!.saldo).toBe(0);
  });
});
