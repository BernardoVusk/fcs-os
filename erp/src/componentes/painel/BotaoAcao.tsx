"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ResultadoAcao } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";

type Props = {
  acao: () => Promise<ResultadoAcao>;
  confirmar?: { titulo: string; descricao?: string; rotulo?: string };
  children: React.ReactNode;
  variant?: "ghost" | "secondary" | "destructive" | "outline";
  size?: "sm" | "default" | "icon";
};

export function BotaoAcao({ acao, confirmar, children, variant = "ghost", size = "sm" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  function executar() {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.success(r.mensagem ?? "Feito.");
      else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
      setAberto(false);
    });
  }
  if (!confirmar) {
    return (
      <Button variant={variant} size={size} disabled={pendente} onClick={executar}>
        {children}
      </Button>
    );
  }
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmar.titulo}</DialogTitle>
          {confirmar.descricao && <DialogDescription>{confirmar.descricao}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pendente} onClick={executar}>
            {confirmar.rotulo ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
