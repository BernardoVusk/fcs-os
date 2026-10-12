import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Reproduz os casos B1 e B2 do Anexo A da spec contra as funções SQL (confirmar_compra, movimentar_estoque, estornar_movimentacao).
let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
const insumos: string[] = [];
const compras: string[] = [];
let fornecedorId: string;
let plaId: string;
let petgId: string;
let b2Id: string;

async function criarInsumo(
  cliente: UsuarioTeste["cliente"],
  nome: string,
  tipo = "filamento",
  unidade = "g",
) {
  const { data, error } = await cliente
    .from("insumos")
    .insert({ nome, tipo, unidade_base: unidade })
    .select("id")
    .single();
  if (error) throw error;
  insumos.push(data.id);
  return data.id;
}

async function criarCompra(
  cabecalho: {
    frete?: number;
    desconto_total?: number;
    outros_custos?: number;
    numero_documento?: string;
  },
  itens: {
    insumo_id: string;
    quantidade: number;
    unidade?: string;
    preco_unitario: number;
    peso_util_g?: number | null;
    lote_codigo?: string;
  }[],
) {
  const { data, error } = await dono.cliente
    .from("compras")
    .insert({ fornecedor_id: fornecedorId, data: "2026-10-12", ...cabecalho })
    .select("id")
    .single();
  if (error) throw error;
  compras.push(data.id);
  const { error: e2 } = await dono.cliente.from("compras_itens").insert(
    itens.map((i, ordem) => ({
      compra_id: data.id,
      ordem,
      unidade: "un",
      peso_util_g: 1000,
      ...i,
    })),
  );
  if (e2) throw e2;
  return data.id;
}

async function lotesDe(insumoId: string) {
  const { data } = await dono.cliente
    .from("lotes_insumo")
    .select("*")
    .eq("insumo_id", insumoId)
    .order("aberto_em");
  return data!;
}
async function estoqueDe(insumoId: string) {
  const { data } = await dono.cliente
    .from("estoque_atual")
    .select("*")
    .eq("insumo_id", insumoId)
    .single();
  return data!;
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador, leitura] = await Promise.all([
    criarUsuarioTeste("dono"),
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  const { data: f, error } = await dono.cliente
    .from("fornecedores")
    .insert({ nome: `Fornecedor teste ${sufixo}` })
    .select("id")
    .single();
  if (error) throw error;
  fornecedorId = f.id;
  plaId = await criarInsumo(operador.cliente, `PLA teste B1 ${sufixo}`);
  petgId = await criarInsumo(operador.cliente, `PETG teste B1 ${sufixo}`);
  b2Id = await criarInsumo(operador.cliente, `PLA preto B2 ${sufixo}`);
});

