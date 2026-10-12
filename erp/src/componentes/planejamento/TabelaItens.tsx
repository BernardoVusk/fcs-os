"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ItemComFluxo } from "@/dados/planejamento/planejamento";
import { dataComDia, horaCurta } from "@/dominio/planejamento/calendario";
import { atrasado } from "@/dominio/planejamento/filtros";
import {
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  lerChecklist,
  lerMetricas,
  PRIORIDADE_ROTULO,
  progressoChecklist,
  TIPO_ITEM_ROTULO,
  type CanalPublicacao,
  type Formato,
  type Prioridade,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { cn } from "@/lib/utils";

function colunaData(hoje: string): ColumnDef<ItemComFluxo, unknown> {
  return {
    accessorFn: (i) => i.prazo ?? i.inicio ?? "",
    id: "data",
    header: "Data",
    cell: ({ row }) => {
      const i = row.original;
      const d = i.prazo ?? i.inicio;
      const tarde = atrasado(i, hoje);
      return (
        <div className={cn("numeros flex flex-col", tarde && "text-erro")}>
          <span>{d ? dataComDia(d) : <span className="text-texto-3">Sem data</span>}</span>
          {i.horario && <span className="text-xs text-texto-3">{horaCurta(i.horario)}</span>}
          {tarde && <span className="text-xs">atrasado</span>}
        </div>
      );
    },
  };
}

function colunaStatus(): ColumnDef<ItemComFluxo, unknown> {
  return {
    accessorKey: "status_nome",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.fechado ? "secondary" : "outline"}>
        {row.original.status_nome}
      </Badge>
    ),
  };
}

function colunaProgresso(): ColumnDef<ItemComFluxo, unknown> {
  return {
    accessorFn: (i) => progressoChecklist(lerChecklist(i.checklist)),
    id: "progresso",
    header: "Checklist",
    cell: ({ row }) => {
      const lista = lerChecklist(row.original.checklist);
      if (lista.length === 0) return <span className="text-xs text-texto-3">sem etapas</span>;
      const p = progressoChecklist(lista);
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-superficie-2">
            <div className="h-full bg-acao" style={{ width: `${p}%` }} />
          </div>
          <span className="numeros text-xs text-texto-3">
            {lista.filter((c) => c.feito).length}/{lista.length}
          </span>
        </div>
      );
    },
  };
}

/** Lista geral: data, item, status, prioridade, checklist e campanha. */
export function TabelaItens({
  itens,
  hoje,
  destaque,
}: {
  itens: ItemComFluxo[];
  hoje: string;
  destaque?: string;
}) {
  const colunas: ColumnDef<ItemComFluxo, unknown>[] = [
    colunaData(hoje),
    {
      accessorKey: "titulo",
      header: "Item",
      cell: ({ row }) => {
        const i = row.original;
        return (
          <div className="flex flex-col">
            <Link
              href={`/planejamento/itens/${i.id}`}
              className={cn("font-medium hover:underline", i.fechado && "text-texto-3")}
            >
              {i.titulo}
            </Link>
            <span className="text-xs text-texto-3">
              {TIPO_ITEM_ROTULO[i.tipo as TipoItem]}
              {i.formato && ` · ${FORMATO_ROTULO[i.formato as Formato]}`}
              {i.canal_publicacao &&
                ` · ${CANAL_PUBLICACAO_ROTULO[i.canal_publicacao as CanalPublicacao]}`}
              {i.produto && ` · ${i.produto.nome}`}
            </span>
          </div>
        );
      },
    },
    colunaStatus(),
    {
      accessorKey: "prioridade",
      header: "Prioridade",
      cell: ({ row }) => (
        <span
          className={cn("text-sm", row.original.prioridade === "alta" && "font-medium text-alerta")}
        >
          {PRIORIDADE_ROTULO[row.original.prioridade as Prioridade] ?? row.original.prioridade}
        </span>
      ),
    },
    colunaProgresso(),
    {
      accessorFn: (i) => i.campanha?.nome ?? "",
      id: "campanha",
      header: "Campanha",
      cell: ({ row }) => (
        <span className="text-sm text-texto-2">{row.original.campanha?.nome ?? ""}</span>
      ),
    },
  ];
  return (
    <TabelaDados
      colunas={colunas}
      dados={itens}
      placeholderFiltro="Filtrar itens"
      vazio={{
        titulo: "Nenhum item",
        descricao: "Crie tarefas, conteúdos e projetos pelo botão Novo item.",
      }}
      idLinha={(i) => i.id}
      destaque={destaque}
      tamanhoPagina={50}
    />
  );
}

/** Tabela de conteúdo: formato, canal, publicação e métricas. */
export function TabelaConteudos({
  itens,
  hoje,
  destaque,
}: {
  itens: ItemComFluxo[];
  hoje: string;
  destaque?: string;
}) {
  const colunas: ColumnDef<ItemComFluxo, unknown>[] = [
    colunaData(hoje),
    {
      accessorKey: "titulo",
      header: "Conteúdo",
      cell: ({ row }) => {
        const i = row.original;
        return (
          <div className="flex flex-col">
            <Link
              href={`/planejamento/itens/${i.id}`}
              className={cn("font-medium hover:underline", i.fechado && "text-texto-3")}
            >
              {i.titulo}
            </Link>
            <span className="text-xs text-texto-3">
              {i.produto?.nome ?? i.campanha?.nome ?? ""}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "formato",
      header: "Formato",
      cell: ({ row }) =>
        row.original.formato ? (
          FORMATO_ROTULO[row.original.formato as Formato]
        ) : (
          <span className="text-texto-3">a definir</span>
        ),
    },
    {
      accessorKey: "canal_publicacao",
      header: "Canal",
      cell: ({ row }) =>
        row.original.canal_publicacao ? (
          CANAL_PUBLICACAO_ROTULO[row.original.canal_publicacao as CanalPublicacao]
        ) : (
          <span className="text-texto-3">a definir</span>
        ),
    },
    colunaStatus(),
    colunaProgresso(),
    {
      accessorKey: "publicado_em",
      header: "Publicado",
      cell: ({ row }) => (
        <span className="numeros text-sm">
          {row.original.publicado_em ? formatarData(row.original.publicado_em) : ""}
        </span>
      ),
    },
    {
      accessorFn: (i) => lerMetricas(i.metricas).alcance ?? 0,
      id: "metricas",
      header: "Métricas",
      cell: ({ row }) => {
        const m = lerMetricas(row.original.metricas);
        const partes = [
          m.alcance != null && `${m.alcance} alcance`,
          m.curtidas != null && `${m.curtidas} curtidas`,
          m.vendas != null && `${m.vendas} vendas`,
        ].filter(Boolean);
        return (
          <span className="numeros text-xs text-texto-2">
            {partes.length ? partes.join(" · ") : ""}
          </span>
        );
      },
    },
  ];
  return (
    <TabelaDados
      colunas={colunas}
      dados={itens}
      placeholderFiltro="Filtrar conteúdos"
      vazio={{
        titulo: "Nenhum conteúdo",
        descricao: "Crie um item do tipo Conteúdo com formato e canal.",
      }}
      idLinha={(i) => i.id}
      destaque={destaque}
      tamanhoPagina={50}
    />
  );
}
