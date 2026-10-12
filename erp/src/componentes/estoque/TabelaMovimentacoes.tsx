"use client";

import Link from "next/link";
import type { MovimentacaoLista } from "@/dados/estoque/movimentacoes";
import { estornarMovimentacao } from "@/acoes/estoque/movimentacoes";
import { TIPO_MOVIMENTACAO_ROTULO, type TipoMovimentacao } from "@/dominio/estoque/conversao";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarDataHora } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { cn } from "@/lib/utils";

const ORIGEM: Record<string, string> = {
  compra: "Compra",
  ordem: "Ordem de produção",
  pedido: "Pedido",
  manual: "Manual",
  estorno: "Estorno",
};

export function TabelaMovimentacoes({
  itens,
  editar,
  mostrarInsumo = true,
}: {
  itens: MovimentacaoLista[];
  editar: boolean;
  mostrarInsumo?: boolean;
}) {
  if (itens.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma movimentação"
        descricao="Entradas chegam ao confirmar uma compra; consumo, perda e ajuste são registrados na ficha do insumo."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Quando</TableHead>
            <TableHead>Tipo</TableHead>
            {mostrarInsumo && <TableHead>Insumo</TableHead>}
            <TableHead>Lote</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Origem</TableHead>
            {editar && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((m) => {
            const entrada = Number(m.quantidade) > 0;
            const estornavel = editar && !m.estornada && m.tipo !== "estorno";
            return (
              <TableRow
                key={m.id}
                className={cn("h-11", m.estornada && "text-texto-3 line-through decoration-borda")}
              >
                <TableCell className="numeros pl-5 whitespace-nowrap">
                  {formatarDataHora(m.em)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      m.tipo === "entrada"
                        ? "default"
                        : m.tipo === "perda" || m.tipo === "estorno"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {TIPO_MOVIMENTACAO_ROTULO[m.tipo as TipoMovimentacao] ?? m.tipo}
                  </Badge>
                </TableCell>
                {mostrarInsumo && (
                  <TableCell>
                    <Link
                      href={`/estoque/insumos/${m.insumo_id}`}
                      className="font-medium text-acao hover:underline"
                    >
                      {m.insumo?.nome ?? "Insumo"}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">
                  {m.lote?.codigo ?? <span className="text-texto-3">sem lote</span>}
                </TableCell>
                <TableCell
                  className={cn("numeros text-right", entrada ? "text-sucesso" : "text-texto")}
                >
                  {entrada ? "+" : ""}
                  {formatarQuantidade(m.quantidade, m.insumo?.unidade_base)}
                </TableCell>
                <TableCell className="numeros text-right">{formatarMoeda(m.valor, 4)}</TableCell>
                <TableCell
                  className="max-w-64 truncate text-texto-2"
                  title={m.justificativa ?? undefined}
                >
                  {m.motivo || <span className="text-texto-3">Sem motivo</span>}
                  {m.justificativa && (
                    <span className="block truncate text-xs text-alerta">
                      Justificativa: {m.justificativa}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-texto-2">
                  {m.origem_tipo === "compra" && m.origem_id ? (
                    <Link
                      href={`/estoque/compras/${m.origem_id}`}
                      className="text-acao hover:underline"
                    >
                      Compra
                    </Link>
                  ) : (
                    (ORIGEM[m.origem_tipo ?? ""] ?? "Sem origem")
                  )}
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    {estornavel && (
                      <BotaoAcao
                        acao={() => estornarMovimentacao(m.id)}
                        confirmar={{
                          titulo: "Estornar esta movimentação?",
                          descricao:
                            "Cria a movimentação oposta no mesmo lote. Nada é apagado. Estorno de entrada só funciona se o lote ainda tiver o saldo.",
                          rotulo: "Estornar",
                        }}
                      >
                        Estornar
                      </BotaoAcao>
                    )}
                    {m.estornada && <span className="text-xs">Estornada</span>}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
