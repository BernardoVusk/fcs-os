"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { EstoqueAtual } from "@/dados/estoque/insumos";
import { TIPO_INSUMO_ROTULO, type TipoInsumo } from "@/dominio/estoque/conversao";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/formatos/moeda";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";

const colunas: ColumnDef<EstoqueAtual, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Insumo",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          href={`/estoque/insumos/${row.original.insumo_id}`}
          className="font-medium text-acao hover:underline"
        >
          {row.original.nome}
        </Link>
        <span className="text-xs text-texto-3">
          {TIPO_INSUMO_ROTULO[row.original.tipo as TipoInsumo] ?? row.original.tipo}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "saldo",
    header: "Saldo",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="numeros">
          {formatarQuantidade(row.original.saldo, row.original.unidade_base)}
        </span>
        {row.original.abaixo_minimo && (
          <Badge variant="outline" className="mt-1 w-fit border-alerta/40 text-alerta">
            Abaixo do mínimo
          </Badge>
        )}
        {Number(row.original.saldo_negativo ?? 0) < 0 && (
          <Badge variant="outline" className="mt-1 w-fit border-erro/40 text-erro">
            Lote negativo
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "estoque_minimo",
    header: "Mínimo",
    cell: ({ row }) => (
      <span className="numeros">
        {Number(row.original.estoque_minimo) > 0
          ? formatarQuantidade(row.original.estoque_minimo, row.original.unidade_base)
          : "Sem mínimo"}
      </span>
    ),
  },
  {
    accessorKey: "valor",
    header: "Valor em estoque",
    cell: ({ getValue }) => (
      <span className="numeros">{formatarMoeda(getValue() as number | null)}</span>
    ),
  },
  {
    accessorKey: "custo_medio",
    header: "Custo médio",
    cell: ({ row }) => {
      const c = formatarCustoUnitario(row.original.custo_medio, row.original.unidade_base);
      return (
        <div className="numeros flex flex-col">
          <span>{c.kg ?? c.base}</span>
          {c.kg && <span className="text-xs text-texto-3">{c.base}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "lotes_com_saldo",
    header: "Lotes",
    cell: ({ getValue }) => <span className="numeros">{String(getValue() ?? 0)}</span>,
  },
  {
    accessorKey: "ativo",
    header: "Situação",
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? "default" : "secondary"}>
        {getValue() ? "Ativo" : "Inativo"}
      </Badge>
    ),
  },
];

export function TabelaInsumos({
  itens,
  vazio,
}: {
  itens: EstoqueAtual[];
  vazio: { titulo: string; descricao?: string; acao?: React.ReactNode };
}) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={itens}
      placeholderFiltro="Filtrar insumos"
      vazio={vazio}
      idLinha={(i) => i.insumo_id ?? ""}
    />
  );
}
