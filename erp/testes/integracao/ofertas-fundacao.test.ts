import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 11: integrações de afiliado, segredo cifrado inacessível pela sessão, modelos e alertas.
let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const SEGREDO = `v1.teste.${Date.now()}.tag.dadosSecretosQueNaoPodemVazar`;

async function restaurarAwin() {
  await admin().rpc("ofe_gerar_alertas");
  const { data } = await admin()
    .from("ofe_integracoes")
    .select("id")
    .eq("plataforma", "awin")
    .single();
  await admin().from("ofe_integracoes_segredos").delete().eq("integracao_id", data!.id);
  await admin()
    .from("ofe_integracoes")
    .update({
      status: "nao_configurada",
      ultimo_erro: null,
      ultimo_erro_em: null,
      segredo_configurado_em: null,
      identificadores: {},
      recursos: {},
    })
    .eq("plataforma", "awin");
  await admin().rpc("ofe_gerar_alertas");
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador, leitura] = await Promise.all([
    criarUsuarioTeste("dono"),
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  await restaurarAwin();
});
afterAll(async () => {
  await restaurarAwin();
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("ofertas: fundação", () => {
  it("as quatro plataformas existem; leitura vê, só o dono altera", async () => {
    const { data } = await leitura.cliente.from("ofe_integracoes").select("plataforma, status");
    expect(data?.map((d) => d.plataforma).sort()).toEqual([
      "amazon",
      "awin",
      "mercado_livre",
      "shopee",
    ]);
    const { data: alterou } = await operador.cliente
      .from("ofe_integracoes")
      .update({ identificadores: { publisher_id: "1" } })
      .eq("plataforma", "awin")
      .select("id");
    expect(alterou).toEqual([]);
    const { data: dele } = await dono.cliente
      .from("ofe_integracoes")
      .update({ identificadores: { publisher_id: "123" } })
      .eq("plataforma", "awin")
      .select("identificadores")
      .single();
    expect(dele?.identificadores).toEqual({ publisher_id: "123" });
  });

  it("segredo: só o dono grava por rpc, ninguém lê pela sessão, auditoria não guarda", async () => {
    const { error: e1 } = await operador.cliente.rpc("ofe_salvar_segredo", {
      p_plataforma: "awin",
      p_segredo: SEGREDO,
      p_chave_id: "teste",
    });
    expect(e1?.message).toBe("sem_permissao");
    const { error: e2 } = await dono.cliente.rpc("ofe_salvar_segredo", {
      p_plataforma: "awin",
      p_segredo: "texto-em-claro",
      p_chave_id: "teste",
    });
    expect(e2?.message).toBe("segredo_invalido");
    const { error } = await dono.cliente.rpc("ofe_salvar_segredo", {
      p_plataforma: "awin",
      p_segredo: SEGREDO,
      p_chave_id: "teste",
    });
    expect(error).toBeNull();

    const { data: lido, error: negado } = await dono.cliente
      .from("ofe_integracoes_segredos")
      .select("segredo");
    expect(lido ?? []).toEqual([]);
    expect(negado?.code).toBe("42501");

    const { data: integ } = await dono.cliente
      .from("ofe_integracoes")
      .select("segredo_configurado_em")
      .eq("plataforma", "awin")
      .single();
    expect(integ?.segredo_configurado_em).not.toBeNull();

    const { data: aud } = await admin()
      .from("auditoria")
      .select("depois")
      .in("tabela", ["ofe_integracoes", "ofe_integracoes_segredos"])
      .order("em", { ascending: false })
      .limit(20);
    expect(JSON.stringify(aud)).not.toContain("dadosSecretosQueNaoPodemVazar");

    const { error: remover } = await dono.cliente.rpc("ofe_remover_segredo", {
      p_plataforma: "awin",
    });
    expect(remover).toBeNull();
    const { data: semSegredo } = await admin()
      .from("ofe_integracoes")
      .select("status, segredo_configurado_em")
      .eq("plataforma", "awin")
      .single();
    expect(semSegredo).toEqual({ status: "nao_configurada", segredo_configurado_em: null });
  });

  it("modelos padrão existem; leitura não cria modelo", async () => {
    const { data } = await leitura.cliente
      .from("ofe_modelos")
      .select("nome, padrao")
      .eq("padrao", true);
    expect(data?.length).toBeGreaterThanOrEqual(3);
    const { error } = await leitura.cliente
      .from("ofe_modelos")
      .insert({ nome: "x", tipo: "oferta", corpo: "{{link}}" });
    expect(error?.code).toBe("42501");
  });

  it("alertas do módulo abrem, atualizam e resolvem sem duplicar", async () => {
    const { data: awin } = await admin()
      .from("ofe_integracoes")
      .update({ status: "erro", ultimo_erro: "Token recusado (teste)" })
      .eq("plataforma", "awin")
      .select("id")
      .single();
    await operador.cliente.rpc("ofe_gerar_alertas");
    await operador.cliente.rpc("ofe_gerar_alertas");
    const { data: abertos } = await admin()
      .from("alertas")
      .select("titulo, descricao")
      .eq("tipo", "ofe_integracao_erro")
      .eq("entidade_id", awin!.id)
      .is("resolvido_em", null);
    expect(abertos).toEqual([
      { titulo: "Integração com Awin: erro", descricao: "Token recusado (teste)" },
    ]);
    const { error: semPermissao } = await leitura.cliente.rpc("ofe_gerar_alertas");
    expect(semPermissao?.message).toBe("sem_permissao");

    await admin().from("ofe_integracoes").update({ status: "conectada" }).eq("id", awin!.id);
    await admin().rpc("ofe_gerar_alertas");
    const { data: depois } = await admin()
      .from("alertas")
      .select("id")
      .eq("tipo", "ofe_integracao_erro")
      .eq("entidade_id", awin!.id)
      .is("resolvido_em", null);
    expect(depois).toEqual([]);
  });

  it("auditoria da sessão continua com origem web", async () => {
    const { data } = await admin()
      .from("auditoria")
      .select("origem")
      .eq("tabela", "ofe_integracoes")
      .eq("usuario_id", dono.id)
      .limit(1);
    expect(data?.[0]?.origem).toBe("web");
  });
});
