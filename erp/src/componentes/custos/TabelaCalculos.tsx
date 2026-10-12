"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { CalculoLista } from "@/dados/custos/calculos";
import type { EntradasCalculo } from "@/dominio/custos/motor";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarNumero } from "@/lib/formatos/numero";
import { formatarDataHora } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";

export type CalculoLinha = CalculoLista & { custo_g_atual: number | null };

function custoGDoSnapshot(c: CalculoLinha): number | null {
  const e = c.entradas as unknown as EntradasCalculo | null;
  return e?.peca?.custo_g ?? null;
}

const colunas: ColumnDef<CalculoLinha, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Cálculo",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          href={`/catalogo/precificacao?base=${row.original.id}`}
          className="font-medium text-acao hover:underline"
        >
          {row.original.nome}
        </Link>
        <span className="text-xs text-texto-3">
          {[
            row.original.insumo?.nome ?? "custo manual",
            row.original.impressora?.nome,
            row.original.canal?.nome ?? "sem canal",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "criado_em",
    header: "Quando",
    cell: ({ getValue }) => (
      <span className="numeros whitespace-nowrap">{formatarDataHora(getValue() as string)}</span>
    ),
  },
  {
    accessorKey: "custo_unitario_total",
    header: "Custo por peça",
    cell: ({ getValue }) => (
      <span className="numeros">{formatarMoeda(getValue() as number, 4)}</span>
    ),
  },
  {
    accessorKey: "preco_sugerido",
    header: "Preço sugerido",
    cell: ({ row }) => (
      <div className="numeros flex flex-col">
        <span>
          {row.original.preco_sugerido == null
            ? "Sem preço"
            : formatarMoeda(row.original.preco_sugerido)}
        </span>
        <span className="text-xs text-texto-3">
          {row.original.metodo_margem === "margem" && row.original.margem_alvo != null
            ? `margem ${formatarPercentual(row.original.margem_alvo, 1)}`
            : row.original.metodo_margem === "markup" && row.original.markup_alvo != null
              ? `markup ${formatarPercentual(row.original.markup_alvo, 1)}`
              : row.original.preco_sugerido == null
                ? ""
                : "equilíbrio"}
        </span>
      </div>
    ),
  },
  {
    id: "filamento",
    header: "Filamento: no cálculo e hoje",
    cell: ({ row }) => {
      const antes = custoGDoSnapshot(row.original);
      const hoje = row.original.custo_g_atual;
      if (antes == null) return <span className="text-texto-3">Sem dados</span>;
      const delta = hoje != null && antes > 0 ? (hoje - antes) / antes : null;
      return (
        <div className="numeros flex flex-col">
          <span>
            R$ {formatarNumero(antes * 1000, 2)}/kg{" "}
            {hoje != null && (
              <span className="text-texto-2">→ R$ {formatarNumero(hoje * 1000, 2)}/kg</span>
            )}
          </span>
          {delta != null && Math.abs(delta) >= 0.005 && (
            <Badge
              variant="outline"
              className={
                delta > 0
                  ? "mt-1 w-fit border-alerta/40 text-alerta"
                  : "mt-1 w-fit border-sucesso/40 text-sucesso"
              }
            >
              {delta > 0 ? "subiu" : "caiu"} {formatarPercentual(Math.abs(delta), 1)}: revisar
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "versao_motor",
    header: "Motor",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-texto-3">
        {row.original.versao_motor} · parâmetros v{row.original.parametros_versao ?? "?"}
      </span>
    ),
  },
];

export function TabelaCalculos({ itens, destaque }: { itens: CalculoLinha[]; destaque?: string }) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={itens}
      placeholderFiltro="Filtrar cálculos"
      vazio={{
        titulo: "Nenhum cálculo salvo",
        descricao:
          "Abra a calculadora, monte a peça e salve. Cada cálculo guarda entradas e resultado para sempre.",
      }}
      idLinha={(c) => c.id}
      destaque={destaque}
    />
  );
}
