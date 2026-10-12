"use client";

import { useActionState, useContext, useState } from "react";
import { salvarVersaoParametros } from "@/acoes/custos/parametros";
import {
  METODO_FIXO_ROTULO,
  PARAMETRO_ROTULO,
  type ParametrosCusto,
} from "@/dominio/custos/parametros";
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

const pct = (v: number | null) => (v == null ? "" : numeroParaCampo(v * 100, 4));

/** Cria uma versão nova; os campos vêm preenchidos com a versão vigente. */
export function FormParametros({ base }: { base: ParametrosCusto | null }) {
  const [estado, acao, pendente] = useActionState(salvarVersaoParametros, FORM_INICIAL);
  const [metodoFixo, setMetodoFixo] = useState(base?.metodo_rateio_fixo ?? "");
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const n = (v: number | null | undefined, casas = 2) => numeroParaCampo(v, casas);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <Campo
        rotulo="Vigente desde"
        nome="vigente_desde"
        erro={estado.erros.vigente_desde}
        dica="Cálculos salvos antes continuam com a versão antiga."
      >
        <Input
          id="vigente_desde"
          name="vigente_desde"
          type="date"
          defaultValue={hojeSaoPaulo()}
          required
          className="max-w-48"
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo={PARAMETRO_ROTULO.tarifa_kwh}
          nome="tarifa_kwh"
          erro={estado.erros.tarifa_kwh}
          dica="Está na conta de luz."
        >
          <Input
            id="tarifa_kwh"
            name="tarifa_kwh"
            inputMode="decimal"
            defaultValue={n(base?.tarifa_kwh, 4)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo={PARAMETRO_ROTULO.custo_hora_mao_obra}
          nome="custo_hora_mao_obra"
          erro={estado.erros.custo_hora_mao_obra}
          dica="Quanto vale a sua hora de preparo e acabamento."
        >
          <Input
            id="custo_hora_mao_obra"
            name="custo_hora_mao_obra"
            inputMode="decimal"
            defaultValue={n(base?.custo_hora_mao_obra)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo={`${PARAMETRO_ROTULO.taxa_falha_padrao} (%)`}
          nome="taxa_falha_padrao"
          erro={estado.erros.taxa_falha_padrao}
          dica="Tentativas perdidas. Ex.: 5."
        >
          <Input
            id="taxa_falha_padrao"
            name="taxa_falha_padrao"
            inputMode="decimal"
            defaultValue={pct(base?.taxa_falha_padrao ?? null)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo={`${PARAMETRO_ROTULO.desperdicio_padrao} (%)`}
          nome="desperdicio_padrao"
          erro={estado.erros.desperdicio_padrao}
          dica="Purga, troca de cor, início de rolo."
        >
          <Input
            id="desperdicio_padrao"
            name="desperdicio_padrao"
            inputMode="decimal"
            defaultValue={pct(base?.desperdicio_padrao ?? null)}
            className="numeros"
          />
        </Campo>
      </div>
      <fieldset className="space-y-4 rounded-xl border border-borda p-4">
        <legend className="px-1 text-sm font-medium">Custo fixo</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo={PARAMETRO_ROTULO.metodo_rateio_fixo}
            nome="metodo_rateio_fixo"
            erro={estado.erros.metodo_rateio_fixo}
          >
            <SelectNativo
              id="metodo_rateio_fixo"
              name="metodo_rateio_fixo"
              value={metodoFixo}
              onChange={(e) => setMetodoFixo(e.target.value)}
            >
              <option value="">Não configurado</option>
              {(Object.keys(METODO_FIXO_ROTULO) as (keyof typeof METODO_FIXO_ROTULO)[]).map((m) => (
                <option key={m} value={m}>
                  {METODO_FIXO_ROTULO[m]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo={PARAMETRO_ROTULO.custo_fixo_mensal}
            nome="custo_fixo_mensal"
            erro={estado.erros.custo_fixo_mensal}
            dica="Aluguel, internet, software, pró-labore."
          >
            <Input
              id="custo_fixo_mensal"
              name="custo_fixo_mensal"
              inputMode="decimal"
              defaultValue={n(base?.custo_fixo_mensal)}
              className="numeros"
              disabled={metodoFixo === "desligado"}
            />
          </Campo>
          <Campo
            rotulo={PARAMETRO_ROTULO.horas_produtivas_mes}
            nome="horas_produtivas_mes"
            erro={estado.erros.horas_produtivas_mes}
          >
            <Input
              id="horas_produtivas_mes"
              name="horas_produtivas_mes"
              inputMode="decimal"
              defaultValue={n(base?.horas_produtivas_mes, 1)}
              className="numeros"
              disabled={metodoFixo !== "hora"}
            />
          </Campo>
          <Campo
            rotulo={PARAMETRO_ROTULO.volume_mensal_estimado}
            nome="volume_mensal_estimado"
            erro={estado.erros.volume_mensal_estimado}
          >
            <Input
              id="volume_mensal_estimado"
              name="volume_mensal_estimado"
              inputMode="numeric"
              defaultValue={n(base?.volume_mensal_estimado, 0)}
              className="numeros"
              disabled={metodoFixo !== "peca"}
            />
          </Campo>
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-xl border border-borda p-4">
        <legend className="px-1 text-sm font-medium">Preço</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo={`${PARAMETRO_ROTULO.imposto_pct_estimado} (%)`}
            nome="imposto_pct_estimado"
            erro={estado.erros.imposto_pct_estimado}
            dica="Confira com o contador. Vazio bloqueia o preço."
          >
            <Input
              id="imposto_pct_estimado"
              name="imposto_pct_estimado"
              inputMode="decimal"
              defaultValue={pct(base?.imposto_pct_estimado ?? null)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo={PARAMETRO_ROTULO.metodo_margem_padrao}
            nome="metodo_margem_padrao"
            erro={estado.erros.metodo_margem_padrao}
          >
            <SelectNativo
              id="metodo_margem_padrao"
              name="metodo_margem_padrao"
              defaultValue={base?.metodo_margem_padrao ?? ""}
            >
              <option value="">Não configurado</option>
              <option value="margem">Margem sobre o preço</option>
              <option value="markup">Markup sobre o custo</option>
            </SelectNativo>
          </Campo>
          <Campo
            rotulo={`${PARAMETRO_ROTULO.margem_alvo_padrao} (%)`}
            nome="margem_alvo_padrao"
            erro={estado.erros.margem_alvo_padrao}
          >
            <Input
              id="margem_alvo_padrao"
              name="margem_alvo_padrao"
              inputMode="decimal"
              defaultValue={pct(base?.margem_alvo_padrao ?? null)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo={`${PARAMETRO_ROTULO.markup_padrao} (%)`}
            nome="markup_padrao"
            erro={estado.erros.markup_padrao}
            dica="Pode passar de 100."
          >
            <Input
              id="markup_padrao"
              name="markup_padrao"
              inputMode="decimal"
              defaultValue={pct(base?.markup_padrao ?? null)}
              className="numeros"
            />
          </Campo>
        </div>
      </fieldset>
      <Campo
        rotulo="Observações"
        nome="observacoes"
        erro={estado.erros.observacoes}
        dica="O que mudou e por quê."
      >
        <Textarea id="observacoes" name="observacoes" rows={2} maxLength={1000} />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Registrar versão"}
      </Button>
    </form>
  );
}
