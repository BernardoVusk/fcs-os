"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { CompraLista } from "@/dados/estoque/compras";
import { STATUS_COMPRA } from "@/dominio/estoque/conversao";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";

function totalLinhas(c: CompraLista) {
  return c.itens.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.preco_unitario) - Number(i.desconto_item),
    0,
  );
}

const colunas: ColumnDef<CompraLista, unknown>[] = [
  {
    accessorKey: "data",
    header: "Data",
    cell: ({ row }) => (
      <Link
        href={`/estoque/compras/${row.original.id}`}
        className="font-medium text-acao hover:underline"
      >
        {formatarData(row.original.data)}
      </Link>
    ),
  },
  {
    accessorKey: "numero_documento",
    header: "Documento",
    cell: ({ getValue }) =>
      (getValue() as string | null) || <span className="text-texto-3">Sem número</span>,
  },
  {
    id: "fornecedor",
    accessorFn: (c) => c.fornecedor?.nome ?? "",
    header: "Fornecedor",
    cell: ({ getValue }) =>
      (getValue() as string) || <span className="text-texto-3">Sem fornecedor</span>,
  },
  {
    id: "itens",
    accessorFn: (c) => c.itens.length,
    header: "Itens",
    cell: ({ getValue }) => <span className="numeros">{String(getValue())}</span>,
  },
  {
    id: "total",
    accessorFn: (c) => totalLinhas(c),
    header: "Linhas",
    cell: ({ getValue }) => <span className="numeros">{formatarMoeda(getValue() as number)}</span>,
  },
  {
    accessorKey: "frete",
    header: "Frete",
    cell: ({ getValue }) => <span className="numeros">{formatarMoeda(getValue() as number)}</span>,
  },
  {
    accessorKey: "status",
    header: "Situação",
    cell: ({ getValue }) => {
      const s = STATUS_COMPRA[getValue() as string] ?? {
        rotulo: String(getValue()),
        variante: "outline" as const,
      };
      return <Badge variant={s.variante}>{s.rotulo}</Badge>;
    },
  },
];

export function TabelaCompras({
  compras,
  acaoVazio,
}: {
  compras: CompraLista[];
  acaoVazio?: React.ReactNode;
}) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={compras}
      placeholderFiltro="Filtrar compras"
      vazio={{
        titulo: "Nenhuma compra registrada",
        descricao:
          "Registre a compra de filamento com frete e desconto; ao confirmar, cada rolo vira um lote.",
        acao: acaoVazio,
      }}
      idLinha={(c) => c.id}
    />
  );
}
