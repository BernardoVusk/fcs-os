import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";
import { atualizarResumoCom } from "@/dados/vendas/pedidos";

// Pedido com os números do caso C1 (Anexo A): pagamento congela custo, envio baixa peças prontas, devolução estorna.
let dono: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
let versao: number;
let canalId: string;
let produtoId: string;
let clienteId: string;
let pedidoId: string;
const hoje = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("leitura")]);
  const c = dono.cliente;
  versao = (
    await c
      .from("parametros_custo")
      .insert({
        vigente_desde: hoje,
        dados: { imposto_pct_estimado: 0.06 },
        observacoes: `vendas ${sufixo}`,
      })
      .select("versao")
      .single()
  ).data!.versao;
  canalId = (
    await c
      .from("canais_venda")
      .insert({ nome: `Canal vendas ${sufixo}`, tipo: "outro" })
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
  produtoId = (
    await c
      .from("produtos")
      .insert({
        nome: `Produto vendas ${sufixo}`,
        status: "ativo",
        custo_atual: 15,
        custo_variavel_atual: 13.228,
      })
      .select("id")
      .single()
  ).data!.id;
  clienteId = (
    await c
      .from("clientes")
      .insert({ nome: `Cliente ${sufixo}`, email: "x@exemplo.com", telefone: "11999999999" })
      .select("id")
      .single()
  ).data!.id;
});

afterAll(async () => {
  const a = admin();
  if (pedidoId) await a.from("pedidos").delete().eq("id", pedidoId);
  if (produtoId) {
    await a.from("movimentacoes_produto").delete().eq("produto_id", produtoId);
    await a.from("produtos").delete().eq("id", produtoId);
  }
  if (clienteId) await a.from("clientes").delete().eq("id", clienteId);
  await a.from("importacoes").delete().like("nome_arquivo", `teste-${sufixo}%`);
  if (canalId) await a.from("canais_venda").delete().eq("id", canalId);
  if (versao) await a.from("parametros_custo").delete().eq("versao", versao);
  await Promise.all([dono?.remover(), leitura?.remover()]);
});

