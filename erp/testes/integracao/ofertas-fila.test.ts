import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 15: filas, preparação, reserva com skip locked, retentativa, incerto, limites e rodadas.
const URL_WORKER = process.env.SUPABASE_TESTE_WORKER_DB_URL;
const W = "teste-fila";
let operador: UsuarioTeste;
let w1: pg.Client;
let w2: pg.Client;
const ids = { numero: "", grupo: "", oferta: "", fila: "", filaManual: "" };
const sufixo = Date.now();

async function conectar() {
  const c = new pg.Client({ connectionString: URL_WORKER, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
}
const a = () => admin();

async function envioAtual(fila: string) {
  const { data } = await a()
    .from("ofe_envios")
    .select(
      "id, status, motivo, tentativas, preparado_em, publicacao:ofe_publicacoes!inner(fila_id)",
    )
    .eq("publicacao.fila_id", fila)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  return data!;
}

async function reservar(c: pg.Client) {
  return (await c.query("select * from public.ofe_reservar_envio($1)", [W])).rows;
}

beforeAll(async () => {
  await garantirMigracoes();
  operador = await criarUsuarioTeste("operador");
  if (!URL_WORKER) return;
  [w1, w2] = await Promise.all([conectar(), conectar()]);
  await a()
    .from("ofe_integracoes")
    .update({ conformidade_em: new Date().toISOString(), conformidade_observacao: "teste" })
    .eq("plataforma", "shopee");
  ids.numero = (
    await a()
      .from("ofe_numeros")
      .insert({
        rotulo: `fila ${sufixo}`,
        aceite_risco_em: new Date().toISOString(),
        aceite_risco_versao: "t",
        limite_por_hora: 50,
        limite_por_dia: 100,
        intervalo_min_segundos: 20,
        janela_inicio: "00:00",
        janela_fim: "23:59",
      })
      .select("id")
      .single()
  ).data!.id;
  await w1.query("select public.ofe_w_assumir_numero($1, $2, 3600)", [ids.numero, W]);
  await w1.query("select public.ofe_w_estado($1, 'conectado', '5531@s.whatsapp.net')", [
    ids.numero,
  ]);
  ids.grupo = (
    await a()
      .from("ofe_grupos")
      .insert({
        nome: `fila ${sufixo}`,
        funcao: "destino",
        jid: `${sufixo}-9@g.us`,
        cadastro: "sincronizado",
      })
      .select("id")
      .single()
  ).data!.id;
  ids.oferta = (
    await a()
      .from("ofe_ofertas")
      .insert({
        plataforma: "shopee",
        url_original: "https://shopee.com.br/x-i.1.2",
        titulo: `fila ${sufixo}`,
        status: "pronta",
      })
      .select("id")
      .single()
  ).data!.id;
  ids.fila = (
    await a()
      .from("ofe_filas")
      .insert({
        nome: `fila ${sufixo}`,
        numero_id: ids.numero,
        intervalo_segundos: 60,
        janela_inicio: "00:00",
        janela_fim: "23:59",
        status: "ativa",
      })
      .select("id")
      .single()
  ).data!.id;
  await a().from("ofe_filas_destinos").insert({ fila_id: ids.fila, grupo_id: ids.grupo });
  await a()
    .from("ofe_filas_itens")
    .insert({ fila_id: ids.fila, oferta_id: ids.oferta, posicao: 1 });
});

afterAll(async () => {
  if (URL_WORKER) {
    for (const f of [ids.fila, ids.filaManual].filter(Boolean)) {
      const { data: pubs } = await a().from("ofe_publicacoes").select("id").eq("fila_id", f);
      const p = (pubs ?? []).map((x) => x.id);
      if (p.length) {
        await a().from("ofe_envios").delete().in("publicacao_id", p);
        await a().from("ofe_publicacoes").delete().in("id", p);
      }
      await a().from("ofe_filas").delete().eq("id", f);
    }
    if (ids.oferta) await a().from("ofe_ofertas").delete().eq("id", ids.oferta);
    if (ids.grupo) await a().from("ofe_grupos").delete().eq("id", ids.grupo);
    if (ids.numero) await a().from("ofe_numeros").delete().eq("id", ids.numero);
    await a()
      .from("ofe_integracoes")
      .update({ conformidade_em: null, conformidade_observacao: null })
      .eq("plataforma", "shopee");
    await a().rpc("ofe_gerar_alertas");
    await Promise.all([w1?.end(), w2?.end()]);
  }
  await operador?.remover();
});

describe.skipIf(!URL_WORKER)("ofertas: fila e despacho", () => {
  it("avança uma publicação por vez e a preparação grava texto e link", async () => {
    await w1.query("select public.ofe_avancar_filas()");
    await w1.query("select public.ofe_avancar_filas()");
    const { count } = await a()
      .from("ofe_publicacoes")
      .select("id", { count: "exact", head: true })
      .eq("fila_id", ids.fila);
    expect(count).toBe(1);
    const e = await envioAtual(ids.fila);
    expect(e).toMatchObject({ status: "aguardando", preparado_em: null });
    expect(await reservar(w1)).toEqual([]);
    const para = (await w1.query("select * from public.ofe_w_para_preparar($1, 5)", [W])).rows.map(
      (r) => r.ofe_w_para_preparar,
    );
    expect(para).toContain(e.id);
    await w1.query("select public.ofe_preparar_envio($1, $2, $3, 'api')", [
      e.id,
      "Texto pronto https://s.shopee.com.br/x",
      "https://s.shopee.com.br/x",
    ]);
  });

  it("duas reservas ao mesmo tempo entregam o envio a uma só", async () => {
    const [r1, r2] = await Promise.all([reservar(w1), reservar(w2)]);
    expect(r1.length + r2.length).toBe(1);
    const reservado = [...r1, ...r2][0];
    expect(reservado).toMatchObject({
      grupo_jid: `${sufixo}-9@g.us`,
      link_url: "https://s.shopee.com.br/x",
    });
  });

  it("erro antes do despacho volta com espera; reserva vencida com despacho iniciado vira incerto", async () => {
    const e = await envioAtual(ids.fila);
    await w1.query(
      "select public.ofe_concluir_envio($1, $2, 'erro_antes', null, 'socket fechado')",
      [e.id, W],
    );
    expect(await envioAtual(ids.fila)).toMatchObject({ status: "aguardando", tentativas: 1 });
    expect(await reservar(w1)).toEqual([]);
    await a()
      .from("ofe_envios")
      .update({ proxima_tentativa_em: new Date(Date.now() - 1000).toISOString() })
      .eq("id", e.id);
    expect((await reservar(w1)).length).toBe(1);
    expect(
      (await w1.query("select public.ofe_marcar_despacho($1, $2) as ok", [e.id, W])).rows[0].ok,
    ).toBe(true);
    await a()
      .from("ofe_envios")
      .update({ reservado_ate: new Date(Date.now() - 1000).toISOString() })
      .eq("id", e.id);
    expect(await reservar(w1)).toEqual([]);
    expect(await envioAtual(ids.fila)).toMatchObject({
      status: "incerto",
      motivo: "resultado_desconhecido",
    });
  });

  it("tentar de novo pelo ERP e concluir como enviado; limite por hora segura o próximo", async () => {
    const e = await envioAtual(ids.fila);
    const { data: n } = await operador.cliente.rpc("ofe_reenviar", { p_envios: [e.id] });
    expect(n).toBe(1);
    const r = await reservar(w1);
    expect(r.length).toBe(1);
    await w1.query("select public.ofe_marcar_despacho($1, $2)", [e.id, W]);
    await w1.query("select public.ofe_concluir_envio($1, $2, 'enviado', '3EB0ABC')", [e.id, W]);
    expect(await envioAtual(ids.fila)).toMatchObject({ status: "enviado" });

    await a().from("ofe_numeros").update({ limite_por_hora: 1 }).eq("id", ids.numero);
    await a()
      .from("ofe_filas_itens")
      .insert({ fila_id: ids.fila, oferta_id: ids.oferta, posicao: 2 });
    await a()
      .from("ofe_publicacoes")
      .update({ agendado_para: new Date(Date.now() - 120_000).toISOString() })
      .eq("fila_id", ids.fila);
    await w1.query("select public.ofe_avancar_filas()");
    const novo = await envioAtual(ids.fila);
    await w1.query(
      "select public.ofe_preparar_envio($1, 'Outro texto', 'https://s.shopee.com.br/y', 'api')",
      [novo.id],
    );
    expect(await reservar(w1)).toEqual([]);
    await a().from("ofe_numeros").update({ limite_por_hora: 50 }).eq("id", ids.numero);
  });

  it("número desconectado ou fora da janela não envia", async () => {
    await a()
      .from("ofe_envios")
      .update({
        enviado_em: new Date(Date.now() - 3600_000).toISOString(),
        despacho_iniciado_em: null,
      })
      .eq("status", "enviado")
      .eq("grupo_id", ids.grupo);
    await w1.query("select public.ofe_w_estado($1, 'desconectado', null, null, 'teste')", [
      ids.numero,
    ]);
    expect(await reservar(w1)).toEqual([]);
    await w1.query("select public.ofe_w_estado($1, 'conectado')", [ids.numero]);
    await a()
      .from("ofe_numeros")
      .update({ janela_inicio: "00:00", janela_fim: "00:01" })
      .eq("id", ids.numero);
    const agoraSp = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    });
    if (agoraSp >= "00:01") expect(await reservar(w1)).toEqual([]);
    await a()
      .from("ofe_numeros")
      .update({ janela_inicio: "00:00", janela_fim: "23:59" })
      .eq("id", ids.numero);
    const liberado = await reservar(w1);
    expect(liberado.length).toBe(1);
    await w1.query("select public.ofe_concluir_envio($1, $2, 'enviado', '3EB0DEF')", [
      liberado[0].envio_id,
      W,
    ]);
  });

  it("fila sem reinício encerra no fim da rodada; manual expira e plataforma bloqueada é ignorada", async () => {
    await a()
      .from("ofe_envios")
      .update({ status: "enviado", enviado_em: new Date(Date.now() - 7200_000).toISOString() })
      .eq("grupo_id", ids.grupo)
      .eq("status", "aguardando");
    await a()
      .from("ofe_publicacoes")
      .update({ agendado_para: new Date(Date.now() - 7200_000).toISOString() })
      .eq("fila_id", ids.fila);
    await w1.query("select public.ofe_avancar_filas()");
    const { data: f } = await a()
      .from("ofe_filas")
      .select("status, rodada")
      .eq("id", ids.fila)
      .single();
    expect(f).toEqual({ status: "encerrada", rodada: 1 });

    ids.filaManual = (
      await a()
        .from("ofe_filas")
        .insert({
          nome: `manual ${sufixo}`,
          intervalo_segundos: 60,
          janela_inicio: "00:00",
          janela_fim: "23:59",
          status: "ativa",
          manual_expira_horas: 1,
        })
        .select("id")
        .single()
    ).data!.id;
    await a().from("ofe_filas_destinos").insert({ fila_id: ids.filaManual, grupo_id: ids.grupo });
    await a()
      .from("ofe_filas_itens")
      .insert({ fila_id: ids.filaManual, oferta_id: ids.oferta, posicao: 1 });
    await a().from("ofe_integracoes").update({ conformidade_em: null }).eq("plataforma", "shopee");
    await operador.cliente.rpc("ofe_avancar_filas");
    expect(await envioAtual(ids.filaManual)).toMatchObject({
      status: "ignorado",
      motivo: "plataforma_bloqueada",
    });

    await a()
      .from("ofe_integracoes")
      .update({ conformidade_em: new Date().toISOString() })
      .eq("plataforma", "shopee");
    await a()
      .from("ofe_filas")
      .update({ reinicio_diario: true, rodada_data: "2000-01-01" })
      .eq("id", ids.filaManual);
    await a()
      .from("ofe_publicacoes")
      .update({ agendado_para: new Date(Date.now() - 7200_000).toISOString() })
      .eq("fila_id", ids.filaManual);
    await operador.cliente.rpc("ofe_avancar_filas");
    await operador.cliente.rpc("ofe_avancar_filas");
    const manual = await envioAtual(ids.filaManual);
    expect(manual).toMatchObject({ status: "aguardando" });
    const { data: fm } = await a()
      .from("ofe_filas")
      .select("rodada")
      .eq("id", ids.filaManual)
      .single();
    expect(fm?.rodada).toBe(2);
    await a()
      .from("ofe_envios")
      .update({ agendado_para: new Date(Date.now() - 7200_000).toISOString() })
      .eq("id", manual.id);
    await operador.cliente.rpc("ofe_avancar_filas");
    expect(await envioAtual(ids.filaManual)).toMatchObject({
      status: "ignorado",
      motivo: "nao_publicado_a_tempo",
    });
  });

  it("preparação manual pela sessão: quem escreve grava, leitura não", async () => {
    const e = await envioAtual(ids.filaManual);
    await a()
      .from("ofe_envios")
      .update({ status: "aguardando", motivo: null, preparado_em: null })
      .eq("id", e.id);
    const leitura = await criarUsuarioTeste("leitura");
    const { error: negado } = await leitura.cliente.rpc("ofe_preparar_envio", {
      p_envio: e.id,
      p_texto: "x",
      p_link: "https://s.shopee.com.br/z",
      p_origem: "api",
    });
    expect(negado?.message).toBe("sem_permissao");
    await leitura.remover();
    const { error } = await operador.cliente.rpc("ofe_preparar_envio", {
      p_envio: e.id,
      p_texto: "Texto https://s.shopee.com.br/z",
      p_link: "https://s.shopee.com.br/z",
      p_origem: "api",
    });
    expect(error).toBeNull();
    const { data } = await a()
      .from("ofe_envios")
      .select("texto_final, preparado_em")
      .eq("id", e.id)
      .single();
    expect(data?.texto_final).toBe("Texto https://s.shopee.com.br/z");
    expect(data?.preparado_em).not.toBeNull();
  });

  it("alerta de envio incerto ou com falha aponta a fila", async () => {
    const e = await envioAtual(ids.fila);
    await a().from("ofe_envios").update({ status: "falhou", motivo: "falha_envio" }).eq("id", e.id);
    await a().rpc("ofe_gerar_alertas");
    const { data } = await a()
      .from("alertas")
      .select("tipo, entidade_tipo")
      .eq("entidade_id", ids.fila)
      .is("resolvido_em", null);
    expect(data).toEqual([{ tipo: "ofe_envio_falhou", entidade_tipo: "ofe_fila" }]);
  });
});
