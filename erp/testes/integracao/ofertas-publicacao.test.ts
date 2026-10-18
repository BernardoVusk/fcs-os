import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 13: grupos manuais, cupons, ofertas e publicação manual com envio por grupo.
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const marca = `t${Date.now()}`;
const ids = { grupos: [] as string[], ofertas: [] as string[], cupons: [] as string[] };

async function liberar(plataforma: string, sim: boolean) {
  await admin()
    .from("ofe_integracoes")
    .update(
      sim
        ? { conformidade_em: new Date().toISOString(), conformidade_observacao: "teste" }
        : { conformidade_em: null, conformidade_observacao: null },
    )
    .eq("plataforma", plataforma);
}

async function grupo(nome: string, funcao = "destino") {
  const { data, error } = await operador.cliente
    .from("ofe_grupos")
    .insert({ nome: `${marca} ${nome}`, funcao })
    .select("id")
    .single();
  if (error) throw error;
  ids.grupos.push(data.id);
  return data.id;
}

async function oferta() {
  const { data, error } = await operador.cliente
    .from("ofe_ofertas")
    .insert({
      plataforma: "mercado_livre",
      url_original: "https://produto.mercadolivre.com.br/MLB-123",
      titulo: `${marca} Miniatura`,
      link_colado: "https://mercadolivre.com/sec/abc",
    })
    .select("id")
    .single();
  if (error) throw error;
  ids.ofertas.push(data.id);
  return data.id;
}

const envio = (grupoId: string) => ({
  grupo_id: grupoId,
  texto: "Miniatura\nhttps://mercadolivre.com/sec/abc",
  link_url: "https://mercadolivre.com/sec/abc",
  link_origem: "colado",
});

beforeAll(async () => {
  await garantirMigracoes();
  [operador, leitura] = await Promise.all([
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
  ]);
  await liberar("mercado_livre", false);
});
afterAll(async () => {
  const a = admin();
  if (ids.ofertas.length) {
    const { data: pubs } = await a
      .from("ofe_publicacoes")
      .select("id")
      .in("oferta_id", ids.ofertas);
    const pubIds = (pubs ?? []).map((p) => p.id);
    if (pubIds.length) {
      await a.from("ofe_envios").delete().in("publicacao_id", pubIds);
      await a.from("ofe_publicacoes").delete().in("id", pubIds);
    }
    await a.from("ofe_ofertas").delete().in("id", ids.ofertas);
  }
  if (ids.cupons.length) {
    await a.from("ofe_publicacoes").delete().in("cupom_id", ids.cupons);
    await a.from("ofe_cupons").delete().in("id", ids.cupons);
  }
  if (ids.grupos.length) await a.from("ofe_grupos").delete().in("id", ids.grupos);
  await liberar("mercado_livre", false);
  await Promise.all([operador?.remover(), leitura?.remover()]);
});