afterAll(async () => {
  const a = admin();
  if (insumos.length) {
    const { data: lotes } = await a.from("lotes_insumo").select("id").in("insumo_id", insumos);
    const loteIds = (lotes ?? []).map((l) => l.id);
    await a
      .from("alertas")
      .delete()
      .in("entidade_id", [...insumos, ...loteIds]);
    await a.from("movimentacoes_estoque").delete().in("insumo_id", insumos);
    await a.from("lotes_insumo").delete().in("insumo_id", insumos);
  }
  if (compras.length) await a.from("compras").delete().in("id", compras);
  if (insumos.length) await a.from("insumos").delete().in("id", insumos);
  if (fornecedorId) await a.from("fornecedores").delete().eq("id", fornecedorId);
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("compra (Anexo B1)", () => {
  it("rateia desconto, frete e outros por valor, cria um lote por rolo e calcula o custo por grama", async () => {
    const compraId = await criarCompra(
      { frete: 30, desconto_total: 15, outros_custos: 6, numero_documento: `B1-${sufixo}` },
      [
        { insumo_id: plaId, quantidade: 2, preco_unitario: 95, lote_codigo: `L${sufixo}` },
        { insumo_id: petgId, quantidade: 1, preco_unitario: 110 },
      ],
    );
    const { data, error } = await dono.cliente.rpc("confirmar_compra", { p_compra: compraId });
    expect(error).toBeNull();
    expect(data).toEqual({ itens: 2, lotes: 3 });

    const { data: itens } = await dono.cliente
      .from("compras_itens")
      .select("*")
      .eq("compra_id", compraId)
      .order("ordem");
    expect(Number(itens![0].custo_total)).toBe(203.3);
    expect(Number(itens![0].custo_unitario_final)).toBe(0.10165);
    expect(Number(itens![0].quantidade_base)).toBe(2000);
    expect(Number(itens![0].rateio)).toBe(13.3);
    expect(Number(itens![1].custo_total)).toBe(117.7);
    expect(Number(itens![1].custo_unitario_final)).toBe(0.1177);

    const lotes = await lotesDe(plaId);
    expect(lotes.map((l) => l.codigo)).toEqual([`L${sufixo}-1`, `L${sufixo}-2`]);
    expect(
      lotes.map((l) => [
        Number(l.quantidade_atual),
        Number(l.valor_atual),
        Number(l.custo_unitario),
      ]),
    ).toEqual([
      [1000, 101.65, 0.10165],
      [1000, 101.65, 0.10165],
    ]);

    const estoque = await estoqueDe(plaId);
    expect(Number(estoque.saldo)).toBe(2000);
    expect(Number(estoque.valor)).toBe(203.3);
    expect(Number(estoque.custo_medio)).toBe(0.10165);
    expect(Number(estoque.ultimo_custo)).toBe(0.10165);

    const { data: entradas } = await dono.cliente
      .from("movimentacoes_estoque")
      .select("tipo, quantidade, origem_tipo")
      .eq("origem_id", compraId);
    expect(entradas!.length).toBe(3);
    expect(
      entradas!.every(
        (m) => m.tipo === "entrada" && m.origem_tipo === "compra" && Number(m.quantidade) === 1000,
      ),
    ).toBe(true);

    const { error: deNovo } = await dono.cliente.rpc("confirmar_compra", { p_compra: compraId });
    expect(deNovo?.message).toBe("compra_ja_confirmada");
  });

  it("filamento em rolos sem peso útil e compra sem itens são recusados", async () => {
    const semPeso = await criarCompra({}, [
      { insumo_id: plaId, quantidade: 1, preco_unitario: 90, peso_util_g: null },
    ]);
    const { error } = await dono.cliente.rpc("confirmar_compra", { p_compra: semPeso });
    expect(error?.message).toBe("filamento_sem_peso_util");
    const { data: vazia } = await dono.cliente
      .from("compras")
      .insert({ data: "2026-10-12" })
      .select("id")
      .single();
    compras.push(vazia!.id);
    const { error: e2 } = await dono.cliente.rpc("confirmar_compra", { p_compra: vazia!.id });
    expect(e2?.message).toBe("compra_sem_itens");
  });
});

describe("custo médio, consumo ao custo do lote e lote dividido (Anexo B2)", () => {
  it("segue a tabela do anexo passo a passo", async () => {
    const c1 = await criarCompra({}, [
      { insumo_id: b2Id, quantidade: 1, preco_unitario: 101.65, lote_codigo: `B2L1-${sufixo}` },
    ]);
    await dono.cliente.rpc("confirmar_compra", { p_compra: c1 });
    expect(Number((await estoqueDe(b2Id)).custo_medio)).toBe(0.10165);

    const c2 = await criarCompra({}, [
      { insumo_id: b2Id, quantidade: 1, preco_unitario: 128.37, lote_codigo: `B2L2-${sufixo}` },
    ]);
    await dono.cliente.rpc("confirmar_compra", { p_compra: c2 });
    let estoque = await estoqueDe(b2Id);
    expect(Number(estoque.custo_medio)).toBe(0.11501);
    expect(Number(estoque.ultimo_custo)).toBe(0.12837);
    const [l1, l2] = await lotesDe(b2Id);

    // Consumo de 350 g do L1, valorado ao custo do lote (35,5775), nunca pela média (40,2535).
    const r1 = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l1.id,
      p_tipo: "consumo_producao",
      p_quantidade: 350,
      p_motivo: "teste",
    });
    expect(r1.error).toBeNull();
    expect((r1.data as { alertas: string[] }).alertas).toEqual([]);
    let lotes = await lotesDe(b2Id);
    expect([Number(lotes[0].quantidade_atual), Number(lotes[0].valor_atual)]).toEqual([
      650, 66.0725,
    ]);
    estoque = await estoqueDe(b2Id);
    expect(Number(estoque.custo_medio)).toBe(0.117844);
    const { data: saida } = await dono.cliente
      .from("movimentacoes_estoque")
      .select("quantidade, valor")
      .eq("lote_id", l1.id)
      .eq("tipo", "consumo_producao")
      .single();
    expect([Number(saida!.quantidade), Number(saida!.valor)]).toEqual([-350, -35.5775]);

    // Consumo de 700 g com L1 em uso (650): zera L1 em 0,0000 e tira 50 g do L2, com alerta lote_dividido.
    const r2 = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l1.id,
      p_tipo: "consumo_producao",
      p_quantidade: 700,
      p_motivo: "teste",
    });
    expect(r2.error).toBeNull();
    const res2 = r2.data as { movimentacoes: string[]; alertas: string[] };
    expect(res2.movimentacoes.length).toBe(2);
    expect(res2.alertas).toEqual(["lote_dividido"]);
    lotes = await lotesDe(b2Id);
    expect([Number(lotes[0].quantidade_atual), Number(lotes[0].valor_atual)]).toEqual([0, 0]);
    expect(lotes[0].encerrado_em).not.toBeNull();
    expect([Number(lotes[1].quantidade_atual), Number(lotes[1].valor_atual)]).toEqual([
      950, 121.9515,
    ]);
    estoque = await estoqueDe(b2Id);
    expect(Number(estoque.saldo)).toBe(950);
    expect(Number(estoque.custo_medio)).toBe(0.12837);
    const { data: alerta } = await dono.cliente
      .from("alertas")
      .select("id")
      .eq("tipo", "lote_dividido")
      .eq("entidade_id", b2Id)
      .is("resolvido_em", null)
      .maybeSingle();
    expect(alerta).not.toBeNull();
    expect(l2.id).toBe(lotes[1].id);
  });

  it("bloqueia estoque negativo; override só em consumo de produção com lote e justificativa, marcando o lote e abrindo alerta", async () => {
    const [, l2] = await lotesDe(b2Id);
    const bloqueada = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "saida",
      p_quantidade: 5000,
      p_motivo: "teste",
    });
    expect(bloqueada.error?.message).toBe("estoque_insuficiente");
    const perda = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "perda",
      p_quantidade: 5000,
      p_motivo: "x",
      p_permitir_negativo: true,
      p_justificativa: "x",
    });
    expect(perda.error?.message).toBe("estoque_insuficiente");
    const semJust = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "consumo_producao",
      p_quantidade: 1000,
      p_motivo: "x",
      p_permitir_negativo: true,
    });
    expect(semJust.error?.message).toBe("estoque_insuficiente");
    const ajusteNeg = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "ajuste",
      p_quantidade: -5000,
      p_motivo: "x",
      p_permitir_negativo: true,
      p_justificativa: "x",
    });
    expect(ajusteNeg.error?.message).toBe("estoque_insuficiente");

    const ok = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "consumo_producao",
      p_quantidade: 1000,
      p_motivo: "OP longa",
      p_permitir_negativo: true,
      p_justificativa: "rolo pesado mostrou mais material",
    });
    expect(ok.error).toBeNull();
    expect((ok.data as { alertas: string[] }).alertas).toEqual(["estoque_negativo"]);
    const lotes = await lotesDe(b2Id);
    expect(Number(lotes[1].quantidade_atual)).toBe(-50);
    expect(lotes[1].divergente).toBe(true);
    const { data: alerta } = await dono.cliente
      .from("alertas")
      .select("severidade")
      .eq("tipo", "estoque_negativo")
      .eq("entidade_id", l2.id)
      .is("resolvido_em", null)
      .maybeSingle();
    expect(alerta?.severidade).toBe("critico");
    expect(Number((await estoqueDe(b2Id)).saldo_negativo)).toBe(-50);
  });

  it("ajuste positivo repõe o lote, estoque mínimo abre e resolve alerta, estorno cria a movimentação oposta", async () => {
    const [, l2] = await lotesDe(b2Id);
    const repoe = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: l2.id,
      p_tipo: "ajuste",
      p_quantidade: 50,
      p_motivo: "contagem",
    });
    expect(repoe.error).toBeNull();
    let lotes = await lotesDe(b2Id);
    expect([Number(lotes[1].quantidade_atual), Number(lotes[1].valor_atual)]).toEqual([0, 0]);

    await dono.cliente.from("insumos").update({ estoque_minimo: 5000 }).eq("id", b2Id);
    const novoLote = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_tipo: "ajuste",
      p_quantidade: 200,
      p_motivo: "sobra contada",
    });
    expect(novoLote.error).toBeNull();
    lotes = await lotesDe(b2Id);
    expect(lotes.length).toBe(3);
    expect(lotes[2].codigo.startsWith("AJ-")).toBe(true);
    expect([Number(lotes[2].quantidade_atual), Number(lotes[2].custo_unitario)]).toEqual([
      200, 0.12837,
    ]);
    const aberto = await dono.cliente
      .from("alertas")
      .select("id")
      .eq("tipo", "estoque_baixo")
      .eq("entidade_id", b2Id)
      .is("resolvido_em", null)
      .maybeSingle();
    expect(aberto.data).not.toBeNull();

    // Com o alerta aberto, outra movimentação não duplica nem falha (índice parcial único).
    const aindaBaixo = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: lotes[2].id,
      p_tipo: "ajuste",
      p_quantidade: 1,
      p_motivo: "x",
    });
    expect(aindaBaixo.error).toBeNull();
    const { count } = await dono.cliente
      .from("alertas")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "estoque_baixo")
      .eq("entidade_id", b2Id)
      .is("resolvido_em", null);
    expect(count).toBe(1);

    await dono.cliente.from("insumos").update({ estoque_minimo: 0 }).eq("id", b2Id);
    const mais = await operador.cliente.rpc("movimentar_estoque", {
      p_insumo: b2Id,
      p_lote: lotes[2].id,
      p_tipo: "ajuste",
      p_quantidade: 1,
      p_motivo: "x",
    });
    expect(mais.error).toBeNull();
    const resolvido = await dono.cliente
      .from("alertas")
      .select("resolvido_em")
      .eq("id", aberto.data!.id)
      .single();
    expect(resolvido.data?.resolvido_em).not.toBeNull();

    const movId = (mais.data as { movimentacoes: string[] }).movimentacoes[0];
    const estorno = await operador.cliente.rpc("estornar_movimentacao", {
      p_movimentacao: movId,
      p_motivo: "errei",
    });
    expect(estorno.error).toBeNull();
    lotes = await lotesDe(b2Id);
    expect(Number(lotes[2].quantidade_atual)).toBe(201);
    const { data: oposta } = await dono.cliente
      .from("movimentacoes_estoque")
      .select("tipo, quantidade, origem_tipo, origem_id")
      .eq("id", estorno.data as string)
      .single();
    expect(oposta).toEqual({
      tipo: "estorno",
      quantidade: -1,
      origem_tipo: "estorno",
      origem_id: movId,
    });
    const deNovo = await operador.cliente.rpc("estornar_movimentacao", {
      p_movimentacao: movId,
      p_motivo: "errei",
    });
    expect(deNovo.error?.message).toBe("ja_estornada");
  });
});

