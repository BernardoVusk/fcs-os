import type {
  ConectorWhatsApp,
  ConteudoEnvio,
  EventoConector,
  GrupoRemoto,
} from "@/dominio/ofertas/conector";
import type { Banco, Comando, NumeroCfg } from "./banco";
import type { BancoEnvios, ContextoEnvio, Reservado } from "./banco-envios";
import type { LinkPronto } from "@/integracoes/montar-envios";

/** Conector e banco em memória para os testes do worker. Nada aqui roda em produção. */

export class ConectorFalso implements ConectorWhatsApp {
  ouvintes: ((e: EventoConector) => void | Promise<void>)[] = [];
  iniciado = 0;
  parado: boolean[] = [];
  enviados: { jid: string; conteudo: ConteudoEnvio; id: string }[] = [];
  grupos: GrupoRemoto[] = [];
  falharEnvio: Error | null = null;

  aoEvento(f: (e: EventoConector) => void | Promise<void>) {
    this.ouvintes.push(f);
  }
  async emitir(e: EventoConector) {
    for (const f of this.ouvintes) await f(e);
  }
  async iniciar() {
    this.iniciado += 1;
  }
  async listarGrupos() {
    return this.grupos;
  }
  async enviar(jid: string, conteudo: ConteudoEnvio, id: string) {
    if (this.falharEnvio) throw this.falharEnvio;
    this.enviados.push({ jid, conteudo, id });
    return id;
  }
  async parar(encerrar: boolean) {
    this.parado.push(encerrar);
  }
}

export class BancoFalso implements Banco {
  numerosCfg: NumeroCfg[] = [];
  comandos: (Comando & { status: string; resultado?: string })[] = [];
  travas = new Map<string, string>();
  estados: { numero: string; status: string; erro?: string | null }[] = [];
  eventos: { numero: string; tipo: string; detalhe?: string }[] = [];
  qrs: { numero: string; tipo: string; conteudo: string | null }[] = [];
  lacunas: { numero: string; motivo: string }[] = [];
  gruposSincronizados: GrupoRemoto[][] = [];
  eventosGrupo: { jid: string; tipo: string; quantidade: number }[] = [];
  sessao = new Map<string, string>();
  sessaoApagada: string[] = [];
  testes = new Map<string, { jid: string; nome: string }>();

  async batimento() {}
  async numeros() {
    return this.numerosCfg;
  }
  async assumir(numero: string, worker: string) {
    const dono = this.travas.get(numero);
    if (dono && dono !== worker) return false;
    this.travas.set(numero, worker);
    return true;
  }
  async liberar(numero: string, worker: string) {
    if (this.travas.get(numero) === worker) this.travas.delete(numero);
  }
  async proximoComando() {
    const c = this.comandos.find((x) => x.status === "pendente");
    if (!c) return null;
    c.status = "processando";
    return c;
  }
  async concluirComando(id: string, ok: boolean, resultado?: string) {
    const c = this.comandos.find((x) => x.id === id);
    if (c) Object.assign(c, { status: ok ? "concluido" : "falhou", resultado });
  }
  async estado(numero: string, status: string, o: { erro?: string | null } = {}) {
    this.estados.push({ numero, status, erro: o.erro });
  }
  async eventoNumero(numero: string, tipo: string, detalhe?: string) {
    this.eventos.push({ numero, tipo, detalhe });
  }
  async qr(numero: string, tipo: string, conteudo: string | null) {
    this.qrs.push({ numero, tipo, conteudo });
  }
  async lacunaDesde(numero: string, _inicio: Date, motivo: string) {
    this.lacunas.push({ numero, motivo });
  }
  async sincronizarGrupos(_numero: string, grupos: GrupoRemoto[]) {
    this.gruposSincronizados.push(grupos);
    return grupos.length;
  }
  async eventoGrupo(_numero: string, jid: string, tipo: string, quantidade: number) {
    this.eventosGrupo.push({ jid, tipo, quantidade });
  }
  async grupoTeste(id: string) {
    return this.testes.get(id) ?? null;
  }
  async lerSessao(numero: string, chaves: string[]) {
    const m = new Map<string, string>();
    for (const c of chaves) {
      const v = this.sessao.get(`${numero}|${c}`);
      if (v) m.set(c, v);
    }
    return m;
  }
  async gravarSessao(numero: string, pares: { chave: string; valor: string | null }[]) {
    for (const p of pares) {
      if (p.valor === null) this.sessao.delete(`${numero}|${p.chave}`);
      else this.sessao.set(`${numero}|${p.chave}`, p.valor);
    }
  }
  async apagarSessao(numero: string) {
    this.sessaoApagada.push(numero);
    for (const k of [...this.sessao.keys()]) if (k.startsWith(`${numero}|`)) this.sessao.delete(k);
  }
  async gerarAlertas() {}
  async fechar() {}
}

export function numeroCfg(id: string, extra: Partial<NumeroCfg> = {}): NumeroCfg {
  return {
    id,
    rotulo: `Número ${id}`,
    telefone: "5531999990000",
    aceito: true,
    ativo: true,
    status: null,
    worker_id: null,
    trava_ate: null,
    ultima_atividade_em: null,
    tem_sessao: false,
    ...extra,
  };
}

export class BancoEnviosFalso implements BancoEnvios {
  linhas: { plataforma: string; identificadores: unknown; segredo: string | null }[] = [];
  contextos = new Map<string, ContextoEnvio>();
  preparar: string[] = [];
  preparos: { envio: string; r: unknown }[] = [];
  links: { oferta: string; grupo: string; link: LinkPronto }[] = [];
  fila: Reservado[] = [];
  ordem: string[] = [];
  conclusoes: { envio: string; resultado: string; waId?: string | null; erro?: string | null }[] =
    [];

  async integracoes() {
    return this.linhas;
  }
  async anunciantes() {
    return [];
  }
  async modelos() {
    return [
      {
        id: "m1",
        tipo: "oferta" as const,
        plataforma: null,
        padrao: true,
        ativo: true,
        corpo: "{{produto}}\n{{link}}",
      },
    ];
  }
  async avancarFilas() {
    return 0;
  }
  async paraPreparar() {
    const r = this.preparar;
    this.preparar = [];
    return r;
  }
  async contexto(envio: string) {
    return this.contextos.get(envio) ?? null;
  }
  async gravarPreparo(envio: string, r: unknown) {
    this.preparos.push({ envio, r });
  }
  async gravarLink(oferta: string, grupo: string, link: LinkPronto) {
    this.links.push({ oferta, grupo, link });
  }
  async atualizarOferta() {}
  async reservar() {
    return this.fila.shift() ?? null;
  }
  async marcarDespacho(envio: string) {
    this.ordem.push(`despacho:${envio}`);
    return true;
  }
  async concluir(
    envio: string,
    _w: string,
    resultado: string,
    waId?: string | null,
    erro?: string | null,
  ) {
    this.ordem.push(`concluir:${envio}`);
    this.conclusoes.push({ envio, resultado, waId, erro });
  }
}
