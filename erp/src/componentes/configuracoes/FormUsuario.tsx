"use client";

import { useActionState, useContext } from "react";
import { criarUsuario } from "@/acoes/configuracoes/usuarios";
import { PAPEIS, PAPEL_ROTULO } from "@/lib/auth/papeis";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export function FormUsuario() {
  const [estado, acao, pendente] = useActionState(criarUsuario, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" required maxLength={120} />
      </Campo>
      <Campo rotulo="E-mail" nome="email" erro={estado.erros.email}>
        <Input id="email" name="email" type="email" required />
      </Campo>
      <Campo
        rotulo="Senha inicial"
        nome="senha"
        erro={estado.erros.senha}
        dica="Pelo menos 10 caracteres. Combine a troca na primeira entrada."
      >
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </Campo>
      <Campo rotulo="Papel" nome="papel" erro={estado.erros.papel}>
        <SelectNativo id="papel" name="papel" defaultValue="leitura">
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {PAPEL_ROTULO[p]}
            </option>
          ))}
        </SelectNativo>
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Criando" : "Criar usuário"}
      </Button>
    </form>
  );
}
