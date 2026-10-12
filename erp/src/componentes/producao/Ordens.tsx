"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { OrdemLista } from "@/dados/producao/ordens";
import { mudarEstadoOrdem, reabrirOrdem } from "@/acoes/producao/ordens";
import {
  ESTADO_ORDEM_ROTULO,
  TRANSICOES,
  type EstadoOrdem,
} from "@/dominio/producao/custo-realizado";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";

export const VARIANTE_ESTADO: Record<EstadoOrdem, "default" | "secondary" | "outline"> = {
  fila: "outline",
  imprimindo: "default",
  acabamento: "default",
  concluida: "secondary",
  cancelada: "secondary",
};

export function BadgeEstado({ status }: { status: string }) {
  const s = status as EstadoOrdem;
  return (
    <Badge variant={VARIANTE_ESTADO[s] ?? "outline"}>{ESTADO_ORDEM_ROTULO[s] ?? status}</Badge>
  );
}

const colunas: ColumnDef<OrdemLista, unknown>[] = [
  {
    accessorKey: "codigo",
    header: "Ordem",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Link
          href={`/producao/ordens/${row.original.id}`}
          className="font-mono font-medium text-acao hover:underline"
        >
          {row.original.codigo}
        </Link>
        <span className="text-xs text-texto-3">{formatarData(row.original.criado_em)}</span>
      </div>
    ),
  },
  {
    id: "produto",
    accessorFn: (o) => `${o.produto?.nome ?? ""} ${o.variacao?.nome ?? ""}`,
    header: "Produto",
    cell: ({ row }) => (
      <span>
        {row.original.produto?.nome ?? "Produto"}
        {row.original.variacao && (
          <span className="text-texto-2"> · {row.original.variacao.nome}</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "quantidade_planejada",
    header: "Peças",
    cell: ({ row }) => (
      <span className="numeros">
        {row.original.status === "concluida"
          ? `${row.original.quantidade_aprovada} boas / ${row.original.quantidade_perdida} perdidas`
          : row.original.quantidade_planejada}
      </span>
    ),
  },
  {
    id: "impressora",
    accessorFn: (o) => o.impressora?.nome ?? "",
    header: "Impressora",
    cell: ({ getValue }) =>
      (getValue() as string) || <span className="text-texto-3">Sem impressora</span>,
  },
  {
    accessorKey: "prazo",
    header: "Prazo",
    cell: ({ row }) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const atrasada =
        row.original.prazo &&
        row.original.prazo < hoje &&
        !["concluida", "cancelada"].includes(row.original.status);
      return (
        <span className={atrasada ? "numeros text-erro" : "numeros"}>
          {formatarData(row.original.prazo) || "Sem prazo"}
          {atrasada && " (atrasada)"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Situação",
    cell: ({ getValue }) => <BadgeEstado status={getValue() as string} />,
  },
  {
    id: "custo",
    header: "Custo estimado / real",
    cell: ({ row }) => (
      <span className="numeros text-sm">
        {row.original.custo_estimado == null
          ? "Sem estimativa"
          : formatarMoeda(row.original.custo_estimado)}
        {row.original.custo_realizado != null && (
          <span className="text-texto-2"> / {formatarMoeda(row.original.custo_realizado)}</span>
        )}
      </span>
    ),
  },
];

export function ListaOrdens({ ordens }: { ordens: OrdemLista[] }) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={ordens}
      placeholderFiltro="Filtrar ordens"
      vazio={{
        titulo: "Nenhuma ordem de produção",
        descricao: "Crie a primeira ordem a partir de um produto com ficha preenchida.",
      }}
      idLinha={(o) => o.id}
      tamanhoPagina={50}
    />
  );
}

/** Botões de transição de estado; concluir e reabrir têm formulário próprio. */
export function AcoesOrdem({ ordem }: { ordem: { id: string; status: string } }) {
  const de = ordem.status as EstadoOrdem;
  const destinos =
    de === "concluida" ? [] : (TRANSICOES[de] ?? []).filter((p) => p !== "concluida");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {destinos.map((para) => (
        <BotaoAcao
          key={para}
          variant={para === "cancelada" ? "outline" : "secondary"}
          acao={() => mudarEstadoOrdem(ordem.id, para)}
          confirmar={
            para === "cancelada"
              ? {
                  titulo: "Cancelar esta ordem?",
                  descricao: "Nada sai do estoque. Dá para voltar para a fila depois.",
                  rotulo: "Cancelar ordem",
                }
              : undefined
          }
        >
          {para === "fila"
            ? "Voltar para a fila"
            : para === "imprimindo"
              ? "Começar a imprimir"
              : para === "acabamento"
                ? de === "concluida"
                  ? "Reabrir"
                  : "Passar ao acabamento"
                : "Cancelar"}
        </BotaoAcao>
      ))}
      {de === "concluida" && (
        <BotaoAcao
          variant="outline"
          acao={() => reabrirOrdem(ordem.id)}
          confirmar={{
            titulo: "Reabrir a ordem concluída?",
            descricao:
              "Estorna o consumo de filamento e a entrada das peças prontas. Nada é apagado.",
            rotulo: "Reabrir",
          }}
        >
          Reabrir
        </BotaoAcao>
      )}
    </div>
  );
}
