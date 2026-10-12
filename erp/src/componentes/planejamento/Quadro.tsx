"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";
import { mudarStatusItem } from "@/acoes/planejamento/itens";
import type { ItemComFluxo } from "@/dados/planejamento/planejamento";
import { dataCurta, horaCurta } from "@/dominio/planejamento/calendario";
import {
  atrasado,
  moverNoQuadro,
  type Quadro as QuadroDominio,
} from "@/dominio/planejamento/filtros";
import {
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  lerChecklist,
  progressoChecklist,
  type CanalPublicacao,
  type Formato,
} from "@/dominio/planejamento/tipos";
import { erroPt } from "@/lib/erros-pt";
import { cn } from "@/lib/utils";

/** Quadro por status com arrastar nativo; o select "Mover para" cobre teclado e celular. */
export function Quadro({
  quadro: inicial,
  hoje,
  editar,
}: {
  quadro: QuadroDominio<ItemComFluxo>;
  hoje: string;
  editar: boolean;
}) {
  const [quadro, setQuadro] = useState(inicial);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const router = useRouter();

  function mover(id: string, destino: string) {
    const anterior = quadro;
    const novo = moverNoQuadro(quadro, id, destino);
    if (novo === quadro) return;
    setQuadro(novo);
    iniciar(async () => {
      const r = await mudarStatusItem(id, destino);
      if (!r.ok) {
        setQuadro(anterior);
        toast.error(erroPt(r.erro) ?? "Não deu para mover.");
      } else router.refresh();
    });
  }
  function soltar(e: DragEvent, destino: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || arrastando;
    setSobre(null);
    setArrastando(null);
    if (id) mover(id, destino);
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {quadro.colunas.map((col) => (
        <section
          key={col.codigo}
          aria-label={col.nome}
          onDragOver={(e) => {
            if (!editar) return;
            e.preventDefault();
            if (sobre !== col.codigo) setSobre(col.codigo);
          }}
          onDragLeave={() => sobre === col.codigo && setSobre(null)}
          onDrop={(e) => editar && soltar(e, col.codigo)}
          className={cn(
            "flex w-64 shrink-0 flex-col rounded-2xl bg-superficie-2/60 transition-colors duration-150",
            sobre === col.codigo && "bg-acao-suave ring-1 ring-acao/40",
          )}
        >
          <header className="flex items-center justify-between px-3 py-2.5">
            <h2 className={cn("text-sm font-semibold", col.fechado && "text-texto-3")}>
              {col.nome}
            </h2>
            <span className="numeros text-xs text-texto-3">{col.itens.length}</span>
          </header>
          <div className="flex min-h-24 flex-col gap-2 px-2 pb-2">
            {col.itens.map((i) => (
              <Cartao
                key={i.id}
                item={i}
                hoje={hoje}
                editar={editar}
                colunas={quadro.colunas}
                onMover={mover}
                onArrastar={setArrastando}
                arrastando={arrastando === i.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Cartao({
  item,
  hoje,
  editar,
  colunas,
  onMover,
  onArrastar,
  arrastando,
}: {
  item: ItemComFluxo;
  hoje: string;
  editar: boolean;
  colunas: QuadroDominio<ItemComFluxo>["colunas"];
  onMover: (id: string, destino: string) => void;
  onArrastar: (id: string | null) => void;
  arrastando: boolean;
}) {
  const tarde = atrasado(item, hoje);
  const progresso = progressoChecklist(lerChecklist(item.checklist));
  return (
    <article
      draggable={editar}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onArrastar(item.id);
      }}
      onDragEnd={() => onArrastar(null)}
      className={cn(
        "rounded-xl bg-card p-3 shadow-painel transition-opacity duration-150",
        editar && "cursor-grab active:cursor-grabbing",
        arrastando && "opacity-50",
        item.fechado && "opacity-70",
      )}
    >
      <Link
        href={`/planejamento/itens/${item.id}`}
        className="block text-sm font-medium leading-snug hover:underline"
      >
        {item.titulo}
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-3">
        {item.prazo && (
          <span className={cn("numeros", tarde && "font-medium text-erro")}>
            {dataCurta(item.prazo)}
            {item.horario && ` ${horaCurta(item.horario)}`}
          </span>
        )}
        {item.prioridade === "alta" && <span className="text-alerta">Alta</span>}
        {item.formato && <span>{FORMATO_ROTULO[item.formato as Formato]}</span>}
        {item.canal_publicacao && (
          <span>{CANAL_PUBLICACAO_ROTULO[item.canal_publicacao as CanalPublicacao]}</span>
        )}
        {progresso > 0 && <span className="numeros">{progresso}%</span>}
      </div>
      {editar && (
        <select
          aria-label={`Mover ${item.titulo} para`}
          value={item.status}
          onChange={(e) => onMover(item.id, e.target.value)}
          className="mt-2 h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-xs text-texto-2"
        >
          {colunas.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.nome}
            </option>
          ))}
        </select>
      )}
    </article>
  );
}
