"use client";

import { useActionState, useContext, useState } from "react";
import { anonimizarCliente, salvarCliente } from "@/acoes/vendas/pedidos";
import type { Cliente } from "@/dados/vendas/pedidos";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
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
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";
import { cn } from "@/lib/utils";

type Endereco = {
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  logradouro?: string | null;
};

export function FormCliente({
  cliente,
  canais,
}: {
  cliente?: Cliente;
  canais: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarCliente, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const e = (cliente?.endereco ?? {}) as Endereco;
  return (
    <form action={acao} className="space-y-4" noValidate>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={cliente?.nome} required maxLength={160} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="E-mail" nome="email" erro={estado.erros.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={cliente?.email ?? ""}
            maxLength={160}
          />
        </Campo>
        <Campo rotulo="Telefone" nome="telefone" erro={estado.erros.telefone}>
          <Input
            id="telefone"
            name="telefone"
            defaultValue={cliente?.telefone ?? ""}
            maxLength={40}
          />
        </Campo>
        <Campo
          rotulo="Documento"
          nome="documento"
          erro={estado.erros.documento}
          dica="Só se precisar para nota."
        >
          <Input
            id="documento"
            name="documento"
            defaultValue={cliente?.documento ?? ""}
            maxLength={20}
          />
        </Campo>
        <Campo rotulo="Canal de origem" nome="canal_origem_id" erro={estado.erros.canal_origem_id}>
          <SelectNativo
            id="canal_origem_id"
            name="canal_origem_id"
            defaultValue={cliente?.canal_origem_id ?? ""}
          >
            <option value="">Não informado</option>
            {canais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Cidade" nome="cidade" erro={estado.erros.cidade}>
          <Input id="cidade" name="cidade" defaultValue={e.cidade ?? ""} maxLength={80} />
        </Campo>
        <Campo rotulo="UF" nome="uf" erro={estado.erros.uf}>
          <Input
            id="uf"
            name="uf"
            defaultValue={e.uf ?? ""}
            maxLength={2}
            className="max-w-20 uppercase"
          />
        </Campo>
        <Campo rotulo="CEP" nome="cep" erro={estado.erros.cep}>
          <Input id="cep" name="cep" defaultValue={e.cep ?? ""} maxLength={10} />
        </Campo>
        <Campo rotulo="Endereço" nome="logradouro" erro={estado.erros.logradouro}>
          <Input
            id="logradouro"
            name="logradouro"
            defaultValue={e.logradouro ?? ""}
            maxLength={200}
          />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={cliente?.observacoes ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaClientes({
  clientes,
  canais,
  editar,
  destaque,
}: {
  clientes: Cliente[];
  canais: { id: string; nome: string }[];
  editar: boolean;
  destaque?: string;
}) {
  const [aberto, setAberto] = useState<Cliente | null>(null);
  if (clientes.length === 0)
    return (
      <EstadoVazio
        titulo="Nenhum cliente"
        descricao="Cadastro mínimo: nome e contato. Pedidos podem ficar sem cliente."
      />
    );
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Origem</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => {
              const e = (c.endereco ?? {}) as Endereco;
              return (
                <TableRow
                  key={c.id}
                  className={cn("h-11", destaque === c.id && "bg-acao-suave hover:bg-acao-suave")}
                >
                  <TableCell className="pl-5 font-medium">
                    {c.nome}
                    {c.anonimizado && (
                      <Badge variant="secondary" className="ml-2">
                        Anonimizado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-texto-2">
                    {[c.email, c.telefone].filter(Boolean).join(" · ") || "Sem contato"}
                  </TableCell>
                  <TableCell className="text-texto-2">
                    {[e.cidade, e.uf].filter(Boolean).join("/") || "Sem dados"}
                  </TableCell>
                  <TableCell className="text-texto-2">
                    {canais.find((x) => x.id === c.canal_origem_id)?.nome ?? "Não informado"}
                  </TableCell>
                  {editar && (
                    <TableCell className="text-right whitespace-nowrap">
                      {!c.anonimizado && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setAberto(c)}>
                            Editar
                          </Button>
                          <BotaoAcao
                            acao={() => anonimizarCliente(c.id)}
                            confirmar={{
                              titulo: "Remover os dados pessoais?",
                              descricao:
                                "Nome, contato, documento e endereço são apagados; os pedidos continuam ligados ao registro.",
                              rotulo: "Anonimizar",
                            }}
                          >
                            Anonimizar
                          </BotaoAcao>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberto(null)}>
            {aberto && <FormCliente key={aberto.id} cliente={aberto} canais={canais} />}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
