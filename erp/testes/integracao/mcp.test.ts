import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

/*
 * Exercita autenticação e ferramentas do MCP sem HTTP: aponta o cliente de
 * serviço para o projeto de teste e chama os handlers registrados.
 */
process.env.SUPABASE_URL = process.env.SUPABASE_TESTE_URL;
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_TESTE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY;

type Handler = (
  args: Record<string, unknown>,
  ctx: { http?: { authInfo?: { token: string } } },
) => Promise<{ content: { text: string }[]; isError?: boolean }>;

let dono: UsuarioTeste;
let leitura: UsuarioTeste;
const tokens: Record<string, string> = {};
const ferramentas = new Map<string, Handler>();
const criados: string[] = [];

async function criarTokenTeste(
  usuarioId: string,
  escopos: string[],
  opcoes: { revogado?: boolean; expirado?: boolean } = {},
) {
  const token = `fcs_${randomBytes(32).toString("base64url")}`;
  const { error } = await admin()
    .from("tokens_integracao")
    .insert({
      nome: "teste",
      hash_token: createHash("sha256").update(token).digest("hex"),
      prefixo: token.slice(0, 12),
      usuario_id: usuarioId,
      escopos,
      expira_em: opcoes.expirado ? new Date(Date.now() - 1000).toISOString() : null,
      revogado_em: opcoes.revogado ? new Date().toISOString() : null,
    });
  if (error) throw error;
  return token;
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("leitura")]);
  tokens.dono = await criarTokenTeste(dono.id, [
    "conhecimento:ler",
    "conhecimento:escrever",
    "operacao:ler",
  ]);
  tokens.soLer = await criarTokenTeste(dono.id, ["conhecimento:ler"]);
  tokens.leitura = await criarTokenTeste(leitura.id, ["conhecimento:ler", "conhecimento:escrever"]);
  tokens.revogado = await criarTokenTeste(dono.id, ["conhecimento:ler"], { revogado: true });
  tokens.expirado = await criarTokenTeste(dono.id, ["conhecimento:ler"], { expirado: true });
  const { registrarFerramentas } = await import("@/mcp/ferramentas");
  const falso = {
    registerTool: (nome: string, _cfg: unknown, handler: Handler) => ferramentas.set(nome, handler),
  };
  registrarFerramentas(falso as unknown as Parameters<typeof registrarFerramentas>[0]);
});
afterAll(async () => {
  if (criados.length) await admin().from("conhecimentos").delete().in("id", criados);
  await admin().from("tokens_integracao").delete().eq("nome", "teste");
  await Promise.all([dono?.remover(), leitura?.remover()]);
});

const ctx = (token: string) => ({ http: { authInfo: { token } } });

describe("autenticação do MCP", () => {
  it("aceita token válido e recusa revogado, expirado e desconhecido", async () => {
    const { verificarToken } = await import("@/mcp/autenticacao");
    const s = await verificarToken(tokens.dono);
    expect(s?.usuarioId).toBe(dono.id);
    expect(s?.papel).toBe("dono");
    expect(s?.escopos).toContain("conhecimento:escrever");
    expect(await verificarToken(tokens.revogado)).toBeNull();
    expect(await verificarToken(tokens.expirado)).toBeNull();
    expect(await verificarToken("fcs_" + "a".repeat(40))).toBeNull();
    expect(await verificarToken("outro")).toBeNull();
  });
});

describe("ferramentas do MCP", () => {
  it("registra as nove ferramentas", () => {
    expect([...ferramentas.keys()].sort()).toEqual(
      [
        "alertas_abertos",
        "custos_regras",
        "estoque_insumo",
        "kb_atualizar",
        "kb_buscar",
        "kb_decisoes",
        "kb_obter",
        "kb_salvar",
        "produto_custo",
      ].sort(),
    );
  });

  it("kb_salvar exige escopo, papel e recusa segredo; depois kb_buscar e kb_obter encontram", async () => {
    const salvar = ferramentas.get("kb_salvar")!;
    const semEscopo = await salvar({ titulo: "x", conteudo: "y", tipo: "nota" }, ctx(tokens.soLer));
    expect(semEscopo.isError).toBe(true);
    expect(semEscopo.content[0].text).toContain("escopo");
    const papelLeitura = await salvar(
      { titulo: "Teste", conteudo: "y", tipo: "nota" },
      ctx(tokens.leitura),
    );
    expect(papelLeitura.isError).toBe(true);
    const comSegredo = await salvar(
      { titulo: "Teste", conteudo: "chave sk-abcdefghijklmnopqrstu", tipo: "nota" },
      ctx(tokens.dono),
    );
    expect(comSegredo.isError).toBe(true);
    expect(comSegredo.content[0].text).toContain("segredo");

    const titulo = `MCP PETG aderência ${Date.now()}`;
    const ok = await salvar(
      {
        titulo,
        resumo: "Mesa a 85 graus resolve.",
        conteudo: "## Causa\nMesa fria.\n## Correção\n85 graus e cola bastão.",
        tipo: "solucao",
        categoria: "Soluções para falhas",
        tags: ["PETG", "aderência"],
        modulo: "impressao",
      },
      ctx(tokens.dono),
    );
    expect(ok.isError).toBeFalsy();
    const salvo = JSON.parse(ok.content[0].text) as {
      id: string;
      rota: string;
      categoria_encontrada: boolean;
    };
    criados.push(salvo.id);
    expect(salvo.rota).toBe(`/conhecimento/${salvo.id}`);
    expect(salvo.categoria_encontrada).toBe(true);

    const { data: linha } = await admin()
      .from("conhecimentos")
      .select("origem, criado_por, tags")
      .eq("id", salvo.id)
      .single();
    expect(linha).toMatchObject({
      origem: "claude_code",
      criado_por: dono.id,
      tags: ["petg", "aderência"],
    });

    const busca = await ferramentas.get("kb_buscar")!(
      { termo: "aderencia petg" },
      ctx(tokens.leitura),
    );
    const resultado = JSON.parse(busca.content[0].text) as { resultados: { id: string }[] };
    expect(resultado.resultados.some((r) => r.id === salvo.id)).toBe(true);

    const obter = await ferramentas.get("kb_obter")!({ id: salvo.id }, ctx(tokens.leitura));
    expect(JSON.parse(obter.content[0].text).conteudo).toContain("85 graus");

    const atualizar = await ferramentas.get("kb_atualizar")!(
      { id: salvo.id, motivo: "ajuste de temperatura", conteudo: "## Correção\n80 graus bastam." },
      ctx(tokens.dono),
    );
    expect(atualizar.isError).toBeFalsy();
    const { data: versoes } = await admin()
      .from("conhecimentos_versoes")
      .select("motivo, origem, alterado_por")
      .eq("conhecimento_id", salvo.id);
    expect(versoes![0]).toMatchObject({
      motivo: "ajuste de temperatura",
      origem: "mcp",
      alterado_por: dono.id,
    });
  });

  it("token revogado não usa nenhuma ferramenta", async () => {
    const r = await ferramentas.get("kb_buscar")!({ termo: "petg" }, ctx(tokens.revogado));
    expect(r.isError).toBe(true);
  });
});
