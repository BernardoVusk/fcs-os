"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProdutoLista } from "@/dados/produtos/produtos";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarDataHora } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { STATUS_PRODUTO } from "./FormProduto";

export type ProdutoLinha = ProdutoLista & { canais: Record<string, string> };

const colunas: ColumnDef<ProdutoLinha, unknown>[] = [
  {
    accessorKey: "nome",
    header: "Produto",
    cell: ({ row }) => {
      const s = STATUS_PRODUTO[row.original.status] ?? {
        rotulo: row.original.status,
        variante: "outline" as const,
      };
      return (
        <div className="flex flex-col">
          <Link
            href={`/catalogo/produtos/${row.original.id}`}
            className="font-medium text-acao hover:underline"
          >
            {row.original.nome}
          </Link>
          <span className="flex items-center gap-2 text-xs text-texto-3">
            {row.original.sku && <span className="font-mono">{row.original.sku}</span>}
            <Badge variant={s.variante} className="h-5 px-1.5 text-[11px]">
              {s.rotulo}
            </Badge>
            {row.original.categoria?.nome}
          </span>
        </div>
      );
    },
  },
  {
    id: "insumo",
    accessorFn: (p) => p.insumo?.nome ?? "",
    header: "Filamento",
    cell: ({ getValue }) =>
      (getValue() as string) || <span className="text-texto-3">Não definido</span>,
  },
  {
    accessorKey: "custo_atual",
    header: "Custo por peça",
    cell: ({ row }) => (
      <div className="numeros flex flex-col">
        <span>
          {row.original.custo_atual == null ? (
            <span className="text-texto-3">Sem cálculo</span>
          ) : (
            formatarMoeda(row.original.custo_atual, 4)
          )}
        </span>
        {row.original.custo_atual != null && row.original.custo_atualizado_em == null && (
          <Badge variant="outline" className="mt-1 w-fit border-alerta/40 text-alerta">
            Desatualizado
          </Badge>
        )}
        {row.original.custo_atualizado_em && (
          <span className="text-xs text-texto-3">
            {formatarDataHora(row.original.custo_atualizado_em)}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "precos",
    header: "Preço por canal e margem",
    cell: ({ row }) =>
      row.original.precos.length === 0 ? (
        <span className="text-texto-3">Sem preço</span>
      ) : (
        <ul className="numeros space-y-0.5 text-sm">
          {row.original.precos
            .filter((p) => !p.variacao_id)
            .map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-texto-2">{row.original.canais[p.canal_id!] ?? "Canal"}</span>
                <span>{formatarMoeda(p.preco_venda)}</span>
                {p.margem_estimada_cache != null && (
                  <span
                    className={
                      p.margem_estimada_cache < (row.original.margem_alvo ?? 0)
                        ? "text-alerta"
                        : "text-sucesso"
                    }
                  >
                    {formatarPercentual(p.margem_estimada_cache, 1)}
                  </span>
                )}
              </li>
            ))}
        </ul>
      ),
  },
];

export function TabelaProdutos({
  itens,
  acaoVazio,
}: {
  itens: ProdutoLinha[];
  acaoVazio?: React.ReactNode;
}) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={itens}
      placeholderFiltro="Filtrar produtos"
      vazio={{
        titulo: "Nenhum produto",
        descricao:
          "Crie o primeiro produto ou importe o catálogo dos marketplaces (dados/catalogo).",
        acao: acaoVazio,
      }}
      idLinha={(p) => p.id}
    />
  );
}
