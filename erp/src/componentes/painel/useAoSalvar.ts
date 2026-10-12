"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { EstadoForm } from "@/lib/forms";

/** Quando a action devolve ok, mostra o toast e chama aoSalvar (fechar diálogo, limpar). */
export function useAoSalvar(estado: EstadoForm, aoSalvar?: () => void) {
  const anterior = useRef(estado);
  useEffect(() => {
    if (estado === anterior.current) return;
    anterior.current = estado;
    if (estado.ok) {
      toast.success(estado.mensagem ?? "Salvo.");
      aoSalvar?.();
    }
  }, [estado, aoSalvar]);
}
