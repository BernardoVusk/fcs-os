import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 16: copiador. Origem autorizada, texto de terceiro só para quem escreve, duplicidade e intervalo.
const URL_WORKER = process.env.SUPABASE_TESTE_WORKER_DB_URL;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
let dono: UsuarioTeste;
let w: pg.Client;
const s = Date.now();
const ids = { origem: "", destino: "", auto: "", numero: "" };
const a = () => admin();

async function mensagem(wa: string, chave: string | null, hash: string) {
  const r = await w.query(
    `insert into public.ofe_mensagens_origem (automacao_id, grupo_id, wa_mensagem_id, texto, texto_processado, hash_conteudo, chave_produto, plataforma, link_original, titulo_sugerido, status)
     values ($1, $2, $3, 'Carrinho R$ 10 https://amzn.to/x', 'Carrinho R$ 10 {{link}}', $5, $4, 'amazon', 'https://amzn.to/x', 'Carrinho', 'recebida') returning id`,
    [ids.auto, ids.origem, wa, chave, hash],
  );
  return r.rows[0].id as string;
}

beforeAll(async () => {
  await garantirMigracoes();
  [operador, leitura, dono] = await Promise.all([
    criarUsuarioTeste("operador"),
    criarUsuarioTeste("leitura"),
    criarUsuarioTeste("dono"),
  ]);
  if (!URL_WORKER) return;
  w = new pg.Client({ connectionString: URL_WORKER, ssl: { rejectUnauthorized: false } });
  await w.connect();
  await a()
    .from("ofe_integracoes")
    .update({ conformidade_em: new Date().toISOString(), conformidade_observacao: "teste" })
    .eq("plataforma", "amazon");
  ids.numero = (
    await a()
      .from("ofe_numeros")
      .insert({ rotulo: `cop ${s}`, aceite_risco_em: new Date().toISOString() })
      .select("id")
      .single()
  ).data!.id;
  ids.origem = (
    await a()
      .from("ofe_grupos")
      .insert({
        nome: `origem ${s}`,
        funcao: "monitorado",
        jid: `${s}-1@g.us`,
        cadastro: "sincronizado",
      })
      .select("id")
      .single()
  ).data!.id;
  ids.destino = (
    await a()
      .from("ofe_grupos")
      .insert({
        nome: `destino ${s}`,
        funcao: "destino",
        jid: `${s}-2@g.us`,
        cadastro: "sincronizado",
      })
      .select("id")
      .single()
  ).data!.id;
});

afterAll(async () => {
  if (URL_WORKER) {
    const { data: msgs } = await a()
      .from("ofe_mensagens_origem")
      .select("publicacao_id, oferta_id")
      .eq("automacao_id", ids.auto);
    for (const m of msgs ?? []) {
      if (m.publicacao_id) {
        await a().from("ofe_envios").delete().eq("publicacao_id", m.publicacao_id);
        await a()
          .from("ofe_mensagens_origem")
          .update({ publicacao_id: null, oferta_id: null })
          .eq("publicacao_id", m.publicacao_id);
        await a().from("ofe_publicacoes").delete().eq("id", m.publicacao_id);
      }
      if (m.oferta_id) await a().from("ofe_ofertas").delete().eq("id", m.oferta_id);
    }
    if (ids.auto) await a().from("ofe_automacoes").delete().eq("id", ids.auto);
    await a().from("ofe_grupos").delete().in("id", [ids.origem, ids.destino].filter(Boolean));
    if (ids.numero) await a().from("ofe_numeros").delete().eq("id", ids.numero);
    await a()
      .from("ofe_integracoes")
      .update({ conformidade_em: null, conformidade_observacao: null })
      .eq("plataforma", "amazon");
    await w?.end();
  }
  await Promise.all([operador?.remover(), leitura?.remover(), dono?.remover()]);
});

