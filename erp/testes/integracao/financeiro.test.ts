import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";
import { atualizarResumoCom } from "@/dados/vendas/pedidos";
import { ocorrencias } from "@/dominio/financeiro/recorrencia";

// Fase 7: pedido pago gera um só recebível; realizar parcial e restante; estorno por contra-lançamento;
// compra confirmada gera pagável; recorrência única por competência; operador não enxerga o financeiro.
let dono: UsuarioTeste;
let operador: UsuarioTeste;
const sufixo = Date.now();
const hoje = new Date().toISOString().slice(0, 10);
let versao: number;
let canalId: string;
let contaId: string;
let produtoId: string;
let fornecedorId: string;
let insumoId: string;
let compraId: string;
let recorrenciaId: string;
const pedidos: string[] = [];
const lancamentosManuais: string[] = [];
let recebivelId: string;

async function criarPedidoPago(codigoExterno: string) {
  const c = dono.cliente;
  const { data: padrao } = await c.from("pedidos_status").select("id").eq("padrao", true).single();
  const { data: p, error } = await c
    .from("pedidos")
    .insert({
      canal_id: canalId,
      codigo_externo: codigoExterno,
      status_id: padrao!.id,
      data_pedido: hoje,
      descontos_vendedor: 5,
      frete_cobrado: 0,
      frete_pago: 3,
      comissao_pct: 0.14,
      taxa_pagamento_pct: 0.02,
      taxa_fixa_item: 4,
    })
    .select("id")
    .single();
  if (error) throw error;
  pedidos.push(p.id);
  await c.from("pedidos_itens").insert([
    { pedido_id: p.id, ordem: 0, produto_id: produtoId, quantidade: 2, preco_unitario: 32.51 },
    {
      pedido_id: p.id,
      ordem: 1,
      titulo: "Item avulso",
      quantidade: 1,
      preco_unitario: 32.08,
      custo_unitario_estimado: 8.7181,
    },
  ]);
  const r = await atualizarResumoCom(c, p.id);
  expect(r?.valor_a_receber).toBe(62.37);
  const pago = await c.rpc("mudar_status_pedido", {
    p_pedido: p.id,
    p_status_codigo: "pagamento_aprovado",
    p_nota: "pix",
  });
  expect(pago.error).toBeNull();
  return p.id;
}

async function situacao(id: string) {
  const { data, error } = await dono.cliente
    .from("lancamentos_situacao")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function saldoConta(id: string) {
  const { data } = await dono.cliente
    .from("contas_saldos")
    .select("saldo_atual")
    .eq("id", id)
    .single();
  return Number(data!.saldo_atual);
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("operador")]);
  const c = dono.cliente;
  versao = (
    await c
      .from("parametros_custo")
      .insert({
        vigente_desde: hoje,
        dados: { imposto_pct_estimado: 0.06 },
        observacoes: `financeiro ${sufixo}`,
      })
      .select("versao")
      .single()
  ).data!.versao;
  canalId = (
    await c
      .from("canais_venda")
      .insert({ nome: `Canal fin ${sufixo}`, tipo: "outro" })
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
  const { data: conta, error: erroConta } = await c
    .from("contas_financeiras")
    .insert({
      nome: `Saldo canal ${sufixo}`,
      tipo: "saldo_marketplace",
      canal_id: canalId,
      saldo_inicial: 100,
      saldo_inicial_em: hoje,
    })
    .select("id")
    .single();
  if (erroConta) throw erroConta;
  contaId = conta.id;
  produtoId = (
    await c
      .from("produtos")
      .insert({
        nome: `Produto fin ${sufixo}`,
        status: "ativo",
        custo_atual: 15,
        custo_variavel_atual: 13.228,
      })
      .select("id")
      .single()
  ).data!.id;
  fornecedorId = (
    await c
      .from("fornecedores")
      .insert({ nome: `Fornecedor fin ${sufixo}` })
      .select("id")
      .single()
  ).data!.id;
  insumoId = (
    await c
      .from("insumos")
      .insert({ nome: `PLA fin ${sufixo}`, tipo: "filamento", unidade_base: "g" })
      .select("id")
      .single()
  ).data!.id;
});

