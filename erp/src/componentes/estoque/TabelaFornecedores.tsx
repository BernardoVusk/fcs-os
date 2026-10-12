"use client";

import { useState } from "react";
import type { Fornecedor } from "@/dados/estoque/fornecedores";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { FormFornecedor } from "./FormFornecedor";
import { cn } from "@/lib/utils";

export function TabelaFornecedores({
  fornecedores,
  editar,
  destaque,
}: {
  fornecedores: Fornecedor[];
  editar: boolean;
  destaque?: string;
}) {
  const [aberto, setAberto] = useState<Fornecedor | null>(null);
  if (fornecedores.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum fornecedor"
        descricao="Cadastre de quem você compra filamento e embalagens. A compra pode ficar sem fornecedor."
      />
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Prazo médio</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fornecedores.map((f) => (
              <TableRow
                key={f.id}
                className={cn("h-11", destaque === f.id && "bg-acao-suave hover:bg-acao-suave")}
              >
                <TableCell className="pl-5 font-medium">{f.nome}</TableCell>
                <TableCell className="text-texto-2">{f.contato || "Sem contato"}</TableCell>
                <TableCell className="text-texto-2">
                  {f.site ? (
                    <a
                      href={f.site.startsWith("http") ? f.site : `https://${f.site}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-acao hover:underline"
                    >
                      {f.site}
                    </a>
                  ) : (
                    "Sem site"
                  )}
                </TableCell>
                <TableCell className="numeros">
                  {f.prazo_medio_dias == null ? "Sem dados" : `${f.prazo_medio_dias} dias`}
                </TableCell>
                <TableCell>
                  <Badge variant={f.ativo ? "default" : "secondary"}>
                    {f.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAberto(f)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberto !== null} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar fornecedor</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberto(null)}>
            {aberto && <FormFornecedor key={aberto.id} fornecedor={aberto} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