describe("pedido manual", () => {
  it("cria com status inicial, evento e resumo C1; leitura não cria", async () => {
    const c = dono.cliente;
    const { data: padrao } = await c
      .from("pedidos_status")
      .select("id, codigo")
      .eq("padrao", true)
      .single();
    expect(padrao!.codigo).toBe("recebido");
    const { data: p, error } = await c
      .from("pedidos")
      .insert({
        canal_id: canalId,
        codigo_externo: `C1-${sufixo}`,
        cliente_id: clienteId,
        status_id: padrao!.id,
        data_pedido: hoje,
        descontos_vendedor: 5,
        frete_cobrado: 0,
        frete_pago: 3,
        comissao_pct: 0.14,
        taxa_pagamento_pct: 0.02,
        taxa_fixa_item: 4,
      })
      .select("id, codigo")
      .single();
    expect(error).toBeNull();
    pedidoId = p!.id;
    expect(p!.codigo).toMatch(/^PED-\d{5}$/);
    await c.from("pedidos_eventos").insert({
      pedido_id: pedidoId,
      para_status_id: padrao!.id,
      origem: "manual",
      nota: "criado",
    });
    await c.from("pedidos_itens").insert([
      {
        pedido_id: pedidoId,
        ordem: 0,
        produto_id: produtoId,
        quantidade: 2,
        preco_unitario: 32.51,
      },
      {
        pedido_id: pedidoId,
        ordem: 1,
        titulo: "Item fora do catálogo",
        quantidade: 1,
        preco_unitario: 32.08,
        custo_unitario_estimado: 8.7181,
      },
    ]);
    const r = await atualizarResumoCom(c, pedidoId);
    expect(r?.receita_bruta).toBe(97.1);
    expect(r?.base_vendas).toBe(92.1);
    expect(r?.taxas_canal).toBe(26.73);
    expect(r?.valor_a_receber).toBe(62.37);
    expect(r?.imposto_estimado).toBe(5.53);
    expect(r?.custo_estimado).toBeNull();
    const { error: negado } = await leitura.cliente
      .from("pedidos")
      .insert({ canal_id: canalId, status_id: padrao!.id });
    expect(negado?.code).toBe("42501");
    const busca = await leitura.cliente.rpc("buscar_global", {
      termo: `c1-${sufixo}`,
      tipos: ["pedido"],
    });
    expect(busca.data!.map((x) => x.id)).toContain(pedidoId);
  });

  it("pagamento aprovado marca pago e congela o custo estimado pelo cache do produto", async () => {
    const c = dono.cliente;
    const { data, error } = await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "pagamento_aprovado",
      p_nota: "pix",
    });
    expect(error).toBeNull();
    expect((data as { mudou: boolean }).mudou).toBe(true);
    const { data: p } = await c
      .from("pedidos")
      .select("status_pagamento, data_pagamento")
      .eq("id", pedidoId)
      .single();
    expect(p!.status_pagamento).toBe("pago");
    expect(p!.data_pagamento).toBe(hoje);
    const { data: itens } = await c
      .from("pedidos_itens")
      .select("custo_unitario_estimado")
      .eq("pedido_id", pedidoId)
      .order("ordem");
    expect(itens!.map((i) => Number(i.custo_unitario_estimado))).toEqual([13.228, 8.7181]);
    const r = await atualizarResumoCom(c, pedidoId);
    expect(r?.custo_estimado).toBe(35.17);
    expect(r?.resultado_estimado).toBe(21.67);
    const { data: eventos } = await c
      .from("pedidos_eventos")
      .select("nota")
      .eq("pedido_id", pedidoId)
      .order("em");
    expect(eventos!.length).toBe(2);
    // Importação só avança: voltar para recebido não muda nada.
    const volta = await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "recebido",
      p_origem: "importacao",
    });
    expect((volta.data as { mudou: boolean }).mudou).toBe(false);
  });

  it("envio exige peças prontas, baixa ao custo médio e grava o custo realizado; cancelar depois exige devolução", async () => {
    const c = dono.cliente;
    const sem = await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "enviado",
    });
    expect(sem.error?.message).toBe("sem_pecas_prontas");
    await c.from("movimentacoes_produto").insert({
      produto_id: produtoId,
      tipo: "producao",
      quantidade: 3,
      valor: 39,
      custo_unitario_momento: 13,
      motivo: "teste",
      origem_tipo: "manual",
    });
    const ok = await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "enviado",
    });
    expect(ok.error).toBeNull();
    expect((ok.data as { baixados: number }).baixados).toBe(2);
    const { data: estoque } = await c
      .from("estoque_produtos")
      .select("saldo, valor")
      .eq("produto_id", produtoId)
      .is("variacao_id", null)
      .single();
    expect([estoque!.saldo, Number(estoque!.valor)]).toEqual([1, 13]);
    const { data: item } = await c
      .from("pedidos_itens")
      .select("custo_unitario_realizado")
      .eq("pedido_id", pedidoId)
      .eq("ordem", 0)
      .single();
    expect(Number(item!.custo_unitario_realizado)).toBe(13);
    const cancelar = await c.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "cancelado",
    });
    expect(cancelar.error?.message).toBe("pedido_ja_enviado");
    const dev = await c.rpc("devolver_pedido", { p_pedido: pedidoId, p_nota: "cliente desistiu" });
    expect(dev.error).toBeNull();
    expect((dev.data as { devolvidos: number }).devolvidos).toBe(2);
    const { data: estoque2 } = await c
      .from("estoque_produtos")
      .select("saldo")
      .eq("produto_id", produtoId)
      .is("variacao_id", null)
      .single();
    expect(estoque2!.saldo).toBe(3);
    const { data: p } = await c
      .from("pedidos")
      .select("status:pedidos_status(codigo)")
      .eq("id", pedidoId)
      .single();
    expect((p!.status as { codigo: string } | null)?.codigo).toBe("devolvido");
    const deNovo = await c.rpc("devolver_pedido", { p_pedido: pedidoId });
    expect(deNovo.error?.message).toBe("pedido_ja_devolvido");
  });

  it("importação é única por hash e cliente pode ser anonimizado", async () => {
    const c = dono.cliente;
    const hash = "a".repeat(64);
    const { error: e1 } = await c.from("importacoes").insert({
      canal_id: canalId,
      tipo: "pedidos",
      nome_arquivo: `teste-${sufixo}.csv`,
      hash_sha256: hash,
    });
    expect(e1).toBeNull();
    const { error: e2 } = await c.from("importacoes").insert({
      canal_id: canalId,
      tipo: "pedidos",
      nome_arquivo: `teste-${sufixo}-2.csv`,
      hash_sha256: hash,
    });
    expect(e2?.code).toBe("23505");
    const { error: e3 } = await c.rpc("anonimizar_cliente", { p_cliente: clienteId });
    expect(e3).toBeNull();
    const { data: cl } = await c
      .from("clientes")
      .select("nome, email, anonimizado")
      .eq("id", clienteId)
      .single();
    expect(cl).toEqual({ nome: "Cliente removido", email: null, anonimizado: true });
  });
});