afterAll(async () => {
  const a = admin();
  const origens = [...pedidos, compraId].filter(Boolean);
  // Contra-lançamentos apontam para o original (estorna_id): apagar primeiro.
  await a
    .from("lancamentos")
    .delete()
    .eq("origem_tipo", "estorno")
    .in("origem_id", [...origens, ...lancamentosManuais, recebivelId]);
  if (origens.length) await a.from("lancamentos").delete().in("origem_id", origens);
  if (recorrenciaId) await a.from("lancamentos").delete().eq("recorrencia_id", recorrenciaId);
  if (lancamentosManuais.length) await a.from("lancamentos").delete().in("id", lancamentosManuais);
  if (recorrenciaId) await a.from("recorrencias").delete().eq("id", recorrenciaId);
  if (pedidos.length) await a.from("pedidos").delete().in("id", pedidos);
  if (compraId) await a.from("compras").delete().eq("id", compraId);
  if (insumoId) await a.from("insumos").delete().eq("id", insumoId);
  if (fornecedorId) await a.from("fornecedores").delete().eq("id", fornecedorId);
  if (produtoId) {
    await a.from("movimentacoes_produto").delete().eq("produto_id", produtoId);
    await a.from("produtos").delete().eq("id", produtoId);
  }
  if (contaId) {
    await a.from("lancamentos_realizacoes").delete().eq("conta_id", contaId);
    await a.from("lancamentos").delete().eq("conta_id", contaId);
    await a.from("contas_financeiras").delete().eq("id", contaId);
  }
  if (canalId) await a.from("canais_venda").delete().eq("id", canalId);
  if (versao) await a.from("parametros_custo").delete().eq("versao", versao);
  await Promise.all([dono?.remover(), operador?.remover()]);
});

describe("recebível do pedido", () => {
  it("pedido pago gera um só recebível na conta do canal; garantir de novo não duplica", async () => {
    const pedidoId = await criarPedidoPago(`FIN-${sufixo}`);
    const { data: lista } = await dono.cliente
      .from("lancamentos_situacao")
      .select("id, tipo, valor_previsto, conta_id, estado, saldo_restante, categoria_nome")
      .eq("origem_tipo", "pedido")
      .eq("origem_id", pedidoId);
    expect(lista!.length).toBe(1);
    const l = lista![0];
    recebivelId = l.id!;
    expect(l.tipo).toBe("receita");
    expect(Number(l.valor_previsto)).toBe(62.37);
    expect(l.conta_id).toBe(contaId);
    expect(l.estado).toBe("planejado");
    expect(l.categoria_nome).toBe("Vendas");
    const { data: deNovo, error } = await dono.cliente.rpc("garantir_recebivel", {
      p_pedido: pedidoId,
    });
    expect(error).toBeNull();
    expect(deNovo).toBe(recebivelId);
    // Marcar pago de novo (resumo recalculado) também não duplica.
    await atualizarResumoCom(dono.cliente, pedidoId);
    const { count } = await dono.cliente
      .from("lancamentos")
      .select("id", { count: "exact", head: true })
      .eq("origem_tipo", "pedido")
      .eq("origem_id", pedidoId);
    expect(count).toBe(1);
  });

  it("realiza parcial (não cancelável), recusa acima do restante, realiza o resto e o saldo da conta sobe", async () => {
    const c = dono.cliente;
    const parcial = await c.rpc("realizar_lancamento", {
      p_lancamento: recebivelId,
      p_valor: 40,
      p_conta: contaId,
      p_data: hoje,
    });
    expect(parcial.error).toBeNull();
    expect(parcial.data).toEqual({ realizado: 40, restante: 22.37 });
    let s = await situacao(recebivelId);
    expect([s.estado, Number(s.valor_realizado), Number(s.saldo_restante)]).toEqual([
      "parcial",
      40,
      22.37,
    ]);
    const cancelar = await c.rpc("cancelar_lancamento", {
      p_lancamento: recebivelId,
      p_motivo: "teste",
    });
    expect(cancelar.error?.message).toBe("lancamento_nao_cancelavel");
    const acima = await c.rpc("realizar_lancamento", {
      p_lancamento: recebivelId,
      p_valor: 30,
      p_conta: contaId,
    });
    expect(acima.error?.message).toBe("valor_acima_do_restante");
    const resto = await c.rpc("realizar_lancamento", {
      p_lancamento: recebivelId,
      p_valor: 22.37,
      p_conta: contaId,
      p_data: hoje,
    });
    expect(resto.error).toBeNull();
    s = await situacao(recebivelId);
    expect([s.estado, Number(s.valor_realizado), Number(s.saldo_restante)]).toEqual([
      "realizado",
      62.37,
      0,
    ]);
    const fechado = await c.rpc("realizar_lancamento", {
      p_lancamento: recebivelId,
      p_valor: 1,
      p_conta: contaId,
    });
    expect(fechado.error?.message).toBe("lancamento_nao_aberto");
    expect(await saldoConta(contaId)).toBe(162.37);
  });

  it("estorno cria contra-lançamento realizado, marca o original e devolve o saldo; estornar de novo falha", async () => {
    const c = dono.cliente;
    const { data: contraId, error } = await c.rpc("estornar_lancamento", {
      p_lancamento: recebivelId,
      p_motivo: "repasse devolvido",
    });
    expect(error).toBeNull();
    const contra = await situacao(contraId!);
    expect([contra.tipo, contra.estado, Number(contra.valor_previsto), contra.estorna_id]).toEqual([
      "despesa",
      "realizado",
      62.37,
      recebivelId,
    ]);
    expect(contra.descricao?.startsWith("Estorno: ")).toBe(true);
    const original = await situacao(recebivelId);
    expect(original.estado).toBe("estornado");
    expect(await saldoConta(contaId)).toBe(100);
    const deNovo = await c.rpc("estornar_lancamento", {
      p_lancamento: recebivelId,
      p_motivo: "x",
    });
    expect(deNovo.error?.message).toBe("lancamento_nao_estornavel");
  });

  it("cancelar o pedido antes do repasse cancela o recebível planejado", async () => {
    const pedidoId = await criarPedidoPago(`FIN-CANCEL-${sufixo}`);
    const { data: antes } = await dono.cliente
      .from("lancamentos_situacao")
      .select("id, estado")
      .eq("origem_tipo", "pedido")
      .eq("origem_id", pedidoId)
      .single();
    expect(antes!.estado).toBe("planejado");
    const cancel = await dono.cliente.rpc("mudar_status_pedido", {
      p_pedido: pedidoId,
      p_status_codigo: "cancelado",
      p_nota: "cliente desistiu",
    });
    expect(cancel.error).toBeNull();
    const depois = await situacao(antes!.id!);
    expect(depois.estado).toBe("cancelado");
    expect(depois.cancelado_motivo).toBe("Pedido cancelado");
  });
});

