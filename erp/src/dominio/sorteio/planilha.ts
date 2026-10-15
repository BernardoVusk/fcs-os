import type { Celula } from "@/dominio/relatorios/csv";
import { formatarTelefone } from "@/dominio/clientes/telefone";
import { formatarDataHora } from "@/lib/formatos/data";

export type LinhaInscricao = {
  criado_em: string;
  aceita_contato: boolean;
  origem: string;
  produto_outro: string | null;
  cliente: { nome: string; email: string | null; telefone: string | null } | null;
  produto: { nome: string } | null;
  canal: { nome: string } | null;
};

export const CABECALHO_INSCRICOES = [
  "Nome",
  "E-mail",
  "Telefone",
  "Produto",
  "Canal",
  "Aceita contato",
  "Origem",
  "Data",
] as const;

/** Linhas da exportação CSV das inscrições de um mês. */
export function tabelaInscricoes(linhas: readonly LinhaInscricao[]): {
  cabecalho: readonly string[];
  linhas: Celula[][];
} {
  return {
    cabecalho: CABECALHO_INSCRICOES,
    linhas: linhas.map((l) => [
      l.cliente?.nome ?? "",
      l.cliente?.email ?? "",
      formatarTelefone(l.cliente?.telefone),
      l.produto?.nome ?? l.produto_outro ?? "",
      l.canal?.nome ?? "",
      l.aceita_contato,
      l.origem,
      formatarDataHora(l.criado_em),
    ]),
  };
}
