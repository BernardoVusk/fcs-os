"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adicionarOfertaFila } from "@/acoes/ofertas/filas";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export function AdicionarAFila({
  ofertaId,
  filas,
}: {
  ofertaId: string;
  filas: { id: string; nome: string }[];
}) {
  const [fila, setFila] = useState(filas[0]?.id ?? "");
  const [pendente, iniciar] = useTransition();
  if (!filas.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectNativo
        aria-label="Fila"
        value={fila}
        onChange={(e) => setFila(e.target.value)}
        className="h-8 w-auto"
      >
        {filas.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </SelectNativo>
      <Button
        size="sm"
        variant="outline"
        disabled={pendente || !fila}
        onClick={() =>
          iniciar(async () => {
            const r = await adicionarOfertaFila(fila, ofertaId);
            if (r.ok) toast.success(r.mensagem ?? "Adicionada.");
            else toast.error(erroPt(r.erro));
          })
        }
      >
        Adicionar à fila
      </Button>
    </div>
  );
}
