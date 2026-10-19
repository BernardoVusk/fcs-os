import { describe, expect, it } from "vitest";
import { Copiador, type AutomacaoAtiva, type BancoCopiador } from "./copiador";
import { FILTROS_PADRAO } from "@/dominio/ofertas/copiador";
import { REGRAS_PADRAO } from "@/dominio/ofertas/limpeza";

class Falso implements BancoCopiador {
  autos: AutomacaoAtiva[] = [];
  registros = new Map<string, Record<string, unknown>>();
  enfileirados: string[] = [];
  async automacoes() {
    return this.autos;
  }
  async registrar(a: AutomacaoAtiva, m: { id: string }) {
    const id = `${a.id}:${m.id}`;
    if (this.registros.has(id)) return null;
    this.registros.set(id, { status: a.status === "ativa" ? "recebida" : "previa" });
    return id;
  }
  async atualizar(id: string, campos: Record<string, unknown>) {
    Object.assign(this.registros.get(id)!, campos);
  }
  async enfileirar(id: string) {
    this.enfileirados.push(id);
    return "publicada";
  }
}

const auto = (x: Partial<AutomacaoAtiva> = {}): AutomacaoAtiva => ({
  id: "a1",
  status: "ativa",
  origem_jid: "1-1@g.us",
  coletor: "n1",
  plataformas: ["shopee", "amazon", "mercado_livre", "awin"],
  filtros: FILTROS_PADRAO,
  limpeza: REGRAS_PADRAO,
  revisao_manual: false,
  grupo_origem_id: "g1",
  ...x,
});
const msg = (id: string, texto: string) => ({
  jid: "1-1@g.us",
  id,
  texto,
  em: new Date(),
  temImagem: false,
});

describe("copiador no worker", () => {
  it("publica oferta elegível uma vez só, mesmo com a mensagem repetida", async () => {
    const b = new Falso();
    b.autos = [auto()];
    const c = new Copiador(b, { anunciantes: async () => [] });
    await c.receber("n1", msg("m1", "Carrinho R$ 10 https://amzn.to/x"));
    await c.receber("n1", msg("m1", "Carrinho R$ 10 https://amzn.to/x"));
    expect(b.enfileirados).toEqual(["a1:m1"]);
    expect(b.registros.get("a1:m1")).toMatchObject({
      plataforma: "amazon",
      texto_processado: "Carrinho R$ 10 {{link}}",
    });
  });

  it("só o número coletor processa; rascunho só guarda prévia; Mercado Livre vai para revisão", async () => {
    const b = new Falso();
    b.autos = [auto(), auto({ id: "a2", status: "rascunho" })];
    const c = new Copiador(b, { anunciantes: async () => [] });
    await c.receber("n2", msg("m1", "X https://amzn.to/x"));
    expect(b.registros.size).toBe(0);
    await c.receber(
      "n1",
      msg("m2", "Miniatura https://produto.mercadolivre.com.br/MLB-123456789-x"),
    );
    expect(b.registros.get("a1:m2")).toMatchObject({
      status: "aguardando_revisao",
      motivo: "link_manual_obrigatorio",
    });
    expect(b.registros.get("a2:m2")).toMatchObject({ status: "previa" });
    expect(b.enfileirados).toEqual([]);
  });

  it("mensagem sem link elegível é ignorada com motivo", async () => {
    const b = new Falso();
    b.autos = [auto()];
    const c = new Copiador(b, { anunciantes: async () => [] });
    await c.receber("n1", msg("m3", "Bom dia, grupo!"));
    expect(b.registros.get("a1:m3")).toEqual({ status: "ignorada", motivo: "sem_link_elegivel" });
  });
});
