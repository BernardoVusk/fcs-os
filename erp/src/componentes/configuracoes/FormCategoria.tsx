"use client";

import { useActionState, useContext } from "react";
import { salvarCategoria } from "@/acoes/configuracoes/categorias";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type CategoriaForm = { id: string; nome: string; pai_id: string | null; cor: string | null; ordem: number };

export function FormCategoria({
  escopo,
  categoria,
  opcoesPai,
}: {
  escopo: string;
  categoria?: CategoriaForm;
  opcoesPai: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(salvarCategoria, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="escopo" value={escopo} />
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={categoria?.nome} required maxLength={80} />
      </Campo>
      <Campo rotulo="Categoria pai" nome="pai_id" erro={estado.erros.pai_id}>
        <SelectNativo id="pai_id" name="pai_id" defaultValue={categoria?.pai_id ?? ""}>
          <option value="">Nenhuma</option>
          {opcoesPai
            .filter((o) => o.id !== categoria?.id)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
        </SelectNativo>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor} dica="Opcional, hexadecimal">
          <Input id="cor" name="cor" defaultValue={categoria?.cor ?? ""} placeholder="#00D8FF" maxLength={7} />
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={estado.erros.ordem}>
          <Input id="ordem" name="ordem" inputMode="numeric" defaultValue={categoria?.ordem ?? 0} />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}