describe.skipIf(!URL_WORKER)("ofertas: copiador", () => {
  it("automação só lê grupo de origem com autorização registrada", async () => {
    const { error } = await operador.cliente
      .from("ofe_automacoes")
      .insert({ nome: `cop ${s}`, grupo_origem_id: ids.origem, numero_id: ids.numero });
    expect(error?.message).toBe("origem_nao_autorizada");
    await dono.cliente
      .from("ofe_grupos")
      .update({
        funcao: "origem",
        autorizado_em: new Date().toISOString(),
        autorizado_por: dono.id,
        autorizacao_descricao: "autorizado por e-mail (teste)",
      })
      .eq("id", ids.origem);
    const { data, error: e2 } = await operador.cliente
      .from("ofe_automacoes")
      .insert({
        nome: `cop ${s}`,
        grupo_origem_id: ids.origem,
        numero_id: ids.numero,
        intervalo_segundos: 600,
        status: "ativa",
        revisao_manual: false,
      })
      .select("id")
      .single();
    expect(e2).toBeNull();
    ids.auto = data!.id;
    await operador.cliente
      .from("ofe_automacoes_destinos")
      .insert({ automacao_id: ids.auto, grupo_id: ids.destino });
  });

  it("publica com {{link}} no texto, ignora repetida e agenda a próxima depois do intervalo", async () => {
    const m1 = await mensagem("w1", "amazon:B0ABCDEF12", "h1");
    expect((await w.query("select public.ofe_enfileirar_mensagem($1) as s", [m1])).rows[0].s).toBe(
      "publicada",
    );
    const { data: pub } = await a()
      .from("ofe_mensagens_origem")
      .select("publicacao:ofe_publicacoes(texto_editado, modo, agendado_para)")
      .eq("id", m1)
      .single();
    const p1 = pub!.publicacao as unknown as {
      texto_editado: string;
      modo: string;
      agendado_para: string;
    };
    expect(p1).toMatchObject({ texto_editado: "Carrinho R$ 10 {{link}}", modo: "automatico" });

    const m2 = await mensagem("w2", "amazon:B0ABCDEF12", "h2");
    expect((await w.query("select public.ofe_enfileirar_mensagem($1) as s", [m2])).rows[0].s).toBe(
      "ignorada",
    );
    const { data: dup } = await a()
      .from("ofe_mensagens_origem")
      .select("motivo")
      .eq("id", m2)
      .single();
    expect(dup?.motivo).toBe("duplicado");

    const m3 = await mensagem("w3", "amazon:B0OUTRO123", "h3");
    await w.query("select public.ofe_enfileirar_mensagem($1)", [m3]);
    const { data: pub3 } = await a()
      .from("ofe_mensagens_origem")
      .select("publicacao:ofe_publicacoes(agendado_para)")
      .eq("id", m3)
      .single();
    const quando = Date.parse(
      (pub3!.publicacao as unknown as { agendado_para: string }).agendado_para,
    );
    expect(quando - Date.parse(p1.agendado_para)).toBeGreaterThanOrEqual(599_000);
  });

  it("texto de terceiro não aparece para o papel leitura; operador aprova revisão com link colado", async () => {
    const { data: l } = await leitura.cliente
      .from("ofe_mensagens_origem")
      .select("id")
      .eq("automacao_id", ids.auto);
    expect(l).toEqual([]);
    const m4 = await mensagem("w4", "mercado_livre:MLB123", "h4");
    await a()
      .from("ofe_mensagens_origem")
      .update({ status: "aguardando_revisao", plataforma: "amazon" })
      .eq("id", m4);
    const { data, error } = await operador.cliente.rpc("ofe_enfileirar_mensagem", {
      p_mensagem: m4,
      p_texto: "Texto revisado {{link}}",
      p_link_colado: "https://www.amazon.com.br/dp/B0REVISADO?tag=fcs3d-20",
    });
    expect(error).toBeNull();
    expect(data).toBe("publicada");
    const { data: of } = await a()
      .from("ofe_mensagens_origem")
      .select("revisado_por, oferta:ofe_ofertas(link_colado)")
      .eq("id", m4)
      .single();
    expect(of?.revisado_por).toBe(operador.id);
    expect((of?.oferta as unknown as { link_colado: string }).link_colado).toContain("B0REVISADO");
  });
});
