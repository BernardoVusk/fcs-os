"use client";

import { useActionState, useContext } from "react";
import { salvarUnidade } from "@/acoes/configuracoes/unidades";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

type Unidade = { codigo: string; nome: string; base: string | null; fator_para_base: number };

export function FormUnidade({ unidade, bases }: { unidade?: Unidade; bases: string[] }) {
  const [estado, acao, pendente] = useActionState(salvarUnidade, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {unidade && <input type="hidden" name="editando" value="sim" />}
      <Campo rotulo="Código" nome="codigo" erro={estado.erros.codigo} dica="Minúsculas, até 6 letras (g, kg, un)">
        <Input id="codigo" name="codigo" defaultValue={unidade?.codigo} readOnly={!!unidade} maxLength={6} required />
      </Campo>
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={unidade?.nome} maxLength={40} required />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Unidade base" nome="base" erro={estado.erros.base}>
          <SelectNativo id="base" name="base" defaultValue={unidade?.base ?? ""}>
            <option value="">É base</option>
            {bases
              .filter((b) => b !== unidade?.codigo)
              .map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Fator para a base" nome="fator_para_base" erro={estado.erros.fator_para_base} dica="1 kg = 1000 g, então fator 1000">
          <Input id="fator_para_base" name="fator_para_base" inputMode="decimal" defaultValue={unidade?.fator_para_base ?? 1} />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}
