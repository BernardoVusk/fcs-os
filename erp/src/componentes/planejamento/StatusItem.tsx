"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { mudarStatusItem } from "@/acoes/planejamento/itens";
import type { Fluxo } from "@/dominio/planejamento/filtros";
import { erroPt } from "@/lib/erros-pt";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

/** Seletor de status do item na página de detalhe. */
export function StatusItem({
  id,
  status,
  fluxo,
  editar,
}: {
  id: string;
  status: string;
  fluxo: Fluxo[];
  editar: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <SelectNativo
      aria-label="Status"
      value={status}
      disabled={!editar || pendente}
      onChange={(e) =>
        iniciar(async () => {
          const r = await mudarStatusItem(id, e.target.value);
          if (r.ok) {
            toast.success(r.mensagem ?? "Status alterado.");
            router.refresh();
          } else toast.error(erroPt(r.erro) ?? "Não deu para mudar o status.");
        })
      }
      className="h-9 w-auto min-w-40"
    >
      {fluxo.map((f) => (
        <option key={f.codigo} value={f.codigo}>
          {f.nome}
        </option>
      ))}
    </SelectNativo>
  );
}
