"use client";

import { useActionState, useContext, useState } from "react";
import { salvarLancamento } from "@/acoes/financeiro/lancamentos";
import type { LancamentoSituacao } from "@/dados/financeiro/financeiro";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type OpcaoConta = { id: string; nome: string };
export type OpcaoCategoria = { id: string; nome: string; tipo: string };

export function FormLancamento({
  contas,
  categorias,
  lancamento,
  tipoInicial = "despesa",
}: {
  contas: OpcaoConta[];
  categorias: OpcaoCategoria[];
  lancamento?: LancamentoSituacao;
  tipoInicial?: "receita" | "despesa" | "transferencia";
}) {
  const [estado, acao, pendente] = useActionState(salvarLancamento, FORM_INICIAL);
  const [tipo, setTipo] = useState<string>(lancamento?.tipo ?? tipoInicial);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const transf = tipo === "transferencia";
  return (
    <form action={acao} className="space-y-4" noValidate>
      {lancamento?.id && <input type="hidden" name="id" value={lancamento.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
          <SelectNativo
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={Boolean(lancamento)}
          >
            <option value="despesa">A pagar (despesa)</option>
            <option value="receita">A receber (receita)</option>
            <option value="transferencia">Transferência entre contas</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Valor (R$)" nome="valor_previsto" erro={estado.erros.valor_previsto}>
          <Input
            id="valor_previsto"
            name="valor_previsto"
            inputMode="decimal"
            defaultValue={numeroParaCampo(lancamento?.valor_previsto, 2)}
            required
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Data prevista" nome="data_prevista" erro={estado.erros.data_prevista}>
          <Input
            id="data_prevista"
            name="data_prevista"
            type="date"
            defaultValue={lancamento?.data_prevista ?? hojeSaoPaulo()}
            required
          />
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome="descricao" erro={estado.erros.descricao}>
        <Input
          id="descricao"
          name="descricao"
          defaultValue={lancamento?.descricao ?? ""}
          required
          maxLength={200}
          placeholder="Conta de luz de outubro, rolo de PLA, anúncio Shopee"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        {!transf && (
          <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
            <SelectNativo
              id="categoria_id"
              name="categoria_id"
              defaultValue={lancamento?.categoria_id ?? ""}
            >
              <option value="">Sem categoria</option>
              {categorias
                .filter((c) => c.tipo === tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </SelectNativo>
          </Campo>
        )}
        <Campo
          rotulo={transf ? "Conta de origem" : "Conta"}
          nome="conta_id"
          erro={estado.erros.conta_id}
          dica={transf ? undefined : "Pode ficar vazia até realizar."}
        >
          <SelectNativo id="conta_id" name="conta_id" defaultValue={lancamento?.conta_id ?? ""}>
            <option value="">{transf ? "Escolha" : "Definir ao realizar"}</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        {transf && (
          <Campo
            rotulo="Conta de destino"
            nome="conta_destino_id"
            erro={estado.erros.conta_destino_id}
          >
            <SelectNativo
              id="conta_destino_id"
              name="conta_destino_id"
              defaultValue={lancamento?.conta_destino_id ?? ""}
            >
              <option value="">Escolha</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
        )}
        <Campo
          rotulo="Competência"
          nome="competencia"
          erro={estado.erros.competencia}
          dica="Vazio usa o mês da data prevista."
        >
          <Input
            id="competencia"
            name="competencia"
            type="date"
            defaultValue={lancamento?.competencia ?? ""}
          />
        </Campo>
        <Campo
          rotulo="Forma de pagamento"
          nome="forma_pagamento"
          erro={estado.erros.forma_pagamento}
        >
          <Input
            id="forma_pagamento"
            name="forma_pagamento"
            defaultValue={lancamento?.forma_pagamento ?? ""}
            maxLength={40}
            placeholder="Pix, boleto, cartão"
          />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={lancamento?.observacoes ?? ""}
          rows={2}
          maxLength={2000}
        />
      </Campo>
      {!lancamento && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="realizar_agora" value="sim" className="size-4 accent-acao" />
          Já foi pago ou recebido nessa data (realizar agora na conta escolhida)
        </label>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : lancamento ? "Salvar" : "Registrar"}
      </Button>
    </form>
  );
}
