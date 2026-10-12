"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { EstadoVazio } from "./EstadoVazio";
import { cn } from "@/lib/utils";

export function TabelaDados<T>({
  colunas,
  dados,
  vazio,
  placeholderFiltro = "Filtrar",
  tamanhoPagina = 25,
  idLinha,
  destaque,
}: {
  colunas: ColumnDef<T, unknown>[];
  dados: T[];
  vazio: { titulo: string; descricao?: string; acao?: React.ReactNode };
  placeholderFiltro?: string;
  tamanhoPagina?: number;
  idLinha?: (linha: T) => string;
  destaque?: string;
}) {
  const [ordenacao, setOrdenacao] = useState<SortingState>([]);
  const [filtro, setFiltro] = useState("");
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: dados,
    columns: colunas,
    state: { sorting: ordenacao, globalFilter: filtro },
    onSortingChange: setOrdenacao,
    onGlobalFilterChange: setFiltro,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: tamanhoPagina } },
  });

  if (dados.length === 0) return <EstadoVazio {...vazio} />;

  const linhas = tabela.getRowModel().rows;
  const total = tabela.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = tabela.getState().pagination;
  const de = total === 0 ? 0 : pageIndex * pageSize + 1;
  const ate = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-3"
          aria-hidden="true"
        />
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder={placeholderFiltro}
          aria-label={placeholderFiltro}
          className="rounded-full bg-superficie-2 pl-9"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupo) => (
              <TableRow
                key={grupo.id}
                className="border-borda bg-superficie-2/60 hover:bg-superficie-2/60"
              >
                {grupo.headers.map((cabecalho) => {
                  const ordenavel = cabecalho.column.getCanSort();
                  const direcao = cabecalho.column.getIsSorted();
                  return (
                    <TableHead
                      key={cabecalho.id}
                      className="h-11 px-4 text-[13px] font-medium whitespace-nowrap text-texto-2 first:pl-5"
                      aria-sort={
                        !ordenavel
                          ? undefined
                          : direcao === "asc"
                            ? "ascending"
                            : direcao === "desc"
                              ? "descending"
                              : "none"
                      }
                    >
                      {cabecalho.isPlaceholder ? null : ordenavel ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full transition-colors hover:text-texto"
                          onClick={cabecalho.column.getToggleSortingHandler()}
                        >
                          {flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())}
                          {direcao === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : direcao === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 text-texto-3" />
                          )}
                        </button>
                      ) : (
                        flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colunas.length} className="py-10 text-center text-texto-2">
                  Nenhum resultado para o filtro.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((linha) => (
                <TableRow
                  key={linha.id}
                  className={cn(
                    "h-11 border-borda transition-colors duration-150 hover:bg-superficie-2/50",
                    idLinha &&
                      destaque &&
                      idLinha(linha.original) === destaque &&
                      "bg-acao-suave hover:bg-acao-suave",
                  )}
                >
                  {linha.getVisibleCells().map((celula) => (
                    <TableCell key={celula.id} className="px-4 py-2 first:pl-5">
                      {flexRender(celula.column.columnDef.cell, celula.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-texto-2">
          <span className="numeros">
            {de} a {ate} de {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabela.previousPage()}
              disabled={!tabela.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabela.nextPage()}
              disabled={!tabela.getCanNextPage()}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
