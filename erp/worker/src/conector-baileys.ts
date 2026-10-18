import makeWASocket, {
  Browsers,
  DisconnectReason,
  isJidGroup,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  type WAMessage,
  type WASocket,
} from "baileys";
import QRCode from "qrcode";
import type { ChaveCripto } from "@/lib/cripto";
import {
  acaoParticipantes,
  type ConectorWhatsApp,
  type ConteudoEnvio,
  type EventoConector,
  type GrupoRemoto,
} from "@/dominio/ofertas/conector";
import type { Banco } from "./banco";
import { estadoNoBanco } from "./estado-auth";
import { log, loggerSilencioso, mensagemDeErro } from "./log";

/**
 * Conector pela Baileys (protocolo do WhatsApp Web, não oficial). Não marca online, não baixa
 * histórico, não lê conversa individual: só grupos. Sem nenhum recurso de contornar limite ou
 * detecção; a cadência é decidida fora daqui, pelos limites cadastrados do número.
 */
export class ConectorBaileys implements ConectorWhatsApp {
  private sock: WASocket | null = null;
  private ouvintes: ((e: EventoConector) => void | Promise<void>)[] = [];
  private parando = false;

  constructor(
    private readonly banco: Banco,
    private readonly numero: string,
    private readonly chaves: { atual: ChaveCripto; todas: ChaveCripto[] },
  ) {}

  aoEvento(f: (e: EventoConector) => void | Promise<void>) {
    this.ouvintes.push(f);
  }

  private async emitir(e: EventoConector) {
    for (const f of this.ouvintes) {
      try {
        await f(e);
      } catch (erro) {
        log("erro", "ouvinte_falhou", {
          numero: this.numero,
          evento: e.tipo,
          erro: mensagemDeErro(erro),
        });
      }
    }
  }

  async iniciar(modo: { pareamento?: string | null } = {}) {
    this.parando = false;
    const logger = loggerSilencioso(this.numero);
    const { state, salvarCreds } = await estadoNoBanco(this.banco, this.numero, this.chaves);
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      logger,
      browser: Browsers.ubuntu("FCS Ofertas"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
    });
    this.sock = sock;
    let pediuCodigo = false;

    sock.ev.on("creds.update", () => {
      salvarCreds().catch((e) =>
        log("erro", "salvar_creds", { numero: this.numero, erro: mensagemDeErro(e) }),
      );
    });

    sock.ev.on("connection.update", async (u) => {
      if (u.qr) {
        if (modo.pareamento && !pediuCodigo && !state.creds.registered) {
          pediuCodigo = true;
          try {
            const codigo = await sock.requestPairingCode(modo.pareamento);
            await this.emitir({ tipo: "pareamento", codigo });
          } catch (e) {
            log("erro", "pareamento", { numero: this.numero, erro: mensagemDeErro(e) });
          }
        } else if (!modo.pareamento) {
          await this.emitir({
            tipo: "qr",
            conteudo: await QRCode.toDataURL(u.qr, { margin: 1, width: 288 }),
          });
        }
      }
      if (u.connection === "open") {
        await this.emitir({
          tipo: "conectado",
          jid: sock.user?.id ? jidNormalizedUser(sock.user.id) : null,
          nome: sock.user?.name ?? null,
        });
      }
      if (u.connection === "close") {
        const codigo = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
          ?.output?.statusCode;
        const sessaoEncerrada =
          codigo === DisconnectReason.loggedOut || codigo === DisconnectReason.forbidden;
        this.sock = null;
        if (!this.parando)
          await this.emitir({
            tipo: "desconectado",
            motivo: motivoDoCodigo(codigo),
            sessaoEncerrada,
          });
      }
    });

    sock.ev.on("group-participants.update", async (u) => {
      const acao = acaoParticipantes(u.action);
      if (acao && u.participants.length > 0)
        await this.emitir({
          tipo: "participantes",
          jid: u.id,
          acao,
          quantidade: u.participants.length,
        });
    });

    sock.ev.on("groups.update", () => this.emitir({ tipo: "grupos_mudaram" }));
    sock.ev.on("groups.upsert", () => this.emitir({ tipo: "grupos_mudaram" }));

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) {
        const jid = m.key.remoteJid ?? "";
        if (!isJidGroup(jid) || m.key.fromMe) continue;
        const texto = textoDaMensagem(m);
        if (!texto) continue;
        await this.emitir({
          tipo: "mensagem_grupo",
          mensagem: {
            jid,
            id: m.key.id ?? "",
            texto: texto.slice(0, 4096),
            em: new Date(Number(m.messageTimestamp ?? Date.now() / 1000) * 1000),
            temImagem: !!m.message?.imageMessage,
          },
        });
      }
    });
  }

  async listarGrupos(): Promise<GrupoRemoto[]> {
    if (!this.sock) throw new Error("sessao_desconectada");
    const meu = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;
    const meuLid = this.sock.user?.lid ? jidNormalizedUser(this.sock.user.lid) : null;
    const grupos = await this.sock.groupFetchAllParticipating();
    return Object.values(grupos).map((g) => {
      const eu = g.participants.find((p) => {
        const id = jidNormalizedUser(p.id);
        return (
          id === meu || id === meuLid || (p.phoneNumber && jidNormalizedUser(p.phoneNumber) === meu)
        );
      });
      return {
        jid: g.id,
        nome: g.subject ?? "",
        membros: typeof g.size === "number" ? g.size : g.participants.length,
        admin: !!eu?.admin,
        so_admins: typeof g.announce === "boolean" ? g.announce : null,
      };
    });
  }

  async enviar(jid: string, conteudo: ConteudoEnvio, idMensagem: string) {
    if (!this.sock) throw new Error("sessao_desconectada");
    const r = conteudo.imagem
      ? await this.sock.sendMessage(
          jid,
          { image: conteudo.imagem.dados, mimetype: conteudo.imagem.tipo, caption: conteudo.texto },
          { messageId: idMensagem },
        )
      : await this.sock.sendMessage(jid, { text: conteudo.texto }, { messageId: idMensagem });
    return r?.key.id ?? idMensagem;
  }

  async parar(encerrarSessao: boolean) {
    this.parando = true;
    const s = this.sock;
    this.sock = null;
    if (!s) return;
    try {
      if (encerrarSessao) await s.logout("Removido no FCS ERP");
      else s.end(undefined);
    } catch (e) {
      log("aviso", "parar_sessao", { numero: this.numero, erro: mensagemDeErro(e) });
    }
  }
}

function motivoDoCodigo(codigo: number | undefined): string {
  switch (codigo) {
    case DisconnectReason.loggedOut:
      return "Sessão encerrada no celular. Conecte de novo pelo QR Code.";
    case DisconnectReason.forbidden:
      return "WhatsApp recusou a sessão (número pode estar bloqueado).";
    case DisconnectReason.connectionReplaced:
      return "Outra sessão abriu com o mesmo número.";
    case DisconnectReason.restartRequired:
      return "Reinício pedido pelo WhatsApp.";
    case DisconnectReason.timedOut:
      return "Conexão expirou.";
    case DisconnectReason.badSession:
      return "Sessão corrompida. Conecte de novo pelo QR Code.";
    default:
      return `Conexão fechada${codigo ? ` (código ${codigo})` : ""}.`;
  }
}

function textoDaMensagem(m: WAMessage): string {
  const c = m.message;
  if (!c) return "";
  return (
    c.conversation ??
    c.extendedTextMessage?.text ??
    c.imageMessage?.caption ??
    c.videoMessage?.caption ??
    ""
  );
}
