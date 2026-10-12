"use client";

import { createContext, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";

/** Formulários dentro do diálogo chamam fechar() ao salvar. */
export const ContextoDialogo = createContext<() => void>(() => {});

export function DialogoNovo({
  rotulo,
  titulo,
  abrirInicial = false,
  children,
}: {
  rotulo: string;
  titulo: string;
  abrirInicial?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(abrirInicial);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> {rotulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <ContextoDialogo.Provider value={() => setAberto(false)}>{children}</ContextoDialogo.Provider>
      </DialogContent>
    </Dialog>
  );
}