describe("permissões", () => {
  it("leitura não cria insumo nem movimenta; operador escreve", async () => {
    const { error } = await leitura.cliente
      .from("insumos")
      .insert({ nome: "não pode", tipo: "outro" });
    expect(error?.code).toBe("42501");
    const [l1] = await lotesDe(plaId);
    const mov = await leitura.cliente.rpc("movimentar_estoque", {
      p_insumo: plaId,
      p_lote: l1.id,
      p_tipo: "saida",
      p_quantidade: 1,
      p_motivo: "x",
    });
    expect(mov.error).not.toBeNull();
    const { data: intacto } = await dono.cliente
      .from("lotes_insumo")
      .select("quantidade_atual")
      .eq("id", l1.id)
      .single();
    expect(Number(intacto!.quantidade_atual)).toBe(1000);
    const { data: visivel } = await leitura.cliente
      .from("estoque_atual")
      .select("saldo")
      .eq("insumo_id", plaId)
      .single();
    expect(Number(visivel!.saldo)).toBe(2000);
    const busca = await leitura.cliente.rpc("buscar_global", {
      termo: `B1 ${sufixo}`,
      tipos: ["insumo"],
    });
    expect(busca.data!.map((r) => r.id)).toEqual(expect.arrayContaining([plaId, petgId]));
  });
});
