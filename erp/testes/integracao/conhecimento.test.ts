import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const criados: string[] = [];

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador, leitura] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("operador"), criarUsuarioTeste("leitura")]);
});
afterAll(async () => {
  if (criados.length) await admin().from("conhecimentos").delete().in("id", criados);
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("conhecimentos", () => {
  it("operador cria; leitura lê interno e não lê restrito; dono lê os dois", async () => {
    const sufixo = Date.now();
    const { data: interno, error: e1 } = await operador.cliente
      .from("conhecimentos")
      .insert({ slug: `teste-interno-${sufixo}`, titulo: `Teste interno ${sufixo}`, conteudo: "PETG úmido estala no bico; secar 6 h a 65 graus.", tipo: "solucao", tags: ["petg", "secagem"] })
      .select("id")
      .single();
    expect(e1).toBeNull();
    criados.push(interno!.id);
    const { data: restrito, error: e2 } = await dono.cliente
      .from("conhecimentos")
      .insert({ slug: `teste-restrito-${sufixo}`, titulo: `Teste restrito ${sufixo}`, conteudo: "margem alvo por canal", tipo: "nota", confidencialidade: "restrito" })
      .select("id")
      .single();
    expect(e2).toBeNull();
    criados.push(restrito!.id);

    const { data: vistosPelaLeitura } = await leitura.cliente.from("conhecimentos").select("id").in("id", [interno!.id, restrito!.id]);
    expect(vistosPelaLeitura?.map((r) => r.id)).toEqual([interno!.id]);
    const { data: vistosPeloDono } = await dono.cliente.from("conhecimentos").select("id").in("id", [interno!.id, restrito!.id]);
    expect(vistosPeloDono?.length).toBe(2);

    const { error: e3 } = await leitura.cliente.from("conhecimentos").insert({ slug: `x-${sufixo}`, titulo: "Não pode", conteudo: "x", tipo: "nota" });
    expect(e3?.code).toBe("42501");
  });

  it("alterar conteúdo gera versão anterior com motivo e autor; busca acha pelo conteúdo sem acento", async () => {
    const sufixo = Date.now();
    const { data: criado } = await dono.cliente
      .from("conhecimentos")
      .insert({ slug: `teste-versao-${sufixo}`, titulo: `Calibração de fluxo ${sufixo}`, conteudo: "Fluxo em 0,95 para PETG translúcido.", tipo: "perfil_impressao" })
      .select("id, versao")
      .single();
    criados.push(criado!.id);
    expect(criado!.versao).toBe(1);

    const consulta = dono.cliente.from("conhecimentos").update({ conteudo: "Fluxo em 0,93 para PETG translúcido, após teste de cubo." }).eq("id", criado!.id).select("versao").single();
    consulta.setHeader("x-motivo", "teste de cubo mostrou excesso");
    const { data: atualizado, error } = await consulta;
    expect(error).toBeNull();
    expect(atualizado!.versao).toBe(2);

    const { data: versoes } = await dono.cliente.from("conhecimentos_versoes").select("versao, conteudo, motivo, alterado_por, origem").eq("conhecimento_id", criado!.id);
    expect(versoes?.length).toBe(1);
    expect(versoes![0]).toMatchObject({ versao: 1, motivo: "teste de cubo mostrou excesso", alterado_por: dono.id, origem: "web" });
    expect(versoes![0].conteudo).toContain("0,95");

    const { data: busca } = await leitura.cliente.rpc("buscar_global", { termo: "calibracao fluxo", tipos: ["conhecimento"] });
    expect(busca?.some((r) => r.id === criado!.id)).toBe(true);
    const { data: porConteudo } = await leitura.cliente.rpc("buscar_global", { termo: "translucido", tipos: ["conhecimento"] });
    expect(porConteudo?.some((r) => r.id === criado!.id)).toBe(true);
  });

  it("service role com x-usuario-id atribui autoria na auditoria e no criado_por", async () => {
    const sufixo = Date.now();
    const { createClient } = await import("@supabase/supabase-js");
    const servico = createClient(process.env.SUPABASE_TESTE_URL!, process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-origem": "mcp", "x-usuario-id": operador.id } },
    });
    const { data } = await servico
      .from("conhecimentos")
      .insert({ slug: `teste-mcp-${sufixo}`, titulo: `Via MCP ${sufixo}`, conteudo: "gravado pelo servidor", tipo: "nota", origem: "claude_code" })
      .select("id, criado_por")
      .single();
    criados.push(data!.id);
    expect(data!.criado_por).toBe(operador.id);
    const { data: aud } = await servico.from("auditoria").select("origem, usuario_id").eq("registro_id", data!.id).eq("acao", "insert");
    expect(aud![0]).toMatchObject({ origem: "mcp", usuario_id: operador.id });
  });
});
