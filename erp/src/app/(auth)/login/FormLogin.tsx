"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { CampoErro } from "@/componentes/painel/CampoErro";

export function FormLogin({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, FORM_INICIAL);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="voltar" value={voltar ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={!!estado.erros.email}
          aria-describedby="erro-email"
        />
        <CampoErro id="erro-email" chave={estado.erros.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!estado.erros.senha}
          aria-describedby="erro-senha"
        />
        <CampoErro id="erro-senha" chave={estado.erros.senha} />
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? "Entrando" : "Entrar"}
      </Button>
    </form>
  );
}
