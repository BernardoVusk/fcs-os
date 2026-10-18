/**
 * Porta do WhatsApp usada pelo worker. A implementação de hoje é a Baileys (sessão por QR, não
 * oficial); trocar por um provedor ou pela API oficial é escrever outra classe com este contrato.
 * Nenhum evento carrega telefone de participante: só contagens.
 */

export type GrupoRemoto = {
  jid: string;
  nome: string;
  membros: number | null;
  admin: boolean;
  so_admins: boolean | null;
};

export type MensagemGrupo = {
  jid: string;
  id: string;
  texto: string;
  em: Date;
  temImagem: boolean;
};

export type EventoConector =
  | { tipo: "qr"; conteudo: string }
  | { tipo: "pareamento"; codigo: string }
  | { tipo: "conectado"; jid: string | null; nome: string | null }
  | { tipo: "desconectado"; motivo: string; sessaoEncerrada: boolean }
  | { tipo: "participantes"; jid: string; acao: "entrada" | "saida"; quantidade: number }
  | { tipo: "mensagem_grupo"; mensagem: MensagemGrupo }
  | { tipo: "grupos_mudaram" };

export type ConteudoEnvio = { texto: string; imagem?: { dados: Buffer; tipo: string } | null };

export interface ConectorWhatsApp {
  iniciar(modo: { pareamento?: string | null }): Promise<void>;
  listarGrupos(): Promise<GrupoRemoto[]>;
  /** Devolve o id da mensagem aceita pelo WhatsApp. `idMensagem` fixo permite reconciliar. */
  enviar(jid: string, conteudo: ConteudoEnvio, idMensagem: string): Promise<string>;
  /** `encerrarSessao` faz logout no celular; sem ele só fecha a conexão (deploy, reinício). */
  parar(encerrarSessao: boolean): Promise<void>;
  aoEvento(f: (e: EventoConector) => void | Promise<void>): void;
}

/** Ação da Baileys para a contagem do módulo (promoção e rebaixamento não contam). */
export function acaoParticipantes(acao: string): "entrada" | "saida" | null {
  if (acao === "add") return "entrada";
  if (acao === "remove") return "saida";
  return null;
}

/** Id de mensagem determinístico por envio, no formato do WhatsApp (3EB0 + 18 hex). */
export async function idMensagemDoEnvio(
  envioId: string,
  hash: (texto: string) => Promise<string> | string,
): Promise<string> {
  const h = (await hash(`ofe-envio:${envioId}`)).toUpperCase();
  return `3EB0${h.slice(0, 18)}`;
}
