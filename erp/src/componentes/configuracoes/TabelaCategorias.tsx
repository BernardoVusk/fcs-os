"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Categoria } from "@/dados/configuracoes/categorias";
import { alternarAtivoCategoria } from "@/acoes/configuracoes/categorias";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { FormCategoria } from "./FormCategoria";

export function TabelaCategorias({
  categorias,
  escopo,
  editar,
  destaque,
}: {
  categorias: Categoria[];
  escopo: string;
  editar: boolean;
  destaque?: string;
}) {
  const [editando, setEditando] = useState<Categoria | null>(null);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const colunas: ColumnDef<Categoria, unknown>[] = [
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "pai_id",
      header: "Pai",
      cell: ({ getValue }) => nomes.get(getValue() as string) ?? "",
    },
    {
      accessorKey: "cor",
      header: "Cor",
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="size-3 rounded-sm border border-borda"
              style={{ background: String(getValue()) }}
            />
            <span className="font-mono text-xs">{String(getValue())}</span>
          </span>
        ) : (
          ""
        ),
    },
    {
      accessorKey: "ordem",
      header: "Ordem",
      cell: ({ getValue }) => <span className="numeros">{String(getValue())}</span>,
    },
    {
      accessorKey: "ativo",
      header: "Situação",
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "default" : "secondary"}>
          {getValue() ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
  ];
  if (editar) {
    colunas.push({
      id: "acoes",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditando(row.original)}>
            Editar
          </Button>
          <BotaoAcao acao={() => alternarAtivoCategoria(row.original.id)}>
            {row.original.ativo ? "Inativar" : "Reativar"}
          </BotaoAcao>
        </span>
      ),
    });
  }
  return (
    <>
      <TabelaDados
        colunas={colunas}
        dados={categorias}
        placeholderFiltro="Filtrar categorias"
        vazio={{
          titulo: "Nenhuma categoria neste escopo",
          descricao: "Crie a primeira com o botão Nova categoria.",
        }}
        idLinha={(c) => c.id}
        destaque={destaque}
      />
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          {editando && (
            <ContextoDialogo.Provider value={() => setEditando(null)}>
              <FormCategoria
                escopo={escopo}
                categoria={editando}
                opcoesPai={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
              />
            </ContextoDialogo.Provider>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
