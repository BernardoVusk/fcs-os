"use client";

import { useActionState } from "react";
import { verificarMfa } from "@/acoes/mfa";
import { sair } from "@/acoes/sessao";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { CampoErro } from "@/componentes/painel/CampoErro";

export function FormVerificar({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(verificarMfa, FORM_INICIAL);
  return (
    <div className="space-y-4">
      <form action={acao} className="space-y-4" noValidate>
        <input type="hidden" name="voltar" value={voltar ?? ""} />
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className="numeros text-lg tracking-[0.3em]"
            aria-invalid={!!estado.erros.codigo}
            aria-describedby="erro-codigo"
          />
          <CampoErro id="erro-codigo" chave={estado.erros.codigo} />
        </div>
        <CampoErro chave={estado.erros._form} />
        <Button type="submit" className="h-10 w-full text-[15px]" disabled={pendente}>
          {pendente ? "Verificando" : "Verificar"}
        </Button>
      </form>
      <form action={sair}>
        <Button type="submit" variant="ghost" size="sm" className="w-full">
          Entrar com outra conta
        </Button>
      </form>
    </div>
  );
}
