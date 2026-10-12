"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Unidade } from "@/dados/configuracoes/unidades";
import { formatarNumero } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { FormUnidade } from "./FormUnidade";

const fator = (v: number) => formatarNumero(v, 6).replace(/,?0+$/, "");

export function TabelaUnidades({
  unidades,
  editar,
  destaque,
}: {
  unidades: Unidade[];
  editar: boolean;
  destaque?: string;
}) {
  const [editando, setEditando] = useState<Unidade | null>(null);
  const colunas: ColumnDef<Unidade, unknown>[] = [
    {
      accessorKey: "codigo",
      header: "Código",
      cell: ({ getValue }) => <span className="font-mono">{String(getValue())}</span>,
    },
    { accessorKey: "nome", header: "Nome" },
    {
      accessorKey: "base",
      header: "Base",
      cell: ({ getValue }) =>
        getValue() ? <span className="font-mono">{String(getValue())}</span> : "É base",
    },
    {
      accessorKey: "fator_para_base",
      header: "Fator",
      cell: ({ getValue }) => <span className="numeros">{fator(getValue() as number)}</span>,
    },
  ];
  if (editar) {
    colunas.push({
      id: "acoes",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEditando(row.original)}>
            Editar
          </Button>
        </span>
      ),
    });
  }
  return (
    <>
      <TabelaDados
        colunas={colunas}
        dados={unidades}
        placeholderFiltro="Filtrar unidades"
        vazio={{ titulo: "Nenhuma unidade" }}
        idLinha={(u) => u.codigo}
        destaque={destaque}
      />
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar unidade</DialogTitle>
          </DialogHeader>
          {editando && (
            <ContextoDialogo.Provider value={() => setEditando(null)}>
              <FormUnidade unidade={editando} bases={unidades.map((u) => u.codigo)} />
            </ContextoDialogo.Provider>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