describe("pagável de compra", () => {
  it("compra confirmada gera um pagável na categoria Insumos, embutida no custo", async () => {
    const c = dono.cliente;
    const { data: compra, error } = await c
      .from("compras")
      .insert({
        fornecedor_id: fornecedorId,
        data: hoje,
        frete: 10,
        numero_documento: `NF-${sufixo}`,
      })
      .select("id")
      .single();
    if (error) throw error;
    compraId = compra.id;
    await c.from("compras_itens").insert({
      compra_id: compraId,
      ordem: 0,
      insumo_id: insumoId,
      quantidade: 2,
      unidade: "un",
      peso_util_g: 1000,
      preco_unitario: 95,
    });
    const conf = await c.rpc("confirmar_compra", { p_compra: compraId });
    expect(conf.error).toBeNull();
    const { data: lista } = await c
      .from("lancamentos_situacao")
      .select(
        "tipo, valor_previsto, estado, categoria_nome, embutido_no_custo, descricao, data_prevista",
      )
      .eq("origem_tipo", "compra")
      .eq("origem_id", compraId);
    expect(lista!.length).toBe(1);
    const l = lista![0];
    expect([
      l.tipo,
      Number(l.valor_previsto),
      l.estado,
      l.categoria_nome,
      l.embutido_no_custo,
    ]).toEqual(["despesa", 200, "planejado", "Insumos", true]);
    expect(l.descricao).toContain(`NF-${sufixo}`);
    expect(l.data_prevista).toBe(hoje);
  });
});

