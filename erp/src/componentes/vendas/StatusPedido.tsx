"use client";

import { useActionState, useContext, useState } from "react";
import { salvarStatusPedido } from "@/acoes/vendas/pedidos";
import type { StatusPedidoRow } from "@/dados/vendas/pedidos";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

function FormStatus({ status }: { status: StatusPedidoRow }) {
  const [estado, acao, pendente] = useActionState(salvarStatusPedido, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const estrutural = status.gera_recebivel || status.baixa_estoque || status.padrao;
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={status.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
          <Input id="nome" name="nome" defaultValue={status.nome} required maxLength={60} />
        </Campo>
        <Campo
          rotulo="Ordem"
          nome="ordem"
          erro={estado.erros.ordem}
          dica="Importação só avança nessa ordem."
        >
          <Input
            id="ordem"
            name="ordem"
            inputMode="numeric"
            defaultValue={String(status.ordem)}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor}>
          <Input
            id="cor"
            name="cor"
            defaultValue={status.cor ?? ""}
            maxLength={7}
            placeholder="#00D8FF"
            className="font-mono"
          />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          value="sim"
          defaultChecked={status.ativo}
          disabled={estrutural}
          className="size-4 accent-acao"
        />
        Status ativo{estrutural && " (estrutural: não pode ser desligado)"}
      </label>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaStatusPedido({
  lista,
  editar,
}: {
  lista: StatusPedidoRow[];
  editar: boolean;
}) {
  const [aberto, setAberto] = useState<StatusPedidoRow | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((s) => (
              <TableRow key={s.id} className="h-11">
                <TableCell className="numeros pl-5">{s.ordem}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 font-medium">
                    {s.cor && (
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ background: s.cor }}
                      />
                    )}
                    {s.nome}
                    <span className="font-mono text-xs text-texto-3">{s.codigo}</span>
                  </span>
                </TableCell>
                <TableCell className="space-x-1">
                  {s.padrao && <Badge variant="outline">inicial</Badge>}
                  {s.gera_recebivel && <Badge>gera recebível</Badge>}
                  {s.baixa_estoque && <Badge>baixa peças prontas</Badge>}
                  {s.fechado && <Badge variant="secondary">fechado</Badge>}
                </TableCell>
                <TableCell>
                  {s.ativo ? "Ativo" : <span className="text-texto-3">Inativo</span>}
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAberto(s)}>
                      Editar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar status</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberto(null)}>
            {aberto && <FormStatus key={aberto.id} status={aberto} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
