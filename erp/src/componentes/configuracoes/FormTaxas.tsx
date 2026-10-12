"use client";

import { useActionState, useContext } from "react";
import { salvarTaxas } from "@/acoes/configuracoes/canais";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarNumero } from "@/lib/formatos/numero";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

type Base = {
  comissao_pct: number | null;
  taxa_fixa_item: number | null;
  taxa_pagamento_pct: number | null;
  ads_pct_padrao: number | null;
  frete_subsidio_padrao: number | null;
  dias_repasse: number | null;
} | null;

const pct = (v: number | null | undefined) => (v == null ? "" : formatarNumero(v * 100, 2));
const val = (v: number | null | undefined) => (v == null ? "" : formatarNumero(v, 2));

export function FormTaxas({ canalId, base }: { canalId: string; base: Base }) {
  const [estado, acao, pendente] = useActionState(salvarTaxas, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="canal_id" value={canalId} />
      <p className="text-sm text-texto-2">
        Deixe em branco o que não souber. Percentuais sobre o preço de venda, em por cento (14,5).
      </p>
      <Campo rotulo="Vigente desde" nome="vigente_desde" erro={estado.erros.vigente_desde}>
        <Input
          id="vigente_desde"
          name="vigente_desde"
          type="date"
          defaultValue={hojeSaoPaulo()}
          required
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Comissão (%)" nome="comissao_pct" erro={estado.erros.comissao_pct}>
          <Input
            id="comissao_pct"
            name="comissao_pct"
            inputMode="decimal"
            defaultValue={pct(base?.comissao_pct)}
            placeholder="14,00"
          />
        </Campo>
        <Campo
          rotulo="Taxa fixa por item (R$)"
          nome="taxa_fixa_item"
          erro={estado.erros.taxa_fixa_item}
        >
          <Input
            id="taxa_fixa_item"
            name="taxa_fixa_item"
            inputMode="decimal"
            defaultValue={val(base?.taxa_fixa_item)}
            placeholder="4,00"
          />
        </Campo>
        <Campo
          rotulo="Processamento (%)"
          nome="taxa_pagamento_pct"
          erro={estado.erros.taxa_pagamento_pct}
        >
          <Input
            id="taxa_pagamento_pct"
            name="taxa_pagamento_pct"
            inputMode="decimal"
            defaultValue={pct(base?.taxa_pagamento_pct)}
          />
        </Campo>
        <Campo rotulo="Ads padrão (%)" nome="ads_pct_padrao" erro={estado.erros.ads_pct_padrao}>
          <Input
            id="ads_pct_padrao"
            name="ads_pct_padrao"
            inputMode="decimal"
            defaultValue={pct(base?.ads_pct_padrao)}
          />
        </Campo>
        <Campo
          rotulo="Frete subsidiado (R$)"
          nome="frete_subsidio_padrao"
          erro={estado.erros.frete_subsidio_padrao}
        >
          <Input
            id="frete_subsidio_padrao"
            name="frete_subsidio_padrao"
            inputMode="decimal"
            defaultValue={val(base?.frete_subsidio_padrao)}
          />
        </Campo>
        <Campo rotulo="Dias até o repasse" nome="dias_repasse" erro={estado.erros.dias_repasse}>
          <Input
            id="dias_repasse"
            name="dias_repasse"
            inputMode="numeric"
            defaultValue={base?.dias_repasse ?? ""}
          />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea id="observacoes" name="observacoes" rows={2} maxLength={1000} />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Registrar vigência"}
      </Button>
    </form>
  );
}