describe("lançamentos manuais", () => {
  it("encerrar com diferença exige motivo, mantém o previsto e fica realizado", async () => {
    const c = dono.cliente;
    const { data: l, error } = await c
      .from("lancamentos")
      .insert({
        tipo: "receita",
        descricao: `Repasse manual ${sufixo}`,
        valor_previsto: 100,
        competencia: `${hoje.slice(0, 7)}-01`,
        data_prevista: hoje,
        origem_tipo: "manual",
      })
      .select("id")
      .single();
    if (error) throw error;
    lancamentosManuais.push(l.id);
    const semMotivo = await c.rpc("realizar_lancamento", {
      p_lancamento: l.id,
      p_valor: 95,
      p_conta: contaId,
      p_encerrar: true,
    });
    expect(semMotivo.error?.message).toBe("motivo_obrigatorio");
    const ok = await c.rpc("realizar_lancamento", {
      p_lancamento: l.id,
      p_valor: 95,
      p_conta: contaId,
      p_encerrar: true,
      p_motivo: "Taxa do canal maior que a prevista",
    });
    expect(ok.error).toBeNull();
    const s = await situacao(l.id);
    expect([s.estado, Number(s.valor_previsto), Number(s.valor_realizado), s.conta_id]).toEqual([
      "realizado",
      100,
      95,
      contaId,
    ]);
    expect(s.encerrado_motivo).toBe("Taxa do canal maior que a prevista");
  });

  it("transferência exige contas diferentes; planejado sem realização pode ser cancelado", async () => {
    const c = dono.cliente;
    const { error: mesma } = await c.from("lancamentos").insert({
      tipo: "transferencia",
      descricao: `Transf inválida ${sufixo}`,
      valor_previsto: 10,
      competencia: `${hoje.slice(0, 7)}-01`,
      data_prevista: hoje,
      conta_id: contaId,
      conta_destino_id: contaId,
    });
    expect(mesma?.code).toBe("23514");
    const { data: l } = await c
      .from("lancamentos")
      .insert({
        tipo: "despesa",
        descricao: `Despesa planejada ${sufixo}`,
        valor_previsto: 30,
        competencia: `${hoje.slice(0, 7)}-01`,
        data_prevista: "2026-01-05",
        origem_tipo: "manual",
      })
      .select("id")
      .single();
    lancamentosManuais.push(l!.id);
    const antes = await situacao(l!.id);
    expect([antes.estado, antes.atrasado]).toEqual(["planejado", true]);
    const { error } = await c.rpc("cancelar_lancamento", {
      p_lancamento: l!.id,
      p_motivo: "não vai acontecer",
    });
    expect(error).toBeNull();
    const depois = await situacao(l!.id);
    expect([depois.estado, depois.atrasado]).toEqual(["cancelado", false]);
  });

  it("recorrência mensal gera três competências e a segunda geração é barrada pelo índice único", async () => {
    const c = dono.cliente;
    const { data: r, error } = await c
      .from("recorrencias")
      .insert({
        descricao: `Internet ${sufixo}`,
        tipo: "despesa",
        valor: 120,
        frequencia: "mensal",
        dia: 10,
        inicio: hoje,
      })
      .select("*")
      .single();
    if (error) throw error;
    recorrenciaId = r.id;
    const lista = ocorrencias(
      { frequencia: "mensal", dia: r.dia, inicio: r.inicio, fim: r.fim },
      hoje,
      3,
    );
    expect(lista.length).toBe(3);
    const linhas = lista.map((o) => ({
      tipo: r.tipo,
      descricao: r.descricao,
      valor_previsto: r.valor,
      competencia: `${o.competencia}-01`,
      data_prevista: o.data_prevista,
      recorrencia_id: r.id,
      origem_tipo: "recorrencia",
      origem_id: r.id,
      papel_origem: o.competencia,
    }));
    const { error: e1 } = await c.from("lancamentos").insert(linhas);
    expect(e1).toBeNull();
    const { error: e2 } = await c.from("lancamentos").insert(linhas[0]);
    expect(e2?.code).toBe("23505");
    const { count } = await c
      .from("lancamentos")
      .select("id", { count: "exact", head: true })
      .eq("recorrencia_id", r.id);
    expect(count).toBe(3);
  });
});

describe("permissões e busca", () => {
  it("operador não lê, não escreve e não acha lançamentos na busca; dono acha pela descrição", async () => {
    const { data: lidos, error } = await operador.cliente.from("lancamentos").select("id");
    expect(error).toBeNull();
    expect(lidos).toEqual([]);
    const { error: negado } = await operador.cliente.from("lancamentos").insert({
      tipo: "despesa",
      descricao: "tentativa",
      valor_previsto: 1,
      competencia: `${hoje.slice(0, 7)}-01`,
      data_prevista: hoje,
    });
    expect(negado?.code).toBe("42501");
    const { data: contas } = await operador.cliente.from("contas_saldos").select("id");
    expect(contas).toEqual([]);
    const buscaOperador = await operador.cliente.rpc("buscar_global", {
      termo: `repasse manual ${sufixo}`,
      tipos: ["lancamento"],
    });
    expect(buscaOperador.data).toEqual([]);
    const buscaDono = await dono.cliente.rpc("buscar_global", {
      termo: `repasse manual ${sufixo}`,
      tipos: ["lancamento"],
    });
    expect(buscaDono.data!.map((x) => x.id)).toContain(lancamentosManuais[0]);
    expect(buscaDono.data![0].rota).toBe(
      `/financeiro/lancamentos?destaque=${lancamentosManuais[0]}`,
    );
  });
});