describe("ofertas: publicação manual", () => {
  it("grupo de origem exige autorização registrada", async () => {
    const { error } = await operador.cliente
      .from("ofe_grupos")
      .insert({ nome: `${marca} origem`, funcao: "origem" });
    expect(error?.code).toBe("23514");
  });

  it("plataforma com trava fechada só gera rascunho", async () => {
    const g = await grupo("destino A");
    const o = await oferta();
    const { error } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: o,
      p_cupom: null as unknown as string,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [envio(g)],
    });
    expect(error?.message).toBe("plataforma_bloqueada");
  });

  it("cria um envio por grupo, deriva o status e marca publicado sem duplicar", async () => {
    await liberar("mercado_livre", true);
    const [g1, g2] = [await grupo("destino 1"), await grupo("destino 2")];
    const o = await oferta();
    const { data: pub, error } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: o,
      p_cupom: null as unknown as string,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [envio(g1), envio(g2)],
    });
    expect(error).toBeNull();
    const { data: envios } = await operador.cliente
      .from("ofe_envios")
      .select("id, status")
      .eq("publicacao_id", pub!);
    expect(envios?.map((e) => e.status)).toEqual(["aguardando", "aguardando"]);
    const { data: st } = await operador.cliente
      .from("ofe_publicacoes_status")
      .select("status")
      .eq("id", pub!)
      .single();
    expect(st?.status).toBe("aguardando");

    const alvo = envios![0].id;
    const [a, b] = await Promise.all([
      operador.cliente.rpc("ofe_marcar_publicado", { p_envio: alvo }),
      operador.cliente.rpc("ofe_marcar_publicado", { p_envio: alvo }),
    ]);
    expect([a.error?.message, b.error?.message].filter(Boolean)).toEqual(["envio_nao_disponivel"]);
    const { data: parcial } = await operador.cliente
      .from("ofe_publicacoes_status")
      .select("status, enviados")
      .eq("id", pub!)
      .single();
    expect(parcial).toEqual({ status: "parcial", enviados: 1 });

    const { data: cancelados } = await operador.cliente.rpc("ofe_cancelar_publicacao", {
      p_publicacao: pub!,
    });
    expect(cancelados).toBe(1);
    const { data: oferta2 } = await admin()
      .from("ofe_ofertas")
      .select("status")
      .eq("id", o)
      .single();
    expect(oferta2?.status).toBe("pronta");
  });

  it("grupo repetido desfaz a publicação inteira; envio manual sem link é recusado", async () => {
    const g = await grupo("repetido");
    const o = await oferta();
    const { error } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: o,
      p_cupom: null as unknown as string,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [envio(g), envio(g)],
    });
    expect(error?.code).toBe("23505");
    const { data } = await admin().from("ofe_publicacoes").select("id").eq("oferta_id", o);
    expect(data).toEqual([]);
    const { error: semLink } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: o,
      p_cupom: null as unknown as string,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [{ grupo_id: g, texto: "sem link" }],
    });
    expect(semLink?.message).toBe("envio_sem_link");
  });

  it("cupom vencido bloqueia a criação e a marcação", async () => {
    const g = await grupo("cupom");
    const { data: c } = await operador.cliente
      .from("ofe_cupons")
      .insert({
        plataforma: "mercado_livre",
        codigo: `${marca}C`,
        descricao: "teste",
        fim_em: new Date(Date.now() + 60_000).toISOString(),
      })
      .select("id")
      .single();
    ids.cupons.push(c!.id);
    const { data: pub, error } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: null as unknown as string,
      p_cupom: c!.id,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [{ grupo_id: g, texto: "Cupom X" }],
    });
    expect(error).toBeNull();
    await admin()
      .from("ofe_cupons")
      .update({ fim_em: new Date(Date.now() - 1000).toISOString() })
      .eq("id", c!.id);
    const { data: env } = await operador.cliente
      .from("ofe_envios")
      .select("id")
      .eq("publicacao_id", pub!)
      .single();
    const { error: marcar } = await operador.cliente.rpc("ofe_marcar_publicado", {
      p_envio: env!.id,
    });
    expect(marcar?.message).toBe("cupom_fora_da_vigencia");
    const { error: criar } = await operador.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: null as unknown as string,
      p_cupom: c!.id,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [{ grupo_id: g, texto: "Cupom X" }],
    });
    expect(criar?.message).toBe("cupom_fora_da_vigencia");
  });

  it("leitura não publica, não escreve envio direto e a auditoria não registra envios", async () => {
    const { error } = await leitura.cliente.rpc("ofe_criar_publicacao", {
      p_oferta: ids.ofertas[0],
      p_cupom: null as unknown as string,
      p_modo: "manual",
      p_agendado_para: new Date().toISOString(),
      p_envios: [envio(ids.grupos[0])],
    });
    expect(error?.message).toBe("sem_permissao");
    const { data: alterou } = await operador.cliente
      .from("ofe_envios")
      .update({ status: "enviado" })
      .eq("grupo_id", ids.grupos[1])
      .select("id");
    expect(alterou ?? []).toEqual([]);
    const { data: aud } = await admin()
      .from("auditoria")
      .select("id")
      .eq("tabela", "ofe_envios")
      .limit(1);
    expect(aud).toEqual([]);
  });
});
