"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { alternarItemChecklist } from "@/acoes/planejamento/itens";
import {
  alternarChecklist,
  progressoChecklist,
  type ItemChecklist,
} from "@/dominio/planejamento/tipos";
import { erroPt } from "@/lib/erros-pt";
import { cn } from "@/lib/utils";

/** Checklist do item com marcação otimista e barra de progresso. */
export function Checklist({
  itemId,
  itens,
  editar,
}: {
  itemId: string;
  itens: ItemChecklist[];
  editar: boolean;
}) {
  const [lista, marcar] = useOptimistic(itens, (atual, indice: number) =>
    alternarChecklist(atual, indice),
  );
  const [, iniciar] = useTransition();
  const progresso = progressoChecklist(lista);
  if (lista.length === 0)
    return (
      <p className="text-sm text-texto-3">Sem checklist. Edite o item para adicionar etapas.</p>
    );
  function alternar(indice: number) {
    iniciar(async () => {
      marcar(indice);
      const r = await alternarItemChecklist(itemId, indice);
      if (!r.ok) toast.error(erroPt(r.erro) ?? "Não deu para marcar.");
    });
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-texto-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
          <div
            className="h-full rounded-full bg-acao transition-[width] duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <span className="numeros w-10 text-right">{progresso}%</span>
      </div>
      <ul className="space-y-1">
        {lista.map((c, n) => (
          <li key={`${n}-${c.nome}`}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-superficie-2",
                !editar && "cursor-default hover:bg-transparent",
              )}
            >
              <input
                type="checkbox"
                checked={c.feito}
                disabled={!editar}
                onChange={() => alternar(n)}
                className="size-4 accent-acao"
                aria-label={c.nome}
              />
              <span className={cn(c.feito && "text-texto-3 line-through")}>{c.nome}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
