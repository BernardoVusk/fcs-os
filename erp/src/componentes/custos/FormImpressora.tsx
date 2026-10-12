"use client";

import { useActionState, useContext, useState } from "react";
import { salvarImpressora } from "@/acoes/custos/impressoras";
import { custoHoraImpressora, custoHoraTotal, impressoraPronta } from "@/dominio/custos/impressora";
import { FORM_INICIAL } from "@/lib/forms";
import { lerNumeroPt, numeroParaCampo, formatarNumero } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type ImpressoraForm = {
  id: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  custo_aquisicao: number | null;
  valor_residual: number;
  data_aquisicao: string | null;
  vida_util_horas: number | null;
  potencia_media_w: number | null;
  custo_manutencao_ano: number | null;
  custo_consumiveis_ano: number | null;
  horas_produtivas_ano: number | null;
  status: string;
  observacoes: string | null;
};

const CAMPOS_CUSTO = [
  "custo_aquisicao",
  "valor_residual",
  "vida_util_horas",
  "potencia_media_w",
  "custo_manutencao_ano",
  "custo_consumiveis_ano",
  "horas_produtivas_ano",
] as const;

export function FormImpressora({
  impressora,
  tarifaKwh,
}: {
  impressora?: ImpressoraForm;
  tarifaKwh: number | null;
}) {
  const [estado, acao, pendente] = useActionState(salvarImpressora, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const [valores, setValores] = useState<Record<(typeof CAMPOS_CUSTO)[number], string>>({
    custo_aquisicao: numeroParaCampo(impressora?.custo_aquisicao, 2),
    valor_residual: numeroParaCampo(impressora?.valor_residual ?? 0, 2),
    vida_util_horas: numeroParaCampo(impressora?.vida_util_horas, 0),
    potencia_media_w: numeroParaCampo(impressora?.potencia_media_w, 2),
    custo_manutencao_ano: numeroParaCampo(impressora?.custo_manutencao_ano, 2),
    custo_consumiveis_ano: numeroParaCampo(impressora?.custo_consumiveis_ano, 2),
    horas_produtivas_ano: numeroParaCampo(impressora?.horas_produtivas_ano, 0),
  });
  const lidos = Object.fromEntries(CAMPOS_CUSTO.map((k) => [k, lerNumeroPt(valores[k])])) as Record<
    (typeof CAMPOS_CUSTO)[number],
    number | null
  >;
  const pronta = impressoraPronta(lidos);
  let previa: string | null = null;
  if (pronta.ok && tarifaKwh != null) {
    try {
      const c = custoHoraImpressora(pronta.dados, tarifaKwh);
      const t = custoHoraTotal(c);
      previa = `R$ ${formatarNumero(t.maquina, 4)} por hora de máquina (depreciação ${formatarNumero(c.depreciacao, 4)}, manutenção ${formatarNumero(c.manutencao, 4)}, consumíveis ${formatarNumero(c.consumiveis, 4)}) mais R$ ${formatarNumero(c.energia, 4)} de energia.`;
    } catch {
      previa = null;
    }
  }
  const campo = (
    nome: (typeof CAMPOS_CUSTO)[number],
    rotulo: string,
    dica?: string,
    inteiro = false,
  ) => (
    <Campo rotulo={rotulo} nome={nome} erro={estado.erros[nome]} dica={dica}>
      <Input
        id={nome}
        name={nome}
        inputMode={inteiro ? "numeric" : "decimal"}
        value={valores[nome]}
        onChange={(e) => setValores({ ...valores, [nome]: e.target.value })}
        className="numeros"
      />
    </Campo>
  );
  return (
    <form action={acao} className="space-y-4" noValidate>
      {impressora && <input type="hidden" name="id" value={impressora.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
          <Input
            id="nome"
            name="nome"
            defaultValue={impressora?.nome}
            required
            maxLength={80}
            placeholder="Ender 3 da bancada"
          />
        </Campo>
        <Campo rotulo="Fabricante" nome="fabricante" erro={estado.erros.fabricante}>
          <Input
            id="fabricante"
            name="fabricante"
            defaultValue={impressora?.fabricante ?? ""}
            maxLength={80}
          />
        </Campo>
        <Campo rotulo="Modelo" nome="modelo" erro={estado.erros.modelo}>
          <Input id="modelo" name="modelo" defaultValue={impressora?.modelo ?? ""} maxLength={80} />
        </Campo>
      </div>
      <fieldset className="space-y-4 rounded-xl border border-borda p-4">
        <legend className="px-1 text-sm font-medium">Custo por hora</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campo("custo_aquisicao", "Custo de aquisição (R$)")}
          {campo(
            "valor_residual",
            "Valor residual (R$)",
            "Quanto vale no fim da vida útil. Zero se nada.",
          )}
          {campo("vida_util_horas", "Vida útil (horas)", "Horas de impressão até trocar.", true)}
          {campo(
            "potencia_media_w",
            "Potência média (W)",
            "Medida com tomada inteligente, não a de pico.",
          )}
          {campo("custo_manutencao_ano", "Manutenção por ano (R$)")}
          {campo("custo_consumiveis_ano", "Consumíveis por ano (R$)", "Bicos, mesa, correias.")}
          {campo(
            "horas_produtivas_ano",
            "Horas produtivas por ano",
            "Quanto ela imprime de fato num ano.",
            true,
          )}
          <Campo
            rotulo="Data de aquisição"
            nome="data_aquisicao"
            erro={estado.erros.data_aquisicao}
          >
            <Input
              id="data_aquisicao"
              name="data_aquisicao"
              type="date"
              defaultValue={impressora?.data_aquisicao ?? ""}
            />
          </Campo>
          <Campo rotulo="Situação" nome="status" erro={estado.erros.status}>
            <SelectNativo id="status" name="status" defaultValue={impressora?.status ?? "ativa"}>
              <option value="ativa">Ativa</option>
              <option value="manutencao">Em manutenção</option>
              <option value="inativa">Inativa</option>
            </SelectNativo>
          </Campo>
        </div>
        <p className="text-sm text-texto-2">
          {previa ??
            (pronta.ok
              ? "Defina a tarifa de energia em Configurações > Parâmetros de custo para ver o custo por hora."
              : "Preencha todos os campos de custo para esta impressora entrar na calculadora.")}
        </p>
      </fieldset>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea
          id="observacoes"
          name="observacoes"
          defaultValue={impressora?.observacoes ?? ""}
          rows={2}
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
