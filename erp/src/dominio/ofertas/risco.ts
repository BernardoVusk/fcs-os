/**
 * Texto do aceite de risco da conexão por QR Code (registrado por número, com versão). Mudou o
 * texto, muda a versão: números aceitos na versão anterior continuam valendo, mas a tela mostra.
 */
export const VERSAO_ACEITE = "2026-10-18";

export const TEXTO_ACEITE = [
  "A conexão por QR Code ou código de pareamento usa o protocolo do WhatsApp Web por uma biblioteca não oficial (Baileys). Não é a API oficial do WhatsApp.",
  "Os Termos do WhatsApp proíbem uso não pessoal e mensagens automáticas sem autorização. O número pode ser suspenso ou banido a qualquer momento, sem aviso.",
  "Nenhum intervalo, limite ou configuração garante proteção contra bloqueio. Os limites do sistema servem para evitar envio excessivo, não para contornar detecção.",
  "Use só número dedicado à operação de ofertas, que a empresa aceite perder. Mantenha o modo assistido como alternativa.",
  "A sessão fica cifrada no banco da empresa e só o worker do sistema a abre.",
];

export const STATUS_NUMERO_ROTULO: Record<string, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando leitura",
  conectando: "Conectando",
  conectado: "Conectado",
  erro: "Erro",
  removido: "Removido",
};

export const EVENTO_NUMERO_ROTULO: Record<string, string> = {
  conectado: "Conectou",
  desconectado: "Desconectou",
  reconectando: "Tentando reconectar",
  qr_gerado: "QR Code gerado",
  pareamento_gerado: "Código de pareamento gerado",
  sessao_encerrada: "Sessão encerrada",
  erro: "Erro",
  removido: "Removido",
  comando: "Comando",
};

/** Telefone para exibição: +55 (31) 9 9999-0000. */
export function telefoneExibido(t: string | null): string {
  if (!t) return "Sem telefone";
  const m = t.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : t;
}
