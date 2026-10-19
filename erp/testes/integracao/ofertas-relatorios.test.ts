import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 18: conversões e cliques importados, atribuição por código, arquivo repetido e relatórios.
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const s = Date.now();
let grupo = "";
const a = () => admin();
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const inicio = "2026-10-01T00:00:00Z";
const fim = "2026-11-01T00:00:00Z";

beforeAll(async () => {
  await garantirMigracoes();
  [operador, leitura] = await Promise.all([
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  grupo = (
    await a()
      .from("ofe_grupos")
      .insert({ nome: `rel ${s}`, funcao: "destino", tag_amazon: `rel${s % 100000}-20` })
      .select("id")
      .single()
  ).data!.id;
});
afterAll(async () => {
  await a().from("ofe_conversoes").delete().like("ref_externa", `rel-${s}-%`);
  await a()
    .from("ofe_cliques_importados")
    .delete()
    .like("codigo", `%${s % 100000}%`);
  await a()
    .from("ofe_importacoes")
    .delete()
    .like("arquivo_hash", "%")
    .gte("importado_em", new Date(s - 60_000).toISOString());
  await a().from("ofe_grupos").delete().eq("id", grupo);
  await Promise.all([operador?.remover(), leitura?.remover()]);
});

describe("ofertas: relatórios", () => {
  it("atribui pelo sub ID e pela tag do grupo; arquivo repetido é recusado; reimportar atualiza status", async () => {
    const codigo = `g${grupo.replace(/-/g, "").slice(0, 8)}`;
    const linhas = [
      {
        ref: `rel-${s}-1`,
        data: "2026-10-05T12:00:00Z",
        status: "pendente",
        venda: "100.00",
        comissao: "8.00",
        codigos: [codigo],
      },
      {
        ref: `rel-${s}-2`,
        data: "2026-10-06T12:00:00Z",
        status: "aprovada",
        venda: "50.00",
        comissao: "3.50",
        codigos: [`rel${s % 100000}-20`],
      },
    ];
    const h = hash(`arquivo-${s}`);
    const { data, error } = await operador.cliente.rpc("ofe_registrar_conversoes", {
      p_plataforma: "amazon",
      p_origem: "csv",
      p_hash: h,
      p_inicio: inicio,
      p_fim: fim,
      p_linhas: linhas,
    });
    expect(error).toBeNull();
    expect(data).toEqual({ linhas: 2, novas: 2 });
    const { error: repetido } = await operador.cliente.rpc("ofe_registrar_conversoes", {
      p_plataforma: "amazon",
      p_origem: "csv",
      p_hash: h,
      p_inicio: inicio,
      p_fim: fim,
      p_linhas: linhas,
    });
    expect(repetido?.message).toBe("importacao_repetida");
    await operador.cliente.rpc("ofe_registrar_conversoes", {
      p_plataforma: "amazon",
      p_origem: "csv",
      p_hash: hash(`arquivo2-${s}`),
      p_inicio: inicio,
      p_fim: fim,
      p_linhas: [{ ...linhas[0], status: "aprovada" }],
    });
    const { data: conv } = await a()
      .from("ofe_conversoes")
      .select("ref_externa, status, grupo_id")
      .like("ref_externa", `rel-${s}-%`)
      .order("ref_externa");
    expect(conv).toEqual([
      { ref_externa: `rel-${s}-1`, status: "aprovada", grupo_id: grupo },
      { ref_externa: `rel-${s}-2`, status: "aprovada", grupo_id: grupo },
    ]);
  });

  it("relatório soma por grupo e status; leitura consulta mas não importa", async () => {
    const { data } = await leitura.cliente.rpc("ofe_relatorio_conversoes", {
      p_inicio: inicio,
      p_fim: fim,
      p_grupo: grupo,
    });
    expect(data).toEqual([
      {
        grupo_id: grupo,
        grupo: `rel ${s}`,
        plataforma: "amazon",
        status: "aprovada",
        pedidos: 2,
        venda: 150,
        comissao: 11.5,
      },
    ]);
    const { error } = await leitura.cliente.rpc("ofe_registrar_cliques", {
      p_plataforma: "amazon",
      p_hash: null as unknown as string,
      p_linhas: [],
    });
    expect(error?.message).toBe("sem_permissao");
  });

  it("cliques importados por dia e código, atribuídos ao grupo", async () => {
    await operador.cliente.rpc("ofe_registrar_cliques", {
      p_plataforma: "amazon",
      p_hash: hash(`cliques-${s}`),
      p_linhas: [
        { dia: "2026-10-05", codigo: `rel${s % 100000}-20`, cliques: 40 },
        { dia: "2026-10-06", codigo: `rel${s % 100000}-20`, cliques: 2 },
      ],
    });
    const { data } = await operador.cliente.rpc("ofe_relatorio_cliques", {
      p_inicio: "2026-10-01",
      p_fim: "2026-11-01",
      p_grupo: grupo,
    });
    expect(data).toEqual([
      { grupo_id: grupo, grupo: `rel ${s}`, plataforma: "amazon", cliques: 42 },
    ]);
  });
});
