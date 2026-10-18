import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { lerChave } from "@/lib/cripto";
import { BancoFalso, ConectorFalso, numeroCfg } from "./falsos";
import { GerenciadorSessoes } from "./sessoes";
import { processarComando } from "./comandos";
import { estadoNoBanco } from "./estado-auth";

let banco: BancoFalso;
let conectores: Map<string, ConectorFalso>;
let sessoes: GerenciadorSessoes;

beforeEach(() => {
  vi.useFakeTimers();
  banco = new BancoFalso();
  conectores = new Map();
  sessoes = new GerenciadorSessoes(banco, "w1", (n) => {
    const c = new ConectorFalso();
    conectores.set(n, c);
    return c;
  });
});
afterEach(() => vi.useRealTimers());

describe("sessões do worker", () => {
  it("conectar: QR vai para o banco sem conteúdo no evento; conexão sincroniza grupos", async () => {
    banco.numerosCfg = [numeroCfg("n1")];
    banco.comandos.push({
      id: "c1",
      numero_id: "n1",
      tipo: "conectar",
      payload: {},
      status: "pendente",
    });
    expect(await processarComando(banco, sessoes, "w1")).toBe(true);
    const c = conectores.get("n1")!;
    await c.emitir({ tipo: "qr", conteudo: "data:image/png;base64,QR" });
    expect(banco.qrs).toEqual([{ numero: "n1", tipo: "qr", conteudo: "data:image/png;base64,QR" }]);
    expect(banco.eventos.find((e) => e.tipo === "qr_gerado")?.detalhe).toBeUndefined();
    c.grupos = [{ jid: "1-2@g.us", nome: "G", membros: 10, admin: true, so_admins: false }];
    await c.emitir({ tipo: "conectado", jid: "5531@s.whatsapp.net", nome: "FCS" });
    await vi.advanceTimersByTimeAsync(3_100);
    expect(banco.gruposSincronizados).toEqual([c.grupos]);
    expect(sessoes.conectados()).toEqual(["n1"]);
    expect(banco.comandos[0]).toMatchObject({ status: "concluido" });
  });

  it("sem aceite de risco o comando falha e nada abre", async () => {
    banco.numerosCfg = [numeroCfg("n1", { aceito: false })];
    banco.comandos.push({
      id: "c1",
      numero_id: "n1",
      tipo: "conectar",
      payload: {},
      status: "pendente",
    });
    await processarComando(banco, sessoes, "w1");
    expect(banco.comandos[0]).toMatchObject({ status: "falhou", resultado: "aceite_obrigatorio" });
    expect(conectores.size).toBe(0);
  });

  it("trava de outro worker impede abrir a sessão", async () => {
    banco.travas.set("n1", "w2");
    expect(await sessoes.abrir(numeroCfg("n1"), null)).toBe(false);
    expect(conectores.size).toBe(0);
  });

  it("queda comum religa com espera; sessão encerrada apaga credencial e libera trava", async () => {
    await sessoes.abrir(numeroCfg("n1"), null);
    const c = conectores.get("n1")!;
    await c.emitir({ tipo: "conectado", jid: null, nome: null });
    await c.emitir({ tipo: "desconectado", motivo: "Conexão expirou.", sessaoEncerrada: false });
    expect(c.iniciado).toBe(1);
    await vi.advanceTimersByTimeAsync(5_100);
    expect(c.iniciado).toBe(2);
    expect(banco.eventos.some((e) => e.tipo === "reconectando")).toBe(true);
    await c.emitir({
      tipo: "desconectado",
      motivo: "Sessão encerrada no celular.",
      sessaoEncerrada: true,
    });
    expect(banco.sessaoApagada).toEqual(["n1"]);
    expect(banco.travas.has("n1")).toBe(false);
    expect(sessoes.abertos()).toEqual([]);
  });

  it("entrada e saída de participantes viram só contagem", async () => {
    await sessoes.abrir(numeroCfg("n1"), null);
    await conectores
      .get("n1")!
      .emitir({ tipo: "participantes", jid: "1-2@g.us", acao: "entrada", quantidade: 2 });
    expect(banco.eventosGrupo).toEqual([{ jid: "1-2@g.us", tipo: "entrada", quantidade: 2 }]);
  });

  it("deploy fecha sem logout; remover faz logout e apaga a sessão", async () => {
    banco.numerosCfg = [numeroCfg("n1"), numeroCfg("n2")];
    await sessoes.abrir(banco.numerosCfg[0], null);
    await sessoes.abrir(banco.numerosCfg[1], null);
    banco.comandos.push({
      id: "c2",
      numero_id: "n2",
      tipo: "remover",
      payload: {},
      status: "pendente",
    });
    await processarComando(banco, sessoes, "w1");
    expect(conectores.get("n2")!.parado).toEqual([true]);
    expect(banco.estados.at(-1)).toMatchObject({ numero: "n2", status: "removido" });
    await sessoes.fecharTodas();
    expect(conectores.get("n1")!.parado).toEqual([false]);
    expect(banco.travas.size).toBe(0);
  });

  it("envio de teste só para grupo de teste e com sessão conectada", async () => {
    banco.numerosCfg = [numeroCfg("n1")];
    await sessoes.abrir(banco.numerosCfg[0], null);
    banco.comandos.push({
      id: "c3",
      numero_id: "n1",
      tipo: "enviar_teste",
      payload: { grupo_id: "g" },
      status: "pendente",
    });
    await processarComando(banco, sessoes, "w1");
    expect(banco.comandos[0]).toMatchObject({ status: "falhou", resultado: "sessao_desconectada" });
    await conectores.get("n1")!.emitir({ tipo: "conectado", jid: null, nome: null });
    banco.testes.set("g", { jid: "9-9@g.us", nome: "Teste" });
    banco.comandos.push({
      id: "c4",
      numero_id: "n1",
      tipo: "enviar_teste",
      payload: { grupo_id: "g" },
      status: "pendente",
    });
    await processarComando(banco, sessoes, "w1");
    const enviado = conectores.get("n1")!.enviados[0];
    expect(enviado.jid).toBe("9-9@g.us");
    expect(enviado.id).toMatch(/^3EB0[0-9A-F]{18}$/);
  });
});

describe("estado de autenticação no banco", () => {
  it("credenciais e chaves voltam iguais e ficam cifradas", async () => {
    const k = lerChave(randomBytes(32).toString("base64"));
    const chaves = { atual: k, todas: [k] };
    const a = await estadoNoBanco(banco, "n1", chaves);
    await a.salvarCreds();
    await a.state.keys.set({ session: { "abc.0": new Uint8Array([1, 2, 3]) } });
    for (const v of banco.sessao.values()) expect(v.startsWith("v1.")).toBe(true);
    expect([...banco.sessao.values()].join("")).not.toContain("noiseKey");
    const b = await estadoNoBanco(banco, "n1", chaves);
    expect(b.state.creds.registrationId).toBe(a.state.creds.registrationId);
    const lido = await b.state.keys.get("session", ["abc.0", "inexistente"]);
    expect(Array.from(lido["abc.0"] as Uint8Array)).toEqual([1, 2, 3]);
    expect(lido.inexistente).toBeUndefined();
    await b.state.keys.set({ session: { "abc.0": null } });
    expect(banco.sessao.has("n1|session-abc.0")).toBe(false);
  });
});
