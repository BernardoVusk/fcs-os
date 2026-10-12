import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

// Fase 8: status validado pelo fluxo, carimbos de fechado, histórico, recorrência única por prazo,
// relações, permissões por papel e busca global.
let dono: UsuarioTeste;
let operador: UsuarioTeste;
let leitura: UsuarioTeste;
const sufixo = Date.now();
const hoje = new Date().toISOString().slice(0, 10);
let modeloId: string;
let recorrenciaId: string;
let fluxoId: string;

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
  await a.from("plan_itens").delete().like("titulo", `PLAN ${sufixo}%`);
  if (recorrenciaId) await a.from("plan_recorrencias").delete().eq("id", recorrenciaId);
  if (modeloId) await a.from("plan_modelos").delete().eq("id", modeloId);
  if (fluxoId) await a.from("plan_fluxos").delete().eq("id", fluxoId);
  await Promise.all([dono?.remover(), operador?.remover(), leitura?.remover()]);
});

describe("itens e fluxo", () => {
  it("status vazio vira o padrão do tipo; status fora do fluxo é rejeitado", async () => {
    const c = operador.cliente;
    const { data, error } = await c
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} tarefa`, status: "", prazo: hoje })
      .select("id, status, origem, criado_por")
      .single();
    expect(error).toBeNull();
    expect(data!.status).toBe("a_fazer");
    expect(data!.origem).toBe("manual");
    expect(data!.criado_por).toBe(operador.id);
    const { error: invalido } = await c
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} inválida`, status: "inexistente" });
    expect(invalido?.message).toBe("status_invalido");
    const { error: cruzado } = await c
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} cruzada`, status: "publicado" });
    expect(cruzado?.message).toBe("status_invalido");
  });

  it("fechado carimba concluído e publicado; sair do fechado limpa concluído; histórico registra", async () => {
    const c = dono.cliente;
    const { data: item } = await c
      .from("plan_itens")
      .insert({
        tipo: "conteudo",
        titulo: `PLAN ${sufixo} reel`,
        status: "ideia",
        formato: "reel",
        canal_publicacao: "instagram",
        checklist: [{ nome: "Roteiro", feito: false }],
      })
      .select("id")
      .single();
    const id = item!.id;
    await c.from("plan_itens").update({ status: "publicado" }).eq("id", id);
    let { data: lido } = await c
      .from("plan_itens")
      .select("status, concluido_em, publicado_em")
      .eq("id", id)
      .single();
    expect(lido!.concluido_em).not.toBeNull();
    expect(lido!.publicado_em).not.toBeNull();
    await c.from("plan_itens").update({ status: "producao", prazo: hoje }).eq("id", id);
    ({ data: lido } = await c
      .from("plan_itens")
      .select("status, concluido_em, publicado_em")
      .eq("id", id)
      .single());
    expect(lido!.concluido_em).toBeNull();
    expect(lido!.publicado_em).not.toBeNull();
    const { data: historico } = await c
      .from("plan_historico")
      .select("campo, de, para, usuario_id")
      .eq("item_id", id)
      .order("em");
    expect(historico!.map((h) => [h.campo, h.de, h.para])).toEqual([
      ["status", "ideia", "publicado"],
      ["status", "publicado", "producao"],
      ["prazo", null, hoje],
    ]);
    expect(historico!.every((h) => h.usuario_id === dono.id)).toBe(true);
  });

  it("relação não é reflexiva nem duplicada; apagar o item apaga a relação", async () => {
    const c = dono.cliente;
    const { data: a } = await c
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} A`, status: "" })
      .select("id")
      .single();
    const { data: b } = await c
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} B`, status: "" })
      .select("id")
      .single();
    const reflexiva = await c
      .from("plan_relacoes")
      .insert({ de_id: a!.id, para_id: a!.id, tipo: "bloqueia" });
    expect(reflexiva.error?.code).toBe("23514");
    const ok = await c
      .from("plan_relacoes")
      .insert({ de_id: a!.id, para_id: b!.id, tipo: "bloqueia" });
    expect(ok.error).toBeNull();
    const dupla = await c
      .from("plan_relacoes")
      .insert({ de_id: a!.id, para_id: b!.id, tipo: "bloqueia" });
    expect(dupla.error?.code).toBe("23505");
    await c.from("plan_itens").delete().eq("id", b!.id);
    const { count } = await c
      .from("plan_relacoes")
      .select("id", { count: "exact", head: true })
      .eq("de_id", a!.id);
    expect(count).toBe(0);
  });
});

describe("modelo e recorrência", () => {
  it("recorrência gera um item por prazo; o mesmo prazo não entra duas vezes", async () => {
    const c = dono.cliente;
    const { data: modelo, error } = await c
      .from("plan_modelos")
      .insert({
        nome: `PLAN ${sufixo} modelo`,
        tipo: "conteudo",
        campos_padrao: {
          titulo: "Bastidores da semana",
          formato: "stories",
          canal_publicacao: "instagram",
        },
        checklist_padrao: [
          { nome: "Gravar", feito: false },
          { nome: "Postar", feito: false },
        ],
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    modeloId = modelo!.id;
    const { data: rec } = await c
      .from("plan_recorrencias")
      .insert({ modelo_id: modeloId, frequencia: "semanal", inicio: hoje })
      .select("id")
      .single();
    recorrenciaId = rec!.id;
    const linha = {
      tipo: "conteudo",
      titulo: `PLAN ${sufixo} bastidores`,
      status: "",
      prazo: hoje,
      modelo_id: modeloId,
      recorrencia_id: recorrenciaId,
      origem: "recorrencia",
      checklist: [{ nome: "Gravar", feito: false }],
    };
    const { error: e1 } = await c.from("plan_itens").insert(linha);
    expect(e1).toBeNull();
    const { error: e2 } = await c.from("plan_itens").insert(linha);
    expect(e2?.code).toBe("23505");
    const { data: gerado } = await c
      .from("plan_itens")
      .select("status, origem")
      .eq("recorrencia_id", recorrenciaId)
      .single();
    expect(gerado).toEqual({ status: "ideia", origem: "recorrencia" });
  });
});

describe("permissões, fluxos e busca", () => {
  it("leitura não escreve; operador não apaga; dono apaga", async () => {
    const { error: negado } = await leitura.cliente
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} leitura`, status: "" });
    expect(negado?.code).toBe("42501");
    const { data: lidos } = await leitura.cliente
      .from("plan_itens")
      .select("id")
      .like("titulo", `PLAN ${sufixo}%`);
    expect(lidos!.length).toBeGreaterThan(0);
    const { data: alvo } = await operador.cliente
      .from("plan_itens")
      .insert({ tipo: "projeto", titulo: `PLAN ${sufixo} projeto`, status: "" })
      .select("id")
      .single();
    await operador.cliente.from("plan_itens").delete().eq("id", alvo!.id);
    const { count: ainda } = await operador.cliente
      .from("plan_itens")
      .select("id", { count: "exact", head: true })
      .eq("id", alvo!.id);
    expect(ainda).toBe(1);
    await dono.cliente.from("plan_itens").delete().eq("id", alvo!.id);
    const { count: depois } = await dono.cliente
      .from("plan_itens")
      .select("id", { count: "exact", head: true })
      .eq("id", alvo!.id);
    expect(depois).toBe(0);
  });

  it("só o dono cria status; um padrão por tipo", async () => {
    const { error: negado } = await operador.cliente
      .from("plan_fluxos")
      .insert({ tipo: "tarefa", codigo: `teste_${sufixo}`.slice(0, 30), nome: "Teste" });
    expect(negado?.code).toBe("42501");
    const { data: novo, error } = await dono.cliente
      .from("plan_fluxos")
      .insert({ tipo: "tarefa", codigo: "em_revisao", nome: "Em revisão", ordem: 25 })
      .select("id")
      .single();
    expect(error).toBeNull();
    fluxoId = novo!.id;
    const { error: segundoPadrao } = await dono.cliente
      .from("plan_fluxos")
      .insert({ tipo: "tarefa", codigo: "outro_padrao", nome: "Outro", padrao: true });
    expect(segundoPadrao?.code).toBe("23505");
    const { data: usando, error: e3 } = await dono.cliente
      .from("plan_itens")
      .insert({ tipo: "tarefa", titulo: `PLAN ${sufixo} revisão`, status: "em_revisao" })
      .select("status")
      .single();
    expect(e3).toBeNull();
    expect(usando!.status).toBe("em_revisao");
  });

  it("busca global acha o item pelo título com rota do detalhe", async () => {
    const { data: lista } = await leitura.cliente
      .from("plan_itens")
      .select("id")
      .eq("titulo", `PLAN ${sufixo} reel`)
      .single();
    const busca = await leitura.cliente.rpc("buscar_global", {
      termo: `plan ${sufixo} reel`,
      tipos: ["tarefa"],
    });
    expect(busca.error).toBeNull();
    const achado = busca.data!.find((r) => r.id === lista!.id);
    expect(achado?.rota).toBe(`/planejamento/itens/${lista!.id}`);
    expect(achado?.subtitulo).toContain("conteudo producao");
  });
});
