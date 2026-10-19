import { beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { lerChave } from "@/lib/cripto";
import { BancoEnviosFalso, BancoFalso, ConectorFalso, numeroCfg } from "./falsos";
import { GerenciadorSessoes } from "./sessoes";
import { Despachante } from "./despacho";

const k = lerChave(randomBytes(32).toString("base64"));
let banco: BancoFalso;
let envios: BancoEnviosFalso;
let conector: ConectorFalso;
let sessoes: GerenciadorSessoes;
let d: Despachante;

beforeEach(async () => {
  banco = new BancoFalso();
  envios = new BancoEnviosFalso();
  conector = new ConectorFalso();
  sessoes = new GerenciadorSessoes(banco, "w1", () => conector);
  d = new Despachante({
    banco,
    envios,
    sessoes,
    worker: "w1",
    chaves: { atual: k, todas: [k] },
    storageUrl: null,
    parando: () => false,
  });
  await sessoes.abrir(numeroCfg("n1"), null);
  await conector.emitir({ tipo: "conectado", jid: null, nome: null });
});

const reservado = (id: string) => ({
  envio_id: id,
  publicacao_id: "p",
  numero_id: "n1",
  grupo_jid: "1-2@g.us",
  texto: "Oferta https://link",
  link_url: "https://link",
  imagem_caminho: null,
  imagem_url: null,
  plataforma: "amazon",
});

describe("despacho do worker", () => {
  it("prepara com o link do grupo e grava o link novo", async () => {
    envios.linhas = [{ plataforma: "amazon", identificadores: { tag: "fcs3d-20" }, segredo: null }];
    envios.preparar = ["e1"];
    envios.contextos.set("e1", {
      envioId: "e1",
      ofertaId: "o1",
      fontesOferta: {},
      chaveProduto: "amazon:B0ABCDEF12",
      grupo: { id: "g1", nome: "G", campanha: null, tag_amazon: null },
      oferta: {
        id: "o1",
        plataforma: "amazon",
        url_original: "https://www.amazon.com.br/dp/B0ABCDEF12",
        url_produto: null,
        link_colado: null,
        campanha: null,
        titulo: "Carrinho",
        preco_atual: null,
        preco_anterior: null,
        desconto: null,
        preco_pix: null,
        parcelamento: null,
        avaliacao: null,
        avaliacoes_qtd: null,
        loja: null,
        preco_variavel: false,
        cta: null,
        dados_atualizados_em: null,
      },
      cupom: null,
      textoEditado: null,
      modeloFila: null,
      liberada: true,
      linkExistente: null,
    });
    await d.preparar();
    expect(envios.preparos).toEqual([
      {
        envio: "e1",
        r: {
          texto: "Carrinho\nhttps://www.amazon.com.br/dp/B0ABCDEF12?tag=fcs3d-20",
          link: { url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=fcs3d-20", origem: "tag" },
        },
      },
    ]);
    expect(envios.links).toHaveLength(1);
  });

  it("grava o início do despacho antes de mandar e conclui como enviado", async () => {
    envios.fila = [reservado("e1")];
    await d.despachar();
    expect(envios.ordem).toEqual(["despacho:e1", "concluir:e1"]);
    expect(envios.conclusoes[0]).toMatchObject({ envio: "e1", resultado: "enviado" });
    expect(conector.enviados[0]).toMatchObject({
      jid: "1-2@g.us",
      conteudo: { texto: "Oferta https://link", imagem: null },
    });
    expect(conector.enviados[0].id).toMatch(/^3EB0[0-9A-F]{18}$/);
  });

  it("erro depois do despacho vira incerto; recusa do WhatsApp vira falha definitiva", async () => {
    conector.falharEnvio = new Error("Connection Closed");
    envios.fila = [reservado("e1")];
    await d.despachar();
    conector.falharEnvio = new Error("not-authorized");
    envios.fila = [reservado("e2")];
    await d.despachar();
    expect(envios.conclusoes.map((c) => c.resultado)).toEqual(["incerto", "falha_definitiva"]);
  });

  it("sem sessão conectada o envio volta como erro antes do despacho", async () => {
    await conector.emitir({ tipo: "desconectado", motivo: "x", sessaoEncerrada: false });
    envios.fila = [reservado("e1")];
    await d.despachar();
    expect(envios.conclusoes).toEqual([
      { envio: "e1", resultado: "erro_antes", waId: null, erro: "sessao_desconectada" },
    ]);
    expect(envios.ordem).toEqual(["concluir:e1"]);
  });
});
