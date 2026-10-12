"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { PedidoLista, StatusPedidoRow } from "@/dados/vendas/pedidos";
import { criarOrdemDoItem, devolverPedido, mudarStatusPedido } from "@/acoes/vendas/pedidos";
import type { ResumoPedido } from "@/dominio/vendas/resumo-pedido";
import { STATUS_PAGAMENTO_ROTULO } from "@/dominio/vendas/status";
import { erroPt } from "@/lib/erros-pt";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export function BadgeStatusPedido({
  status,
}: {
  status: { nome: string; cor: string | null; fechado: boolean } | null;
}) {
  if (!status) return <Badge variant="outline">Sem status</Badge>;
  return (
    <Badge
      variant={status.fechado ? "secondary" : "default"}
      style={status.cor ? { backgroundColor: status.cor, color: "#0A0A0A" } : undefined}
    >
      {status.nome}
    </Badge>
  );
}

const colunas: ColumnDef<PedidoLista, unknown>[] = [
  {
    accessorKey: "codigo",
    header: "Pedido",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          href={`/vendas/pedidos/${row.original.id}`}
          className="font-mono font-medium text-acao hover:underline"
        >
          {row.original.codigo}
        </Link>
        <span className="text-xs text-texto-3">
          {row.original.canal?.nome ?? "Canal"}
          {row.original.codigo_externo && ` · ${row.original.codigo_externo}`}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "data_pedido",
    header: "Data",
    cell: ({ getValue }) => <span className="numeros">{formatarData(getValue() as string)}</span>,
  },
  {
    id: "cliente",
    accessorFn: (p) => p.cliente?.nome ?? "",
    header: "Cliente",
    cell: ({ getValue }) =>
      (getValue() as string) || <span className="text-texto-3">Sem cliente</span>,
  },
  {
    id: "itens",
    accessorFn: (p) => p.itens.reduce((a, i) => a + i.quantidade, 0),
    header: "Peças",
    cell: ({ getValue }) => <span className="numeros">{String(getValue())}</span>,
  },
  {
    id: "status",
    accessorFn: (p) => p.status?.nome ?? "",
    header: "Situação",
    cell: ({ row }) => <BadgeStatusPedido status={row.original.status} />,
  },
  {
    id: "base",
    accessorFn: (p) => (p.resumo as ResumoPedido | null)?.base_vendas ?? 0,
    header: "Base de vendas",
    cell: ({ row }) => (
      <span className="numeros">
        {formatarMoeda((row.original.resumo as ResumoPedido | null)?.base_vendas)}
      </span>
    ),
  },
  {
    id: "receber",
    header: "A receber",
    cell: ({ row }) => {
      const r = row.original.resumo as ResumoPedido | null;
      return (
        <div className="numeros flex flex-col">
          <span>{formatarMoeda(r?.valor_a_receber)}</span>
          <span className="text-xs text-texto-3">
            {STATUS_PAGAMENTO_ROTULO[row.original.status_pagamento] ??
              row.original.status_pagamento}
          </span>
        </div>
      );
    },
  },
  {
    id: "resultado",
    header: "Resultado estimado",
    cell: ({ row }) => {
      const r = row.original.resumo as ResumoPedido | null;
      if (!r || r.resultado_estimado == null)
        return <span className="text-texto-3">Sem custo</span>;
      return (
        <span className={`numeros ${r.resultado_estimado < 0 ? "text-erro" : ""}`}>
          {formatarMoeda(r.resultado_estimado)}{" "}
          {r.margem_estimada != null && (
            <span className="text-xs text-texto-3">
              ({formatarPercentual(r.margem_estimada, 1)})
            </span>
          )}
        </span>
      );
    },
  },
];

export function TabelaPedidos({
  pedidos,
  acaoVazio,
}: {
  pedidos: PedidoLista[];
  acaoVazio?: React.ReactNode;
}) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={pedidos}
      placeholderFiltro="Filtrar pedidos"
      vazio={{
        titulo: "Nenhum pedido",
        descricao: "Registre um pedido manual ou importe o CSV do canal.",
        acao: acaoVazio,
      }}
      idLinha={(p) => p.id}
      tamanhoPagina={50}
    />
  );
}

export function MudarStatus({
  pedido,
  lista,
}: {
  pedido: { id: string; status_codigo: string | null; data_envio: string | null };
  lista: StatusPedidoRow[];
}) {
  const [codigo, setCodigo] = useState("");
  const [nota, setNota] = useState("");
  const [pendente, iniciar] = useTransition();
  const opcoes = lista.filter(
    (s) => s.ativo && s.codigo !== pedido.status_codigo && s.codigo !== "devolvido",
  );
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-56">
        <SelectNativo
          aria-label="Novo status"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        >
          <option value="">Mudar status para...</option>
          {opcoes.map((s) => (
            <option key={s.id} value={s.codigo}>
              {s.nome}
              {s.gera_recebivel ? " (marca pago)" : s.baixa_estoque ? " (baixa peças prontas)" : ""}
            </option>
          ))}
        </SelectNativo>
      </div>
      <Input
        aria-label="Nota"
        placeholder="Nota (opcional)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        maxLength={300}
        className="max-w-xs"
      />
      <Button
        size="sm"
        disabled={!codigo || pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await mudarStatusPedido(pedido.id, codigo, nota || undefined);
            if (r.ok) {
              toast.success(r.mensagem);
              setCodigo("");
              setNota("");
            } else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
          })
        }
      >
        {pendente ? "Mudando" : "Mudar status"}
      </Button>
      {pedido.data_envio && pedido.status_codigo !== "devolvido" && (
        <BotaoAcao
          variant="outline"
          acao={() => devolverPedido(pedido.id)}
          confirmar={{
            titulo: "Registrar devolução?",
            descricao:
              "As peças voltam ao estoque de prontas pelo custo que saíram e o pedido fica como devolvido. Reembolso é tratado no financeiro.",
            rotulo: "Registrar devolução",
          }}
        >
          Devolução
        </BotaoAcao>
      )}
    </div>
  );
}

export function BotaoOrdemDoItem({ itemId }: { itemId: string }) {
  return (
    <BotaoAcao variant="secondary" acao={() => criarOrdemDoItem(itemId)}>
      Criar ordem de produção
    </BotaoAcao>
  );
}
