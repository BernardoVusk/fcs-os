import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonimo,
  criarUsuarioTeste,
  garantirMigracoes,
  type UsuarioTeste,
} from "./ambiente";

// Página pública do sorteio: a função inscrever_sorteio cria ou reaproveita o cliente e grava a
// inscrição; realizar_sorteio escolhe um ganhador por mês, só pelo dono.
let dono: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const email = (n: string) => `teste-sorteio-${sufixo}-${n}@exemplo.com`;
// Telefones únicos por rodada, para sobra de rodada anterior não casar por telefone.
const bloco = String(Date.now()).slice(-6);
const telefone = (n: number) => `318${bloco}${String(n).padStart(2, "0")}`;
const REFERENCIA_SINTETICA = "1999-01";
let produtoId: string;
let produtoPausadoId: string;
let canalShopeeId: string;

type Resultado = {
  cliente_id: string;
  inscricao_id: string;
  repetida: boolean;
  cliente_novo: boolean;
};

function inscrever(extra: Record<string, unknown> = {}) {
  return admin().rpc("inscrever_sorteio", {
    p_nome: "Ana Teste",
    p_email: email("ana"),
    p_telefone: telefone(1),
    p_canal: "shopee",
    p_produto: produtoId,
    p_produto_outro: undefined,
    p_aceita_contato: true,
    p_origem: "panfleto",
    p_ip_hash: `ip-${sufixo}`,
    p_user_agent: "vitest",
    ...extra,
  });
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("leitura")]);
  const c = dono.cliente;
  produtoId = (
    await c
      .from("produtos")
      .insert({ nome: `Produto sorteio ${sufixo}`, status: "ativo" })
      .select("id")
      .single()
  ).data!.id;
  produtoPausadoId = (
    await c
      .from("produtos")
      .insert({ nome: `Produto pausado ${sufixo}`, status: "pausado" })
      .select("id")
      .single()
  ).data!.id;
  canalShopeeId = (await c.from("canais_venda").select("id").eq("tipo", "shopee").limit(1).single())
    .data!.id;
});

afterAll(async () => {
  const a = admin();
  const { data: clientes } = await a
    .from("clientes")
    .select("id")
    .or(`email.like.teste-sorteio-${sufixo}%,nome.eq.Bia ${sufixo}`);
  const ids = (clientes ?? []).map((c) => c.id);
  if (ids.length) {
    const { data: inscricoes } = await a
      .from("inscricoes_sorteio")
      .select("id")
      .in("cliente_id", ids);
    const insIds = (inscricoes ?? []).map((i) => i.id);
    if (insIds.length) await a.from("sorteios").delete().in("inscricao_id", insIds);
    await a.from("inscricoes_sorteio").delete().in("cliente_id", ids);
    await a.from("clientes").delete().in("id", ids);
  }
  if (produtoId) await a.from("produtos").delete().eq("id", produtoId);
  if (produtoPausadoId) await a.from("produtos").delete().eq("id", produtoPausadoId);
  await Promise.all([dono?.remover(), leitura?.remover()]);
});

