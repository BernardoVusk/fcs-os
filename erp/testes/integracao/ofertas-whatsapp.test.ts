import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 14: números, comandos, trava por número, QR, estado, lacunas, grupos sincronizados e
// eventos de membros. O worker é testado com o papel real ofe_worker pelo pooler.
const URL_WORKER = process.env.SUPABASE_TESTE_WORKER_DB_URL;
let dono: UsuarioTeste;
let operador: UsuarioTeste;
let w1: pg.Client;
let w2: pg.Client;
let numero = "";
let outro = "";
const jid = `${Date.now()}-111@g.us`;

async function conectar() {
  const c = new pg.Client({ connectionString: URL_WORKER, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
}

beforeAll(async () => {
  await garantirMigracoes();
  [dono, operador] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("operador")]);
  if (URL_WORKER) [w1, w2] = await Promise.all([conectar(), conectar()]);
});
afterAll(async () => {
  const a = admin();
  await a.from("ofe_grupos").delete().eq("jid", jid);
  for (const id of [numero, outro].filter(Boolean)) {
    await a.from("ofe_comandos").delete().eq("numero_id", id);
    await a.from("ofe_numeros").delete().eq("id", id);
  }
  await a.from("ofe_worker_estado").delete().like("worker_id", "teste-%");
  await a.rpc("ofe_gerar_alertas");
  await Promise.all([w1?.end(), w2?.end()]);
  await Promise.all([dono?.remover(), operador?.remover()]);
});

