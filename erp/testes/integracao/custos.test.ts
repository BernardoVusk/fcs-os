import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
const versoes: number[] = [];
const calculos: string[] = [];
let impressoraId: string;

const ENTRADAS = {
  peca: {
    peso_g: 40,
    tempo_ciclo_min: 120,
    pecas_por_ciclo: 1,
    taxa_falha: 0,
    desperdicio: 0,
    custo_g: 0.125,
    preparo_ciclo_min: 5,
    acabamento_peca_min: 4,
    embalagem_peca_min: 3,
    custo_hora_mao_obra: 30,
    complementares_peca: 0.4,
    complementares_pedido: 0,
    impressora: { depreciacao: 0.5, manutencao: 0.2, consumiveis: 0.1, energia: 0.114 },
    fixo: {
      metodo: "desligado",
      custo_fixo_mensal: 0,
      horas_produtivas_mes: 0,
      volume_mensal_estimado: 0,
    },
  },
  canal: null,
  margem_alvo: 0.25,
  markup_alvo: null,
};

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador, leitura] = await Promise.all([
    criarUsuarioTeste("dono"),
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
});
afterAll(async () => {
  const a = admin();
  if (calculos.length) await a.from("calculos_custo").delete().in("id", calculos);
  if (impressoraId) await a.from("impressoras").delete().eq("id", impressoraId);
  if (versoes.length) await a.from("parametros_custo").delete().in("versao", versoes);
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("parâmetros de custo", () => {
  it("só o dono cria versão; a vigente é a mais recente até hoje; os componentes padrão existem", async () => {
    const { error: negado } = await operador.cliente
      .from("parametros_custo")
      .insert({ vigente_desde: "2026-01-02", dados: { tarifa_kwh: 0.95 } });
    expect(negado?.code).toBe("42501");
    const { data: v1, error } = await dono.cliente
      .from("parametros_custo")
      .insert({
        vigente_desde: "2026-01-02",
        dados: { tarifa_kwh: 0.95, custo_hora_mao_obra: 30, metodo_rateio_fixo: "desligado" },
        observacoes: `teste ${sufixo}`,
      })
      .select("versao")
      .single();
    expect(error).toBeNull();
    versoes.push(v1!.versao);
    const { data: futura } = await dono.cliente
      .from("parametros_custo")
      .insert({ vigente_desde: "2999-01-01", dados: { tarifa_kwh: 9 } })
      .select("versao")
      .single();
    versoes.push(futura!.versao);
    const { data: vigente } = await leitura.cliente
      .from("parametros_custo_vigentes")
      .select("versao, dados")
      .single();
    expect(vigente!.versao).toBe(v1!.versao);
    expect((vigente!.dados as { tarifa_kwh: number }).tarifa_kwh).toBe(0.95);
    const { data: componentes } = await leitura.cliente
      .from("componentes_custo")
      .select("codigo, ativo")
      .order("ordem");
    expect(componentes!.map((c) => c.codigo)).toContain("fixo_rateado");
    expect(componentes!.every((c) => c.ativo)).toBe(true);
    const { error: naoAltera } = await operador.cliente
      .from("componentes_custo")
      .update({ ativo: false })
      .eq("codigo", "embalagem")
      .select("id");
    expect(naoAltera).toBeNull();
    const { data: aindaAtivo } = await leitura.cliente
      .from("componentes_custo")
      .select("ativo")
      .eq("codigo", "embalagem")
      .single();
    expect(aindaAtivo!.ativo).toBe(true);
  });
});

describe("impressoras e cálculos salvos", () => {
  it("operador cadastra impressora e salva cálculo; cálculo não aceita update nem delete; leitura só lê", async () => {
    const { data: imp, error } = await operador.cliente
      .from("impressoras")
      .insert({
        nome: `Impressora teste ${sufixo}`,
        custo_aquisicao: 4500,
        valor_residual: 500,
        vida_util_horas: 8000,
        potencia_media_w: 120,
        custo_manutencao_ano: 400,
        custo_consumiveis_ano: 200,
        horas_produtivas_ano: 2000,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    impressoraId = imp!.id;

    const { data: calc, error: e2 } = await operador.cliente
      .from("calculos_custo")
      .insert({
        nome: `Cálculo teste ${sufixo}`,
        impressora_id: impressoraId,
        parametros_versao: versoes[0],
        entradas: ENTRADAS,
        resultado: { versao_motor: "4.0.0", custo: { custo_total: 13.228 }, preco: null },
        custo_variavel: 13.228,
        custo_unitario_total: 13.228,
        versao_motor: "4.0.0",
        margem_alvo: 0.25,
      })
      .select("id, criado_por")
      .single();
    expect(e2).toBeNull();
    calculos.push(calc!.id);
    expect(calc!.criado_por).toBe(operador.id);

    const { data: alterado } = await dono.cliente
      .from("calculos_custo")
      .update({ nome: "mudou" })
      .eq("id", calc!.id)
      .select("id");
    expect(alterado).toEqual([]);
    const { data: apagado } = await dono.cliente
      .from("calculos_custo")
      .delete()
      .eq("id", calc!.id)
      .select("id");
    expect(apagado).toEqual([]);
    const { data: lido } = await leitura.cliente
      .from("calculos_custo")
      .select("nome, entradas")
      .eq("id", calc!.id)
      .single();
    expect(lido!.nome).toBe(`Cálculo teste ${sufixo}`);
    expect((lido!.entradas as typeof ENTRADAS).peca.custo_g).toBe(0.125);
    const { error: negado } = await leitura.cliente.from("calculos_custo").insert({
      nome: "x",
      entradas: {},
      resultado: {},
      custo_variavel: 1,
      custo_unitario_total: 1,
      versao_motor: "4.0.0",
    });
    expect(negado?.code).toBe("42501");

    const busca = await leitura.cliente.rpc("buscar_global", {
      termo: `teste ${sufixo}`,
      tipos: ["impressora", "calculo"],
    });
    expect(busca.data!.map((r) => r.tipo).sort()).toEqual(["calculo", "impressora"]);
  });
});