describe("inscrever_sorteio", () => {
  it("cria o cliente com canal de origem e nota, grava a inscrição e não repete em 24 h", async () => {
    const { data, error } = await inscrever();
    expect(error).toBeNull();
    const r = data as unknown as Resultado;
    expect(r.cliente_novo).toBe(true);
    expect(r.repetida).toBe(false);
    const { data: cliente } = await admin()
      .from("clientes")
      .select("nome, email, telefone, canal_origem_id, observacoes")
      .eq("id", r.cliente_id)
      .single();
    expect(cliente).toMatchObject({
      nome: "Ana Teste",
      email: email("ana"),
      telefone: telefone(1),
      canal_origem_id: canalShopeeId,
    });
    expect(cliente?.observacoes).toContain("Cadastro pelo sorteio");
    const { data: inscricao } = await admin()
      .from("inscricoes_sorteio")
      .select("produto_id, canal_id, aceita_contato, origem, referencia, ip_hash")
      .eq("id", r.inscricao_id)
      .single();
    expect(inscricao).toMatchObject({
      produto_id: produtoId,
      canal_id: canalShopeeId,
      aceita_contato: true,
      origem: "panfleto",
      ip_hash: `ip-${sufixo}`,
    });
    expect(inscricao?.referencia).toMatch(/^\d{4}-\d{2}$/);

    const segunda = (await inscrever()).data as unknown as Resultado;
    expect(segunda.repetida).toBe(true);
    expect(segunda.cliente_id).toBe(r.cliente_id);
    const { count } = await admin()
      .from("inscricoes_sorteio")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", r.cliente_id);
    expect(count).toBe(1);
  });

  it("reaproveita cliente achado pelo telefone e preenche o e-mail sem sobrescrever depois", async () => {
    const { data: existente } = await dono.cliente
      .from("clientes")
      .insert({
        nome: `Bia ${sufixo}`,
        telefone: `(${telefone(2).slice(0, 2)}) ${telefone(2).slice(2, 7)}-${telefone(2).slice(7)}`,
      })
      .select("id")
      .single();
    const { data } = await inscrever({
      p_nome: "Bia Outra",
      p_email: email("bia"),
      p_telefone: telefone(2),
      p_produto: undefined,
      p_produto_outro: "Vaso espiral",
    });
    const r = data as unknown as Resultado;
    expect(r.cliente_id).toBe(existente!.id);
    expect(r.cliente_novo).toBe(false);
    const { data: cliente } = await admin()
      .from("clientes")
      .select("nome, email, observacoes")
      .eq("id", existente!.id)
      .single();
    expect(cliente?.nome).toBe(`Bia ${sufixo}`);
    expect(cliente?.email).toBe(email("bia"));
    expect(cliente?.observacoes).toContain("Cadastro pelo sorteio");
    // Limpeza desse cliente (o e-mail dele não segue o padrão do afterAll).
    await admin().from("inscricoes_sorteio").delete().eq("cliente_id", existente!.id);
    await admin().from("clientes").delete().eq("id", existente!.id);
  });

  it("só a service role executa; anônimo e dono recebem 42501", async () => {
    const parametros = {
      p_nome: "X",
      p_email: email("anon"),
      p_telefone: telefone(3),
      p_canal: "shopee",
      p_produto: produtoId,
      p_produto_outro: undefined,
      p_aceita_contato: true,
      p_origem: "panfleto",
      p_ip_hash: undefined,
      p_user_agent: undefined,
    };
    const { error: a } = await anonimo().rpc("inscrever_sorteio", parametros);
    expect(a?.code).toBe("42501");
    const { error: d } = await dono.cliente.rpc("inscrever_sorteio", parametros);
    expect(d?.code).toBe("42501");
  });

  it("levanta as chaves de erro conhecidas", async () => {
    const casos: [Record<string, unknown>, string][] = [
      [{ p_telefone: "123" }, "telefone_invalido"],
      [{ p_canal: "amazon" }, "canal_obrigatorio"],
      [{ p_produto: produtoPausadoId }, "produto_obrigatorio"],
      [{ p_produto: undefined, p_produto_outro: "  " }, "produto_obrigatorio"],
      [{ p_aceita_contato: false }, "consentimento_obrigatorio"],
      [{ p_email: "sem-arroba" }, "email_invalido"],
      [{ p_nome: " " }, "nome_obrigatorio"],
    ];
    for (const [extra, chave] of casos) {
      const { error } = await inscrever({ p_email: email("erro"), ...extra });
      expect(error?.message, chave).toBe(chave);
    }
  });

  it("origem fora da lista vira outro", async () => {
    const { data } = await inscrever({
      p_email: email("origem"),
      p_telefone: telefone(4),
      p_origem: "qualquer",
    });
    const r = data as unknown as Resultado;
    const { data: i } = await admin()
      .from("inscricoes_sorteio")
      .select("origem")
      .eq("id", r.inscricao_id)
      .single();
    expect(i?.origem).toBe("outro");
  });

  it("limita a 20 inscrições por ip_hash em uma hora", async () => {
    const ip = `ip-limite-${sufixo}`;
    for (let n = 0; n < 20; n++) {
      const { error } = await inscrever({
        p_email: email(`limite-${n}`),
        p_telefone: telefone(10 + n),
        p_ip_hash: ip,
      });
      expect(error, `inscrição ${n}`).toBeNull();
    }
    const { error } = await inscrever({
      p_email: email("limite-21"),
      p_telefone: telefone(31),
      p_ip_hash: ip,
    });
    expect(error?.message).toBe("muitas_tentativas");
  });

  it("perfil leitura lê inscrições mas não grava; anônimo lê vazio", async () => {
    const { data, error } = await leitura.cliente.from("inscricoes_sorteio").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    const { error: e } = await leitura.cliente.from("inscricoes_sorteio").insert({
      cliente_id: "00000000-0000-0000-0000-000000000000",
      canal_id: canalShopeeId,
      produto_outro: "x",
    });
    expect(e?.code).toBe("42501");
    const { data: a } = await anonimo().from("inscricoes_sorteio").select("id");
    expect(a).toEqual([]);
    const { data: s } = await anonimo().from("sorteios").select("id");
    expect(s).toEqual([]);
  });
});

