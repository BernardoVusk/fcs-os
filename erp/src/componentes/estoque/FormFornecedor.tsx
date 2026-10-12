"use client";

import { useActionState, useContext } from "react";
import { salvarFornecedor } from "@/acoes/estoque/fornecedores";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type FornecedorForm = {
  id: string;
  nome: string;
  contato: string | null;
  site: string | null;
  prazo_medio_dias: number | null;
  observacoes: string | null;
  ativo: boolean;
};

export function FormFornecedor({ fornecedor }: { fornecedor?: FornecedorForm }) {
  const [estado, acao, pendente] = useActionState(salvarFornecedor, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={fornecedor?.nome} required maxLength={120} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Contato"
          nome="contato"
          erro={estado.erros.contato}
          dica="Telefone, WhatsApp ou e-mail."
        >
          <Input
            id="contato"
            name="contato"
            defaultValue={fornecedor?.contato ?? ""}
            maxLength={200}
          />
        </Campo>
        <Campo rotulo="Site ou loja" nome="site" erro={estado.erros.site}>
          <Input id="site" name="site" defaultValue={fornecedor?.site ?? ""} maxLength={200} />
        </Campo>
      </div>
      <Campo
        rotulo="Prazo médio de entrega (dias)"
        nome="prazo_medio_dias"
        erro={estado.erros.prazo_medio_dias}
      >
        <Input
          id="prazo_medio_dias"
          name="prazo_medio_dias"
          inputMode="numeric"
          defaultValue={fornecedor?.prazo_medio_dias ?? ""}
          className="numeros max-w-40"
        />
      </Campo>
      {fornecedor && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={fornecedor.ativo}
            className="size-4 accent-acao"
          />
          Fornecedor ativo
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={fornecedor?.observacoes ?? ""}
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
