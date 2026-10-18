import type { ConectorWhatsApp, MensagemGrupo } from "@/dominio/ofertas/conector";
import type { Banco, NumeroCfg } from "./banco";
import { log, mensagemDeErro } from "./log";

export type FabricaConector = (numero: string) => ConectorWhatsApp;

type Sessao = {
  conector: ConectorWhatsApp;
  conectado: boolean;
  tentativas: number;
  religar?: ReturnType<typeof setTimeout>;
  sincronizar?: ReturnType<typeof setTimeout>;
  pareamento: string | null;
};

const ESPERAS_RELIGAR = [5_000, 15_000, 60_000, 300_000];
export const TRAVA_SEGUNDOS = 90;

/**
 * Uma sessão por número, aberta só quando o número tem aceite de risco e este worker tem a trava.
 * Queda comum religa com espera crescente; sessão encerrada no celular apaga as credenciais.
 */
export class GerenciadorSessoes {
  private sessoes = new Map<string, Sessao>();
  aoMensagemGrupo: ((numero: string, m: MensagemGrupo) => Promise<void>) | null = null;

  constructor(
    private readonly banco: Banco,
    private readonly worker: string,
    private readonly fabrica: FabricaConector,
    private readonly relogio: { agora: () => Date } = { agora: () => new Date() },
  ) {}

  conector(numero: string): ConectorWhatsApp | null {
    const s = this.sessoes.get(numero);
    return s?.conectado ? s.conector : null;
  }

  conectados(): string[] {
    return [...this.sessoes.entries()].filter(([, s]) => s.conectado).map(([n]) => n);
  }

  abertos(): string[] {
    return [...this.sessoes.keys()];
  }

  /** Na subida: retoma números com sessão salva; período parado vira lacuna de coleta. */
  async retomar(): Promise<void> {
    for (const n of await this.banco.numeros()) {
      if (!n.ativo || !n.aceito || !n.tem_sessao) continue;
      if (n.status === "conectado" && n.ultima_atividade_em)
        await this.banco.lacunaDesde(n.id, n.ultima_atividade_em, "worker reiniciado");
      await this.abrir(n, null);
    }
  }

  async abrir(n: NumeroCfg, pareamento: string | null): Promise<boolean> {
    if (this.sessoes.has(n.id)) return true;
    if (!(await this.banco.assumir(n.id, this.worker, TRAVA_SEGUNDOS))) {
      log("aviso", "trava_ocupada", { numero: n.id });
      return false;
    }
    const conector = this.fabrica(n.id);
    const s: Sessao = { conector, conectado: false, tentativas: 0, pareamento };
    this.sessoes.set(n.id, s);
    conector.aoEvento((e) => this.tratar(n.id, e));
    await this.banco.estado(n.id, "conectando");
    try {
      await conector.iniciar({ pareamento });
    } catch (e) {
      this.sessoes.delete(n.id);
      await this.banco.estado(n.id, "erro", { erro: mensagemDeErro(e) });
      await this.banco.liberar(n.id, this.worker);
      return false;
    }
    return true;
  }

  private async tratar(
    numero: string,
    e: Parameters<Parameters<ConectorWhatsApp["aoEvento"]>[0]>[0],
  ) {
    const s = this.sessoes.get(numero);
    if (!s) return;
    switch (e.tipo) {
      case "qr":
        await this.banco.qr(numero, "qr", e.conteudo, 60);
        await this.banco.eventoNumero(numero, "qr_gerado");
        return;
      case "pareamento":
        await this.banco.qr(numero, "pareamento", e.codigo, 120);
        await this.banco.eventoNumero(numero, "pareamento_gerado");
        return;
      case "conectado":
        s.conectado = true;
        s.tentativas = 0;
        await this.banco.estado(numero, "conectado", { jid: e.jid, nome: e.nome });
        log("info", "conectado", { numero });
        this.agendarSincronizacao(numero, 3_000);
        return;
      case "desconectado":
        s.conectado = false;
        if (e.sessaoEncerrada) {
          this.sessoes.delete(numero);
          await this.banco.apagarSessao(numero);
          await this.banco.estado(numero, "desconectado", { erro: e.motivo });
          await this.banco.eventoNumero(numero, "sessao_encerrada", e.motivo);
          await this.banco.liberar(numero, this.worker);
          log("aviso", "sessao_encerrada", { numero });
          return;
        }
        await this.banco.estado(numero, "desconectado", { erro: e.motivo });
        this.religar(numero);
        return;
      case "participantes":
        await this.banco.eventoGrupo(numero, e.jid, e.acao, e.quantidade);
        return;
      case "grupos_mudaram":
        this.agendarSincronizacao(numero, 30_000);
        return;
      case "mensagem_grupo":
        if (this.aoMensagemGrupo) await this.aoMensagemGrupo(numero, e.mensagem);
        return;
    }
  }

  private religar(numero: string) {
    const s = this.sessoes.get(numero);
    if (!s) return;
    const espera = ESPERAS_RELIGAR[Math.min(s.tentativas, ESPERAS_RELIGAR.length - 1)];
    s.tentativas += 1;
    clearTimeout(s.religar);
    s.religar = setTimeout(async () => {
      if (!this.sessoes.has(numero)) return;
      await this.banco.eventoNumero(numero, "reconectando", `tentativa ${s.tentativas}`);
      try {
        await s.conector.iniciar({ pareamento: null });
      } catch (e) {
        await this.banco.estado(numero, "erro", { erro: mensagemDeErro(e) });
        this.religar(numero);
      }
    }, espera);
  }

  agendarSincronizacao(numero: string, espera: number) {
    const s = this.sessoes.get(numero);
    if (!s) return;
    clearTimeout(s.sincronizar);
    s.sincronizar = setTimeout(() => {
      this.sincronizar(numero).catch((e) =>
        log("erro", "sincronizar", { numero, erro: mensagemDeErro(e) }),
      );
    }, espera);
  }

  async sincronizar(numero: string): Promise<number> {
    const c = this.conector(numero);
    if (!c) throw new Error("sessao_desconectada");
    const grupos = await c.listarGrupos();
    return this.banco.sincronizarGrupos(numero, grupos);
  }

  /** Renova a trava de cada sessão; se outro worker assumiu, esta fecha sem logout. */
  async renovarTravas(): Promise<void> {
    for (const numero of this.abertos()) {
      if (!(await this.banco.assumir(numero, this.worker, TRAVA_SEGUNDOS))) {
        log("aviso", "trava_perdida", { numero });
        await this.fechar(numero, false);
      }
    }
  }

  /** `encerrar` faz logout (desconectar e remover); sem ele só fecha (deploy). */
  async fechar(numero: string, encerrar: boolean): Promise<void> {
    const s = this.sessoes.get(numero);
    this.sessoes.delete(numero);
    if (s) {
      clearTimeout(s.religar);
      clearTimeout(s.sincronizar);
      await s.conector.parar(encerrar);
    }
    await this.banco.liberar(numero, this.worker);
  }

  async fecharTodas(): Promise<void> {
    for (const numero of this.abertos()) await this.fechar(numero, false);
  }

  /** Sincronização periódica (a cada 6 horas) dos números conectados. */
  async sincronizarTodos(): Promise<void> {
    for (const numero of this.conectados()) {
      try {
        await this.sincronizar(numero);
      } catch (e) {
        log("erro", "sincronizar", { numero, erro: mensagemDeErro(e) });
      }
    }
  }

  agora() {
    return this.relogio.agora();
  }
}