describe("realizar_sorteio", () => {
  let clienteId: string;
  beforeAll(async () => {
    const r = (
      await inscrever({ p_email: email("sorteio"), p_telefone: telefone(5), p_ip_hash: "ip-s" })
    ).data as unknown as Resultado;
    clienteId = r.cliente_id;
    // Inscrição num mês sintético para o sorteio nunca disputar o mês real.
    await admin().from("inscricoes_sorteio").insert({
      cliente_id: clienteId,
      produto_id: produtoId,
      canal_id: canalShopeeId,
      aceita_contato: true,
      referencia: REFERENCIA_SINTETICA,
    });
  });
  afterAll(async () => {
    await admin().from("sorteios").delete().eq("referencia", REFERENCIA_SINTETICA);
  });

  it("recusa quem não é dono", async () => {
    const { error } = await leitura.cliente.rpc("realizar_sorteio", {
      p_referencia: REFERENCIA_SINTETICA,
    });
    expect(error?.message).toBe("sem_permissao");
  });

  it("dono sorteia uma vez por mês e o mês vazio dá sem_inscricoes", async () => {
    const { data, error } = await dono.cliente.rpc("realizar_sorteio", {
      p_referencia: REFERENCIA_SINTETICA,
    });
    expect(error).toBeNull();
    const ganhador = data as unknown as { nome: string; email: string; produto: string };
    expect(ganhador.email).toBe(email("sorteio"));
    expect(ganhador.produto).toBe(`Produto sorteio ${sufixo}`);
    const { data: sorteio } = await admin()
      .from("sorteios")
      .select("sorteado_por")
      .eq("referencia", REFERENCIA_SINTETICA)
      .single();
    expect(sorteio?.sorteado_por).toBe(dono.id);

    const { error: deNovo } = await dono.cliente.rpc("realizar_sorteio", {
      p_referencia: REFERENCIA_SINTETICA,
    });
    expect(deNovo?.message).toBe("sorteio_ja_realizado");

    const { error: vazio } = await dono.cliente.rpc("realizar_sorteio", {
      p_referencia: "1999-02",
    });
    expect(vazio?.message).toBe("sem_inscricoes");

    const { error: invalida } = await dono.cliente.rpc("realizar_sorteio", {
      p_referencia: "abc",
    });
    expect(invalida?.message).toBe("data_invalida");
  });
});
