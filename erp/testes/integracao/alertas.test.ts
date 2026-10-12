import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";
import { atualizarResumoCom } from "@/dados/vendas/pedidos";

// Fase 9: gerar_alertas abre, atualiza e resolve de forma idempotente; quem pode resolver; views dos relatórios.
let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
const inicioTeste = new Date().toISOString();
const hoje = new Date().toISOString().slice(0, 10);
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
let itemId: string;
let lancamentoId: string;
let canalId: string;
let pedidoId: string;
let versao: number;

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador, leitura] = await Promise.all([
    criarUsuarioTeste("dono"),
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  const c = dono.cliente;
  versao = (
    await c
      .from("parametros_custo")
      .insert({
        vigente_desde: hoje,
        dados: { imposto_pct_estimado: 0.06 },
        observacoes: `alertas ${sufixo}`,
      })
      .select("versao")
      .single()
  ).data!.versao;
  canalId = (
    await c
      .from("canais_venda")
      .insert({ nome: `Canal alertas ${sufixo}`, tipo: "outro" })
      .select("id")
      .single()
  ).data!.id;
  await c.from("canais_venda_taxas").insert({
    canal_id: canalId,
    vigente_desde: "2026-01-01",
    comissao_pct: 0.14,
    taxa_pagamento_pct: 0.02,
    ads_pct_padrao: 0,
    taxa_fixa_item: 4,
    frete_subsidio_padrao: 0,
  });
});

