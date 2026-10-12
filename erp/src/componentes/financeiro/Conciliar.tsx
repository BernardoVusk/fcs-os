"use client";

import { useActionState } from "react";
import { conciliarRepasses } from "@/acoes/financeiro/conciliacao";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { Banner } from "@/componentes/painel/Banner";

export function ConciliarRepasses({
  canais,
  contas,
}: {
  canais: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState(conciliarRepasses, FORM_INICIAL);
  return (
    <form action={acao} className="space-y-4 rounded-2xl bg-card p-5 shadow-painel" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Canal" nome="canal_id" erro={estado.erros.canal_id}>
          <SelectNativo id="canal_id" name="canal_id" defaultValue={canais[0]?.id ?? ""}>
            {canais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Conta onde o repasse caiu" nome="conta_id" erro={estado.erros.conta_id}>
          <SelectNativo id="conta_id" name="conta_id" defaultValue={contas[0]?.id ?? ""}>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Coluna do código do pedido"
          nome="col_codigo"
          erro={estado.erros.col_codigo}
          dica="Nome da coluna no CSV do extrato."
        >
          <Input
            id="col_codigo"
            name="col_codigo"
            defaultValue="ID do pedido"
            className="font-mono text-xs"
          />
        </Campo>
        <Campo rotulo="Coluna do valor repassado" nome="col_valor" erro={estado.erros.col_valor}>
          <Input
            id="col_valor"
            name="col_valor"
            defaultValue="Valor liberado"
            className="font-mono text-xs"
          />
        </Campo>
        <Campo rotulo="Coluna da data (opcional)" nome="col_data" erro={estado.erros.col_data}>
          <Input
            id="col_data"
            name="col_data"
            defaultValue="Data de liberação"
            className="font-mono text-xs"
          />
        </Campo>
        <Campo rotulo="Extrato de repasses (CSV)" nome="arquivo" erro={estado.erros.arquivo}>
          <Input
            id="arquivo"
            name="arquivo"
            type="file"
            accept=".csv,text/csv"
            className="file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-3 file:py-1 file:text-sm"
          />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Conciliando" : "Conciliar"}
      </Button>
      {estado.ok && estado.mensagem && (
        <Banner tipo="sucesso" titulo="Conciliação concluída">
          {estado.mensagem}
        </Banner>
      )}
    </form>
  );
}
