"use client";

import { useActionState, useContext } from "react";
import { salvarCanal } from "@/acoes/configuracoes/canais";
import { TIPO_CANAL_ROTULO, TIPOS_CANAL } from "@/dominio/configuracao/canais";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

type Canal = { id: string; nome: string; tipo: string; ativo: boolean; observacoes: string | null };

export function FormCanal({ canal }: { canal?: Canal }) {
  const [estado, acao, pendente] = useActionState(salvarCanal, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, canal ? undefined : fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {canal && <input type="hidden" name="id" value={canal.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={canal?.nome} required maxLength={80} />
      </Campo>
      <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
        <SelectNativo id="tipo" name="tipo" defaultValue={canal?.tipo ?? "outro"}>
          {TIPOS_CANAL.map((t) => (
            <option key={t} value={t}>
              {TIPO_CANAL_ROTULO[t]}
            </option>
          ))}
        </SelectNativo>
      </Campo>
      {canal && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={canal.ativo}
            className="size-4 accent-acao"
          />
          Canal ativo
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={canal?.observacoes ?? ""}
          rows={3}
          maxLength={2000}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}
