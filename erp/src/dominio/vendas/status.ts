export type StatusPedido = {
  id: string;
  codigo: string;
  nome: string;
  ordem: number;
  cor: string | null;
  fechado: boolean;
  gera_recebivel: boolean;
  baixa_estoque: boolean;
  padrao: boolean;
};

/** Lista padrão (spec 5.6). Códigos são estáveis; nomes e cores são editáveis. */
export const STATUS_PADRAO: Omit<StatusPedido, "id">[] = [
  {
    codigo: "recebido",
    nome: "Recebido",
    ordem: 10,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: true,
  },
  {
    codigo: "aguardando_pagamento",
    nome: "Aguardando pagamento",
    ordem: 20,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "pagamento_aprovado",
    nome: "Pagamento aprovado",
    ordem: 30,
    cor: null,
    fechado: false,
    gera_recebivel: true,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "aguardando_producao",
    nome: "Aguardando produção",
    ordem: 40,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "em_producao",
    nome: "Em produção",
    ordem: 50,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "em_acabamento",
    nome: "Em acabamento",
    ordem: 60,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "em_embalagem",
    nome: "Em embalagem",
    ordem: 70,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "pronto_para_envio",
    nome: "Pronto para envio",
    ordem: 80,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "enviado",
    nome: "Enviado",
    ordem: 90,
    cor: null,
    fechado: false,
    gera_recebivel: false,
    baixa_estoque: true,
    padrao: false,
  },
  {
    codigo: "concluido",
    nome: "Concluído",
    ordem: 100,
    cor: null,
    fechado: true,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "cancelado",
    nome: "Cancelado",
    ordem: 110,
    cor: null,
    fechado: true,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
  {
    codigo: "devolvido",
    nome: "Devolvido",
    ordem: 120,
    cor: null,
    fechado: true,
    gera_recebivel: false,
    baixa_estoque: false,
    padrao: false,
  },
];

/** Regras da lista: exatamente um gera_recebivel, no máximo um baixa_estoque, exatamente um padrão. */
export function validarStatus(
  lista: Pick<StatusPedido, "gera_recebivel" | "baixa_estoque" | "padrao">[],
): string[] {
  const erros: string[] = [];
  if (lista.filter((s) => s.gera_recebivel).length !== 1) erros.push("status_um_gera_recebivel");
  if (lista.filter((s) => s.baixa_estoque).length > 1) erros.push("status_um_baixa_estoque");
  if (lista.filter((s) => s.padrao).length !== 1) erros.push("status_um_padrao");
  return erros;
}

/**
 * Importação só avança (ordem maior) ou mantém; pela tela qualquer mudança é permitida, exceto reabrir
 * um pedido fechado como cancelado ou devolvido sem passar por ação própria.
 */
export function podeMudarStatus(
  de: StatusPedido,
  para: StatusPedido,
  origem: "manual" | "importacao",
): boolean {
  if (de.id === para.id) return false;
  if (origem === "importacao") return para.ordem > de.ordem;
  if (de.fechado && (de.codigo === "cancelado" || de.codigo === "devolvido"))
    return para.codigo === "recebido";
  return true;
}

export const STATUS_PAGAMENTO_ROTULO: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  reembolsado: "Reembolsado",
};