describe.skipIf(!URL_WORKER)("ofertas: WhatsApp e worker", () => {
  it("só o dono cadastra número; conectar exige aceite de risco", async () => {
    const { error: negado } = await operador.cliente.from("ofe_numeros").insert({ rotulo: "x" });
    expect(negado?.code).toBe("42501");
    const { data, error } = await dono.cliente
      .from("ofe_numeros")
      .insert({ rotulo: `teste ${jid}` })
      .select("id")
      .single();
    expect(error).toBeNull();
    numero = data!.id;
    outro = (
      await dono.cliente
        .from("ofe_numeros")
        .insert({ rotulo: `outro ${jid}` })
        .select("id")
        .single()
    ).data!.id;
    const { error: semAceite } = await dono.cliente.rpc("ofe_enviar_comando", {
      p_numero: numero,
      p_tipo: "conectar",
    });
    expect(semAceite?.message).toBe("aceite_obrigatorio");
    await dono.cliente
      .from("ofe_numeros")
      .update({
        aceite_risco_em: new Date().toISOString(),
        aceite_risco_por: dono.id,
        aceite_risco_versao: "2026-10-18",
      })
      .in("id", [numero, outro]);
    const a = await dono.cliente.rpc("ofe_enviar_comando", {
      p_numero: numero,
      p_tipo: "conectar",
    });
    const b = await dono.cliente.rpc("ofe_enviar_comando", {
      p_numero: numero,
      p_tipo: "conectar",
    });
    expect(a.error).toBeNull();
    expect(b.data).toBe(a.data);
    const { error: op } = await operador.cliente.rpc("ofe_enviar_comando", {
      p_numero: numero,
      p_tipo: "conectar",
    });
    expect(op?.message).toBe("sem_permissao");
    const { error: sinc } = await operador.cliente.rpc("ofe_enviar_comando", {
      p_numero: numero,
      p_tipo: "sincronizar_grupos",
    });
    expect(sinc).toBeNull();
  });

  it("trava do número: um worker por vez; comando entregue a um só", async () => {
    expect(
      (await w1.query("select public.ofe_w_assumir_numero($1, 'teste-a', 60) as ok", [numero]))
        .rows[0].ok,
    ).toBe(true);
    expect(
      (await w2.query("select public.ofe_w_assumir_numero($1, 'teste-b', 60) as ok", [numero]))
        .rows[0].ok,
    ).toBe(false);
    const [r1, r2] = await Promise.all([
      w1.query("select * from public.ofe_w_proximo_comando('teste-a')"),
      w2.query("select * from public.ofe_w_proximo_comando('teste-b')"),
    ]);
    const entregues = [...r1.rows, ...r2.rows].filter((c) => c.numero_id === numero);
    expect(entregues.length).toBeLessThanOrEqual(1);
    expect(r2.rows.filter((c) => c.numero_id === numero)).toEqual([]);
    await w1.query("select public.ofe_w_liberar_numero($1, 'teste-a')", [numero]);
    expect(
      (await w2.query("select public.ofe_w_assumir_numero($1, 'teste-b', 60) as ok", [numero]))
        .rows[0].ok,
    ).toBe(true);
    await w2.query("select public.ofe_w_liberar_numero($1, 'teste-b')", [numero]);
  });

  it("QR só para o dono; conectar apaga o QR, fecha lacuna e registra evento", async () => {
    await w1.query("select public.ofe_w_qr($1, 'qr', 'data:image/png;base64,AAAA', 60)", [numero]);
    const { data: doDono } = await dono.cliente
      .from("ofe_qr")
      .select("tipo")
      .eq("numero_id", numero);
    expect(doDono).toEqual([{ tipo: "qr" }]);
    const { data: doOperador } = await operador.cliente
      .from("ofe_qr")
      .select("tipo")
      .eq("numero_id", numero);
    expect(doOperador).toEqual([]);
    await w1.query(
      "select public.ofe_w_estado($1, 'conectado', '5531999990000@s.whatsapp.net', 'Teste')",
      [numero],
    );
    await w1.query(
      "select public.ofe_w_estado($1, 'desconectado', null, null, 'conexão perdida')",
      [numero],
    );
    const { data: aberta } = await admin()
      .from("ofe_coleta_lacunas")
      .select("fim")
      .eq("numero_id", numero);
    expect(aberta).toEqual([{ fim: null }]);
    await w1.query("select public.ofe_w_estado($1, 'conectado')", [numero]);
    const { data: fechada } = await admin()
      .from("ofe_coleta_lacunas")
      .select("fim")
      .eq("numero_id", numero);
    expect(fechada?.[0].fim).not.toBeNull();
    const { data: qr } = await admin().from("ofe_qr").select("numero_id").eq("numero_id", numero);
    expect(qr).toEqual([]);
    const { data: eventos } = await dono.cliente
      .from("ofe_numeros_eventos")
      .select("tipo")
      .eq("numero_id", numero)
      .order("ocorrido_em");
    expect(eventos?.map((e) => e.tipo)).toEqual(["conectado", "desconectado", "conectado"]);
  });

  it("sincroniza grupos sem função, mede membros e conta entradas e saídas só do coletor", async () => {
    const grupos = (membros: number) =>
      JSON.stringify([{ jid, nome: "Achadinhos teste", membros, admin: true, so_admins: true }]);
    await w1.query("select public.ofe_w_sincronizar_grupos($1, $2::jsonb)", [numero, grupos(100)]);
    await w1.query("select public.ofe_w_sincronizar_grupos($1, $2::jsonb)", [numero, grupos(100)]);
    const { data: g } = await dono.cliente
      .from("ofe_grupos_resumo")
      .select("id, funcao, cadastro, membros_atual, numero_coletor_id")
      .eq("jid", jid)
      .single();
    expect(g).toMatchObject({
      funcao: "nenhuma",
      cadastro: "sincronizado",
      membros_atual: 100,
      numero_coletor_id: numero,
    });
    await w1.query("select public.ofe_w_evento_grupo($1, $2, 'entrada', 3)", [numero, jid]);
    await w1.query("select public.ofe_w_evento_grupo($1, $2, 'saida', 1)", [numero, jid]);
    await w1.query("select public.ofe_w_evento_grupo($1, $2, 'entrada', 50)", [outro, jid]);
    const { data: ev } = await admin()
      .from("ofe_grupos_eventos")
      .select("tipo, quantidade")
      .eq("grupo_id", g!.id!)
      .order("id");
    expect(ev).toEqual([
      { tipo: "entrada", quantidade: 3 },
      { tipo: "saida", quantidade: 1 },
    ]);
    const { data: med } = await admin()
      .from("ofe_grupos_medicoes")
      .select("membros")
      .eq("grupo_id", g!.id!)
      .order("id");
    expect(med?.map((m) => m.membros)).toEqual([100, 103, 102]);
  });

  it("worker não lê nada fora do módulo; sessão não é visível pela sessão do usuário", async () => {
    await expect(w1.query("select count(*) from public.lancamentos")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      w1.query("select public.ofe_enviar_comando($1, 'conectar')", [numero]),
    ).rejects.toMatchObject({ code: "42501" });
    await w1.query(
      "insert into public.ofe_sessoes (numero_id, chave, valor) values ($1, 'creds', 'v1.x.y.z.w')",
      [numero],
    );
    const { data, error } = await dono.cliente.from("ofe_sessoes").select("chave");
    expect(data ?? []).toEqual([]);
    expect(error?.code).toBe("42501");
    await w1.query("select public.ofe_w_apagar_sessao($1)", [numero]);
  });

  it("alerta de número desconectado e de worker parado", async () => {
    await w1.query("select public.ofe_w_estado($1, 'desconectado', null, null, 'teste')", [numero]);
    await admin()
      .from("ofe_numeros_estado")
      .update({ atualizado_em: new Date(Date.now() - 10 * 60_000).toISOString() })
      .eq("numero_id", numero);
    await admin().from("ofe_worker_estado").delete().neq("worker_id", "");
    await admin().rpc("ofe_gerar_alertas");
    const { data } = await admin()
      .from("alertas")
      .select("tipo")
      .in("tipo", ["ofe_numero_desconectado", "ofe_worker_parado"])
      .is("resolvido_em", null);
    expect(data?.map((d) => d.tipo).sort()).toEqual([
      "ofe_numero_desconectado",
      "ofe_worker_parado",
    ]);
    await w1.query("select public.ofe_w_batimento('teste-a', 'teste')");
    await w1.query("select public.ofe_w_estado($1, 'conectado')", [numero]);
    await admin().rpc("ofe_gerar_alertas");
    const { data: depois } = await admin()
      .from("alertas")
      .select("tipo")
      .in("tipo", ["ofe_numero_desconectado", "ofe_worker_parado"])
      .is("resolvido_em", null);
    expect(depois).toEqual([]);
  });
});