afterAll(async () => {
  const a = admin();
  await a
    .from("alertas")
    .delete()
    .gte("criado_em", inicioTeste)
    .in("tipo", [
      "prazo_vencido",
      "pedido_parado",
      "lancamento_vencido",
      "ordem_atrasada",
      "manutencao_prevista",
    ]);
  if (pedidoId) {
    await a.from("lancamentos").delete().eq("origem_id", pedidoId);
    await a.from("pedidos").delete().eq("id", pedidoId);
  }
  if (lancamentoId) await a.from("lancamentos").delete().eq("id", lancamentoId);
  if (itemId) await a.from("plan_itens").delete().eq("id", itemId);
  if (canalId) await a.from("canais_venda").delete().eq("id", canalId);
  if (versao) await a.from("parametros_custo").delete().eq("versao", versao);
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("gerar_alertas", () => {
  it("abre prazo vencido, pedido parado e lançamento vencido; rodar de novo não duplica", async () => {
    const c = dono.cliente;
    itemId = (
      await c
        .from("plan_itens")
        .insert({
          tipo: "tarefa",
          titulo: `ALERTA ${sufixo} tarefa`,
          status: "",
          prazo: diasAtras(2),
          prioridade: "alta",
        })
        .select("id")
        .single()
    ).data!.id;
    lancamentoId = (
      await c
        .from("lancamentos")
        .insert({
          tipo: "despesa",
          descricao: `ALERTA ${sufixo} conta`,
          valor_previsto: 10,
          competencia: `${hoje.slice(0, 7)}-01`,
          data_prevista: diasAtras(3),
          origem_tipo: "manual",
        })
        .select("id")
        .single()
    ).data!.id;
    const { data: padrao } = await c
      .from("pedidos_status")
      .select("id")
      .eq("padrao", true)
      .single();
    pedidoId = (
      await c
        .from("pedidos")
        .insert({
          canal_id: canalId,
          codigo_externo: `AL-${sufixo}`,
          status_id: padrao!.id,
          data_pedido: diasAtras(8),
          comissao_pct: 0.14,
          taxa_pagamento_pct: 0.02,
          taxa_fixa_item: 4,
        })
        .select("id")
        .single()
    ).data!.id;
    await c.from("pedidos_itens").insert({
      pedido_id: pedidoId,
      ordem: 0,
      titulo: "Item",
      quantidade: 1,
      preco_unitario: 50,
      custo_unitario_estimado: 10,
    });
    await atualizarResumoCom(c, pedidoId);
    await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "pagamento_aprovado",
    });
    await c
      .from("pedidos")
      .update({ data_pagamento: diasAtras(7) })
      .eq("id", pedidoId);

    const { data, error } = await c.rpc("gerar_alertas");
    expect(error).toBeNull();
    const r = data as { abertos: number; resolvidos: number };
    expect(r.abertos).toBeGreaterThanOrEqual(3);
    const { data: abertos } = await c
      .from("alertas")
      .select("tipo, severidade, titulo, entidade_tipo, entidade_id")
      .is("resolvido_em", null)
      .gte("criado_em", inicioTeste);
    const item = abertos!.find((x) => x.tipo === "prazo_vencido" && x.entidade_id === itemId);
    expect(item).toMatchObject({ severidade: "critico", entidade_tipo: "item_plano" });
    expect(item!.titulo).toContain(`ALERTA ${sufixo} tarefa`);
    const pedido = abertos!.find((x) => x.tipo === "pedido_parado" && x.entidade_id === pedidoId);
    expect(pedido!.titulo).toContain("7 dias");
    const venc = abertos!.find((x) => x.tipo === "lancamento_vencido");
    expect(venc).toMatchObject({ entidade_tipo: "financeiro", entidade_id: null });

    const segunda = await c.rpc("gerar_alertas");
    expect((segunda.data as { abertos: number }).abertos).toBe(0);
    const { count } = await c
      .from("alertas")
      .select("id", { count: "exact", head: true })
      .is("resolvido_em", null)
      .eq("tipo", "prazo_vencido")
      .eq("entidade_id", itemId);
    expect(count).toBe(1);
  });

  it("resolve o que deixou de valer e atualiza o título do que mudou", async () => {
    const c = dono.cliente;
    await c.from("plan_itens").update({ status: "concluida" }).eq("id", itemId);
    await c.rpc("cancelar_lancamento", { p_lancamento: lancamentoId, p_motivo: "teste" });
    await c
      .from("pedidos")
      .update({ data_pagamento: diasAtras(9) })
      .eq("id", pedidoId);
    const { data } = await c.rpc("gerar_alertas");
    const r = data as { abertos: number; atualizados: number; resolvidos: number };
    expect(r.resolvidos).toBeGreaterThanOrEqual(2);
    expect(r.atualizados).toBeGreaterThanOrEqual(1);
    const { data: doItem } = await c
      .from("alertas")
      .select("resolvido_em")
      .eq("tipo", "prazo_vencido")
      .eq("entidade_id", itemId)
      .single();
    expect(doItem!.resolvido_em).not.toBeNull();
    const { data: doPedido } = await c
      .from("alertas")
      .select("titulo, resolvido_em")
      .eq("tipo", "pedido_parado")
      .eq("entidade_id", pedidoId)
      .is("resolvido_em", null)
      .single();
    expect(doPedido!.titulo).toContain("9 dias");
  });

  it("leitura não gera nem resolve; operador resolve e silencia", async () => {
    const negado = await leitura.cliente.rpc("gerar_alertas");
    expect(negado.error?.message).toBe("sem_permissao");
    const { data: alvo } = await dono.cliente
      .from("alertas")
      .select("id")
      .eq("tipo", "pedido_parado")
      .eq("entidade_id", pedidoId)
      .single();
    await leitura.cliente
      .from("alertas")
      .update({ resolvido_em: new Date().toISOString() })
      .eq("id", alvo!.id);
    const { data: ainda } = await dono.cliente
      .from("alertas")
      .select("resolvido_em")
      .eq("id", alvo!.id)
      .single();
    expect(ainda!.resolvido_em).toBeNull();
    const ate = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { error: e1 } = await operador.cliente
      .from("alertas")
      .update({ silenciado_ate: ate })
      .eq("id", alvo!.id);
    expect(e1).toBeNull();
    const { error: e2 } = await operador.cliente
      .from("alertas")
      .update({ resolvido_em: new Date().toISOString() })
      .eq("id", alvo!.id);
    expect(e2).toBeNull();
    const { data: depois } = await dono.cliente
      .from("alertas")
      .select("resolvido_em, silenciado_ate")
      .eq("id", alvo!.id)
      .single();
    expect(depois!.resolvido_em).not.toBeNull();
    expect(depois!.silenciado_ate).not.toBeNull();
  });
});

describe("views dos relatórios", () => {
  it("pedido pago aparece em rel_pedidos_pagos e rel_vendas_itens para a leitura", async () => {
    const { data: pedidos } = await leitura.cliente
      .from("rel_pedidos_pagos")
      .select("*")
      .eq("pedido_id", pedidoId);
    expect(pedidos!.length).toBe(1);
    expect(Number(pedidos![0].base_vendas)).toBe(50);
    expect(Number(pedidos![0].taxas_canal)).toBe(12);
    const { data: itens } = await leitura.cliente
      .from("rel_vendas_itens")
      .select("*")
      .eq("pedido_id", pedidoId);
    expect(itens!.length).toBe(1);
    expect([
      Number(itens![0].receita),
      Number(itens![0].custo_estimado),
      itens![0].produto_nome,
    ]).toEqual([50, 10, "Item"]);
  });
});
