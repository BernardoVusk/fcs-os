"use client";

import { useActionState, useContext, useState } from "react";
import { registrarMovimentacao } from "@/acoes/estoque/movimentacoes";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

const TIPOS = [
  { valor: "consumo_producao", rotulo: "Consumo de produção" },
  { valor: "saida", rotulo: "Saída comum (amostra, uso interno)" },
  { valor: "perda", rotulo: "Perda (rolo úmido, peça quebrada)" },
  { valor: "devolucao", rotulo: "Devolução ao fornecedor" },
  { valor: "ajuste", rotulo: "Ajuste de contagem" },
] as const;

export function FormMovimentacao({
  insumo,
  lotes,
}: {
  insumo: { id: string; nome: string; unidade_base: string };
  lotes: { id: string; codigo: string; quantidade_atual: number }[];
}) {
  const [estado, acao, pendente] = useActionState(registrarMovimentacao, FORM_INICIAL);
  const [tipo, setTipo] = useState<string>("consumo_producao");
  const [negativo, setNegativo] = useState(false);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const ajuste = tipo === "ajuste";
  const consumo = tipo === "consumo_producao";
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="insumo_id" value={insumo.id} />
      <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
        <SelectNativo id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </SelectNativo>
      </Campo>
      {ajuste && (
        <Campo
          rotulo="Direção"
          nome="direcao"
          erro={estado.erros.direcao}
          dica="Entrada sem lote cria um lote de ajuste ao custo médio."
        >
          <SelectNativo id="direcao" name="direcao" defaultValue="saida">
            <option value="saida">Tirar do estoque (contagem menor)</option>
            <option value="entrada">Colocar no estoque (contagem maior)</option>
          </SelectNativo>
        </Campo>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Lote"
          nome="lote_id"
          erro={estado.erros.lote_id}
          dica="Sem lote: sai do mais antigo com saldo."
        >
          <SelectNativo id="lote_id" name="lote_id" defaultValue="">
            <option value="">Mais antigo primeiro</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} ({formatarQuantidade(l.quantidade_atual, insumo.unidade_base)})
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo={`Quantidade (${insumo.unidade_base})`}
          nome="quantidade"
          erro={estado.erros.quantidade}
        >
          <Input
            id="quantidade"
            name="quantidade"
            inputMode="decimal"
            required
            className="numeros"
            autoFocus
          />
        </Campo>
      </div>
      <Campo
        rotulo="Motivo"
        nome="motivo"
        erro={estado.erros.motivo}
        dica={ajuste ? "Opcional no ajuste." : "Ex.: OP de teste, peça do pedido 123."}
      >
        <Input id="motivo" name="motivo" maxLength={300} />
      </Campo>
      {consumo && (
        <div className="space-y-3 rounded-xl border border-borda p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="permitir_negativo"
              value="sim"
              checked={negativo}
              onChange={(e) => setNegativo(e.target.checked)}
              className="size-4 accent-acao"
            />
            Deixar o lote negativo se o saldo não bastar (exige lote e justificativa; abre alerta)
          </label>
          {negativo && (
            <Campo rotulo="Justificativa" nome="justificativa" erro={estado.erros.justificativa}>
              <Textarea
                id="justificativa"
                name="justificativa"
                rows={2}
                maxLength={500}
                placeholder="Ex.: rolo pesado mostrou mais material do que o sistema tinha."
              />
            </Campo>
          )}
        </div>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Registrando" : "Registrar"}
      </Button>
    </form>
  );
}
