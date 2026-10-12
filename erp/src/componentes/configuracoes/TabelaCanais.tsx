"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { CanalVigente } from "@/dados/configuracoes/canais";
import { TIPO_CANAL_ROTULO, type TipoCanal } from "@/dominio/configuracao/canais";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";

const colunas: ColumnDef<CanalVigente, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Canal",
    cell: ({ row }) => (
      <Link href={`/configuracoes/canais/${row.original.id}`} className="font-medium text-acao hover:underline">
        {row.original.nome}
      </Link>
    ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ getValue }) => TIPO_CANAL_ROTULO[getValue() as TipoCanal] ?? String(getValue()),
  },
  {
    accessorKey: "comissao_pct",
    header: "Comissão",
    cell: ({ getValue }) => <span className="numeros">{formatarPercentual(getValue() as number | null)}</span>,
  },
  {
    accessorKey: "taxa_fixa_item",
    header: "Taxa fixa",
    cell: ({ getValue }) => (
      <span className="numeros">{getValue() == null ? "Não configurado" : formatarMoeda(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: "vigente_desde",
    header: "Vigente desde",
    cell: ({ getValue }) => formatarData(getValue() as string | null) || "Sem vigência",
  },
  {
    accessorKey: "ativo",
    header: "Situação",
    cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Ativo" : "Inativo"}</Badge>,
  },
];

export function TabelaCanais({ canais }: { canais: CanalVigente[] }) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={canais}
      placeholderFiltro="Filtrar canais"
      vazio={{ titulo: "Nenhum canal cadastrado", descricao: "Cadastre os marketplaces e canais onde você vende." }}
      idLinha={(c) => c.id ?? ""}
    />
  );
}
