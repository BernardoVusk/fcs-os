"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { salvarCalculo } from "@/acoes/custos/calculos";
import { calcular, type EntradasCalculo, type ResultadoCalculo } from "@/dominio/custos/motor";
import { validarEntradas } from "@/dominio/custos/custo-peca";
import {
  COMPONENTES_ROTULO,
  type ComponentesCusto,
  type CustoHoraImpressora,
} from "@/dominio/custos/tipos";
import {
  METODO_FIXO_ROTULO,
  PARAMETRO_ROTULO,
  type ParametrosCusto,
} from "@/dominio/custos/parametros";
import {
  MOTIVO_INVIAVEL_ROTULO,
  type ResultadoPreco,
  type TaxasCanal,
} from "@/dominio/precos/preco";
import { FORM_INICIAL } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { formatarNumero, lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { Banner } from "@/componentes/painel/Banner";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";
import { cn } from "@/lib/utils";

export type OpcaoInsumo = { id: string; nome: string; custo_g: number | null; origem: string };
export type OpcaoImpressora = {
  id: string;
  nome: string;
  custoHora: CustoHoraImpressora | null;
  faltam: string[];
};
export type OpcaoCanal = {
  id: string;
  nome: string;
  taxas: Omit<TaxasCanal, "imposto_pct"> | null;
  faltam: string[];
};
export type CalculoInicial = {
  nome: string;
  entradas: EntradasCalculo;
  insumo_id: string | null;
  impressora_id: string | null;
  canal_id: string | null;
  metodo: string | null;
};

type Props = {
  parametros: ParametrosCusto | null;
  versaoParametros: number | null;
  faltamParametros: string[];
  insumos: OpcaoInsumo[];
  impressoras: OpcaoImpressora[];
  canais: OpcaoCanal[];
  desligados: (keyof ComponentesCusto)[];
  editar: boolean;
  inicial?: CalculoInicial;
};

const pctCampo = (v: number | null | undefined) => (v == null ? "" : numeroParaCampo(v * 100, 4));
const n = (v: number | null | undefined, casas = 2) => numeroParaCampo(v, casas);
const ORIGEM_ROTULO: Record<string, string> = {
  media: "média do estoque",
  ultima_entrada: "última compra",
  manual: "manual",
};

export function Calculadora({
  parametros,
  versaoParametros,
  faltamParametros,
  insumos,
  impressoras,
  canais,
  desligados,
  editar,
  inicial,
}: Props) {
  const p0 = inicial?.entradas.peca;
  const [f, setF] = useState({
    peso_g: n(p0?.peso_g, 3),
    tempo_ciclo_min: n(p0?.tempo_ciclo_min, 1),
    pecas_por_ciclo: n(p0?.pecas_por_ciclo ?? 1, 0),
    taxa_falha: pctCampo(p0?.taxa_falha ?? parametros?.taxa_falha_padrao),
    desperdicio: pctCampo(p0?.desperdicio ?? parametros?.desperdicio_padrao),
    preparo_ciclo_min: n(p0?.preparo_ciclo_min, 1),
    acabamento_peca_min: n(p0?.acabamento_peca_min, 1),
    embalagem_peca_min: n(p0?.embalagem_peca_min, 1),
    custo_hora_mao_obra: n(p0?.custo_hora_mao_obra ?? parametros?.custo_hora_mao_obra),
    complementares_peca: n(p0?.complementares_peca),
    complementares_pedido: n(p0?.complementares_pedido),
    custo_kg_manual: p0 && !inicial?.insumo_id ? n(p0.custo_g * 1000, 2) : "",
    margem_alvo: pctCampo(inicial?.entradas.margem_alvo ?? parametros?.margem_alvo_padrao),
    markup_alvo: pctCampo(inicial?.entradas.markup_alvo ?? parametros?.markup_padrao),
  });
  const [origemCusto, setOrigemCusto] = useState<"insumo" | "manual">(
    inicial && !inicial.insumo_id ? "manual" : "insumo",
  );
  const [insumoId, setInsumoId] = useState(inicial?.insumo_id ?? insumos[0]?.id ?? "");
  const [impressoraId, setImpressoraId] = useState(
    inicial?.impressora_id ?? impressoras.find((i) => i.custoHora)?.id ?? "",
  );
  const [canalId, setCanalId] = useState(inicial?.canal_id ?? "");
  const [metodo, setMetodo] = useState(
    inicial?.metodo ?? parametros?.metodo_margem_padrao ?? "margem",
  );
  const [estado, acao, pendente] = useActionState(salvarCalculo, FORM_INICIAL);
  useAoSalvar(estado);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const insumo = insumos.find((i) => i.id === insumoId);
  const impressora = impressoras.find((i) => i.id === impressoraId);
  const canal = canais.find((c) => c.id === canalId);

  // Monta as entradas do motor a partir do formulário, ou explica o que impede.
  const montado = useMemo(():
    { entradas: EntradasCalculo; avisos: string[] } | { bloqueio: string } => {
    if (!parametros || faltamParametros.length > 0) return { bloqueio: "parametros_incompletos" };
    const avisos: string[] = [];
    const custoG =
      origemCusto === "manual"
        ? (lerNumeroPt(f.custo_kg_manual) ?? NaN) / 1000
        : (insumo?.custo_g ?? NaN);
    if (!Number.isFinite(custoG))
      return { bloqueio: origemCusto === "manual" ? "custo_g_invalido" : "insumo_sem_custo" };
    if (!impressora) return { bloqueio: "impressora_obrigatoria" };
    if (!impressora.custoHora) return { bloqueio: "impressora_incompleta" };
    const pct = (s: string) => (lerNumeroPt(s) ?? 0) / 100;
    let taxasCanal: TaxasCanal | null = null;
    if (canal) {
      if (!canal.taxas) return { bloqueio: "canal_sem_taxas" };
      if (parametros.imposto_pct_estimado == null) avisos.push("imposto_nao_configurado");
      else taxasCanal = { ...canal.taxas, imposto_pct: parametros.imposto_pct_estimado };
    }
    const entradas: EntradasCalculo = {
      peca: {
        peso_g: lerNumeroPt(f.peso_g) ?? 0,
        tempo_ciclo_min: lerNumeroPt(f.tempo_ciclo_min) ?? 0,
        pecas_por_ciclo: lerNumeroPt(f.pecas_por_ciclo) ?? 1,
        taxa_falha: pct(f.taxa_falha),
        desperdicio: pct(f.desperdicio),
        custo_g: Math.round(custoG * 1_000_000) / 1_000_000,
        preparo_ciclo_min: lerNumeroPt(f.preparo_ciclo_min) ?? 0,
        acabamento_peca_min: lerNumeroPt(f.acabamento_peca_min) ?? 0,
        embalagem_peca_min: lerNumeroPt(f.embalagem_peca_min) ?? 0,
        custo_hora_mao_obra:
          lerNumeroPt(f.custo_hora_mao_obra) ?? parametros.custo_hora_mao_obra ?? 0,
        complementares_peca: lerNumeroPt(f.complementares_peca) ?? 0,
        complementares_pedido: lerNumeroPt(f.complementares_pedido) ?? 0,
        impressora: impressora.custoHora,
        fixo: {
          metodo: parametros.metodo_rateio_fixo ?? "desligado",
          custo_fixo_mensal: parametros.custo_fixo_mensal ?? 0,
          horas_produtivas_mes: parametros.horas_produtivas_mes ?? 0,
          volume_mensal_estimado: parametros.volume_mensal_estimado ?? 0,
        },
        desligados,
      },
      canal: taxasCanal,
      margem_alvo: f.margem_alvo ? pct(f.margem_alvo) : null,
      markup_alvo: f.markup_alvo ? pct(f.markup_alvo) : null,
    };
    const erros = validarEntradas(entradas.peca);
    if (erros.length > 0) return { bloqueio: erros[0] };
    return { entradas, avisos };
  }, [f, origemCusto, insumo, impressora, canal, parametros, faltamParametros, desligados]);

  const resultado: ResultadoCalculo | null =
    "entradas" in montado ? calcular(montado.entradas) : null;
  const custo = resultado?.custo;
  const preco = resultado?.preco;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        {"bloqueio" in montado && montado.bloqueio === "parametros_incompletos" && (
          <Banner
            tipo="alerta"
            titulo="Parâmetros de custo incompletos"
            acao={
              <Button asChild size="sm" variant="outline">
                <Link href="/configuracoes/parametros-custo">Configurar</Link>
              </Button>
            }
          >
            Faltam:{" "}
            {faltamParametros
              .map((k) => PARAMETRO_ROTULO[k as keyof ParametrosCusto] ?? k)
              .join(", ")}
            . Sem isso nenhum custo é calculado.
          </Banner>
        )}
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Peça</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Peso (g)" nome="peso_g" dica="Do fatiador, com suportes.">
              <Input
                id="peso_g"
                inputMode="decimal"
                value={f.peso_g}
                onChange={set("peso_g")}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Tempo do ciclo (min)"
              nome="tempo_ciclo_min"
              dica="Tempo de impressão da mesa."
            >
              <Input
                id="tempo_ciclo_min"
                inputMode="decimal"
                value={f.tempo_ciclo_min}
                onChange={set("tempo_ciclo_min")}
                className="numeros"
              />
            </Campo>
            <Campo rotulo="Peças por ciclo" nome="pecas_por_ciclo">
              <Input
                id="pecas_por_ciclo"
                inputMode="numeric"
                value={f.pecas_por_ciclo}
                onChange={set("pecas_por_ciclo")}
                className="numeros"
              />
            </Campo>
            <Campo rotulo="Taxa de falha (%)" nome="taxa_falha" dica="Tentativas perdidas.">
              <Input
                id="taxa_falha"
                inputMode="decimal"
                value={f.taxa_falha}
                onChange={set("taxa_falha")}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Desperdício (%)"
              nome="desperdicio"
              dica="Purga e descarte, só no material."
            >
              <Input
                id="desperdicio"
                inputMode="decimal"
                value={f.desperdicio}
                onChange={set("desperdicio")}
                className="numeros"
              />
            </Campo>
          </div>
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Material e impressora</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Filamento" nome="origem_custo">
              <SelectNativo
                id="origem_custo"
                value={origemCusto}
                onChange={(e) => setOrigemCusto(e.target.value as "insumo" | "manual")}
              >
                <option value="insumo">Do estoque (custo de reposição)</option>
                <option value="manual">Informar custo por quilo</option>
              </SelectNativo>
            </Campo>
            {origemCusto === "insumo" ? (
              <Campo
                rotulo="Insumo"
                nome="insumo_id"
                dica={
                  insumo?.custo_g == null
                    ? "Sem custo: confirme uma compra deste filamento."
                    : `R$ ${formatarNumero(insumo.custo_g * 1000, 2)}/kg, ${ORIGEM_ROTULO[insumo.origem] ?? insumo.origem}`
                }
              >
                <SelectNativo
                  id="insumo_id"
                  value={insumoId}
                  onChange={(e) => setInsumoId(e.target.value)}
                >
                  {insumos.length === 0 && <option value="">Nenhum filamento cadastrado</option>}
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </SelectNativo>
              </Campo>
            ) : (
              <Campo rotulo="Custo do filamento (R$/kg)" nome="custo_kg_manual">
                <Input
                  id="custo_kg_manual"
                  inputMode="decimal"
                  value={f.custo_kg_manual}
                  onChange={set("custo_kg_manual")}
                  className="numeros"
                />
              </Campo>
            )}
            <Campo
              rotulo="Impressora"
              nome="impressora_id"
              dica={
                impressora && !impressora.custoHora
                  ? `Falta: ${impressora.faltam.join(", ")}`
                  : impressora?.custoHora
                    ? `R$ ${formatarNumero(impressora.custoHora.depreciacao + impressora.custoHora.manutencao + impressora.custoHora.consumiveis, 4)}/h de máquina, R$ ${formatarNumero(impressora.custoHora.energia, 4)}/h de energia`
                    : undefined
              }
            >
              <SelectNativo
                id="impressora_id"
                value={impressoraId}
                onChange={(e) => setImpressoraId(e.target.value)}
              >
                {impressoras.length === 0 && (
                  <option value="">Nenhuma impressora cadastrada</option>
                )}
                {impressoras.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                    {i.custoHora ? "" : " (incompleta)"}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
          </div>
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Mão de obra e complementares</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Preparo por ciclo (min)"
              nome="preparo_ciclo_min"
              dica="Trocar rolo, nivelar, iniciar."
            >
              <Input
                id="preparo_ciclo_min"
                inputMode="decimal"
                value={f.preparo_ciclo_min}
                onChange={set("preparo_ciclo_min")}
                className="numeros"
              />
            </Campo>
            <Campo rotulo="Acabamento por peça (min)" nome="acabamento_peca_min">
              <Input
                id="acabamento_peca_min"
                inputMode="decimal"
                value={f.acabamento_peca_min}
                onChange={set("acabamento_peca_min")}
                className="numeros"
              />
            </Campo>
            <Campo rotulo="Embalagem por peça (min)" nome="embalagem_peca_min">
              <Input
                id="embalagem_peca_min"
                inputMode="decimal"
                value={f.embalagem_peca_min}
                onChange={set("embalagem_peca_min")}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Mão de obra (R$/h)"
              nome="custo_hora_mao_obra"
              dica="Vem dos parâmetros; pode ajustar aqui."
            >
              <Input
                id="custo_hora_mao_obra"
                inputMode="decimal"
                value={f.custo_hora_mao_obra}
                onChange={set("custo_hora_mao_obra")}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Complementares por peça (R$)"
              nome="complementares_peca"
              dica="Ímã, parafuso, etiqueta."
            >
              <Input
                id="complementares_peca"
                inputMode="decimal"
                value={f.complementares_peca}
                onChange={set("complementares_peca")}
                className="numeros"
              />
            </Campo>
            <Campo
              rotulo="Complementares por pedido (R$)"
              nome="complementares_pedido"
              dica="Caixa de envio. Entra nos fixos por venda."
            >
              <Input
                id="complementares_pedido"
                inputMode="decimal"
                value={f.complementares_pedido}
                onChange={set("complementares_pedido")}
                className="numeros"
              />
            </Campo>
          </div>
          {parametros && (
            <p className="text-xs text-texto-3">
              Custo fixo:{" "}
              {parametros.metodo_rateio_fixo
                ? METODO_FIXO_ROTULO[parametros.metodo_rateio_fixo]
                : "não configurado"}
              {parametros.metodo_rateio_fixo === "hora" &&
                parametros.custo_fixo_mensal != null &&
                parametros.horas_produtivas_mes != null &&
                ` (${formatarMoeda(parametros.custo_fixo_mensal)} em ${formatarNumero(parametros.horas_produtivas_mes, 0)} h)`}
              {parametros.metodo_rateio_fixo === "peca" &&
                parametros.custo_fixo_mensal != null &&
                parametros.volume_mensal_estimado != null &&
                ` (${formatarMoeda(parametros.custo_fixo_mensal)} em ${formatarNumero(parametros.volume_mensal_estimado, 0)} peças)`}
              . Versão {versaoParametros ?? "?"} dos parâmetros.
              {desligados.length > 0 &&
                ` Desligados: ${desligados.map((d) => COMPONENTES_ROTULO[d]).join(", ")}.`}
            </p>
          )}
        </section>
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Canal e meta</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Canal de venda"
              nome="canal_id"
              dica={
                canal && !canal.taxas ? `Falta: ${canal.faltam.join(", ")}` : "Sem canal: só custo."
              }
            >
              <SelectNativo
                id="canal_id"
                value={canalId}
                onChange={(e) => setCanalId(e.target.value)}
              >
                <option value="">Sem canal (só custo)</option>
                {canais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.taxas ? "" : " (taxas incompletas)"}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <Campo rotulo="Margem alvo (%)" nome="margem_alvo" dica="Lucro sobre o preço.">
              <Input
                id="margem_alvo"
                inputMode="decimal"
                value={f.margem_alvo}
                onChange={set("margem_alvo")}
                className="numeros"
              />
            </Campo>
            <Campo rotulo="Markup (%)" nome="markup_alvo" dica="Lucro sobre o custo.">
              <Input
                id="markup_alvo"
                inputMode="decimal"
                value={f.markup_alvo}
                onChange={set("markup_alvo")}
                className="numeros"
              />
            </Campo>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        {"bloqueio" in montado && montado.bloqueio !== "parametros_incompletos" && (
          <Banner tipo="info" titulo="Ainda não dá para calcular">
            {erroPt(montado.bloqueio) ??
              (montado.bloqueio === "insumo_sem_custo"
                ? "O filamento escolhido não tem custo: confirme uma compra ou informe o custo por quilo."
                : montado.bloqueio === "impressora_obrigatoria"
                  ? "Escolha uma impressora."
                  : montado.bloqueio)}
          </Banner>
        )}
        {"avisos" in montado && montado.avisos.includes("imposto_nao_configurado") && (
          <Banner tipo="alerta" titulo="Imposto estimado não configurado">
            Sem a alíquota em Parâmetros de custo o preço por canal não é calculado. O custo abaixo
            continua válido.
          </Banner>
        )}
        {custo && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-card p-5 shadow-painel">
                <p className="text-[13px] text-texto-2">Custo por peça boa</p>
                <p className="numeros mt-1 text-[30px] leading-none font-semibold tracking-[-0.02em]">
                  {formatarMoeda(custo.custo_total, 4)}
                </p>
                <p className="mt-2 text-xs text-texto-3">
                  variável {formatarMoeda(custo.custo_variavel, 4)} + fixo{" "}
                  {formatarMoeda(custo.componentes.fixo_rateado, 4)}
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-painel">
                <p className="text-[13px] text-texto-2">Por peça boa</p>
                <p className="numeros mt-1 text-lg font-semibold">
                  {formatarNumero(custo.gramas_por_peca_boa, 1)} g ·{" "}
                  {formatarNumero(custo.horas_por_peca_boa * 60, 0)} min
                </p>
                <p className="mt-2 text-xs text-texto-3">
                  fator de falha {formatarNumero(custo.fator_falha, 4)} ·{" "}
                  {formatarNumero(custo.pecas_boas_por_tentativa, 2)} boas por tentativa
                </p>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-painel">
                <p className="text-[13px] text-texto-2">Taxas e fixos por venda</p>
                <p className="numeros mt-1 text-lg font-semibold">
                  {preco
                    ? `${formatarPercentual(preco.t, 2)} + ${formatarMoeda(preco.F)}`
                    : "Sem canal"}
                </p>
                <p className="mt-2 text-xs text-texto-3">
                  {preco
                    ? "percentuais sobre o preço e fixos por item"
                    : "escolha um canal para formar preço"}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-superficie-2/60 text-left text-[13px] text-texto-2">
                    <th className="h-10 px-5 font-medium">Componente</th>
                    <th className="h-10 px-4 text-right font-medium">R$ por peça</th>
                    <th className="h-10 px-4 text-right font-medium">Parte</th>
                  </tr>
                </thead>
                <tbody className="numeros">
                  {(Object.keys(custo.componentes) as (keyof ComponentesCusto)[]).map((k) => {
                    const v = custo.componentes[k];
                    const desligado = desligados.includes(k);
                    return (
                      <tr
                        key={k}
                        className={cn("border-t border-borda", desligado && "text-texto-3")}
                      >
                        <td className="px-5 py-2">
                          {COMPONENTES_ROTULO[k]}
                          {desligado && <span className="ml-2 text-xs">desligado</span>}
                        </td>
                        <td className="px-4 py-2 text-right">{formatarMoeda(v, 4)}</td>
                        <td className="px-4 py-2 text-right text-texto-2">
                          {custo.custo_total > 0
                            ? formatarPercentual(v / custo.custo_total, 1)
                            : "0 %"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {preco && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Cenario titulo="Equilíbrio" subtitulo="lucro zero" r={preco.equilibrio} />
            <Cenario
              titulo={`Margem ${f.margem_alvo || "?"} %`}
              subtitulo="lucro sobre o preço"
              r={preco.margem}
              destaque={metodo === "margem"}
            />
            <Cenario
              titulo={`Markup ${f.markup_alvo || "?"} %`}
              subtitulo="lucro sobre o custo"
              r={preco.markup}
              destaque={metodo === "markup"}
            />
          </div>
        )}
        {editar && resultado && "entradas" in montado && (
          <form
            action={acao}
            className="space-y-3 rounded-2xl bg-card p-5 shadow-painel"
            noValidate
          >
            <input type="hidden" name="entradas" value={JSON.stringify(montado.entradas)} />
            <input
              type="hidden"
              name="insumo_id"
              value={origemCusto === "insumo" ? insumoId : ""}
            />
            <input type="hidden" name="impressora_id" value={impressoraId} />
            <input type="hidden" name="canal_id" value={canalId} />
            <input type="hidden" name="parametros_versao" value={versaoParametros ?? ""} />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Campo rotulo="Nome do cálculo" nome="nome" erro={estado.erros.nome}>
                <Input
                  id="nome"
                  name="nome"
                  defaultValue={inicial?.nome ?? ""}
                  maxLength={120}
                  placeholder="Suporte de fone PLA preto, Shopee"
                />
              </Campo>
              <Campo rotulo="Preço sugerido pelo" nome="metodo_margem">
                <SelectNativo
                  id="metodo_margem"
                  name="metodo_margem"
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  disabled={!preco}
                >
                  <option value="margem">Margem alvo</option>
                  <option value="markup">Markup</option>
                  <option value="">Equilíbrio</option>
                </SelectNativo>
              </Campo>
            </div>
            <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
              <Textarea id="observacoes" name="observacoes" rows={2} maxLength={2000} />
            </Campo>
            <CampoErro chave={estado.erros._form} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando" : "Salvar cálculo"}
              </Button>
              {estado.ok && estado.id && (
                <Link
                  href={`/catalogo/precificacao/historico?destaque=${estado.id}`}
                  className="text-sm text-acao hover:underline"
                >
                  Ver no histórico
                </Link>
              )}
              <span className="text-xs text-texto-3">
                O servidor recalcula e grava entradas e resultado; nada muda depois.
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Cenario({
  titulo,
  subtitulo,
  r,
  destaque = false,
}: {
  titulo: string;
  subtitulo: string;
  r: ResultadoPreco | null;
  destaque?: boolean;
}) {
  return (
    <section
      className={cn("rounded-2xl bg-card p-5 shadow-painel", destaque && "ring-1 ring-acao")}
      aria-label={titulo}
    >
      <p className="text-[13px] font-medium text-texto-2">{titulo}</p>
      <p className="text-xs text-texto-3">{subtitulo}</p>
      {!r ? (
        <p className="numeros mt-2 text-lg text-texto-3">Sem meta</p>
      ) : r.viavel ? (
        <>
          <p className="numeros mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em]">
            {formatarMoeda(r.preco)}
          </p>
          <dl className="numeros mt-3 space-y-1 text-xs text-texto-2">
            <div className="flex justify-between">
              <dt>Lucro</dt>
              <dd className="text-texto">{formatarMoeda(r.avaliacao.lucro)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Margem</dt>
              <dd className="text-texto">{formatarPercentual(r.avaliacao.margem, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Markup efetivo</dt>
              <dd className="text-texto">{formatarPercentual(r.avaliacao.markup_efetivo, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxas e fixos</dt>
              <dd className="text-texto">{formatarMoeda(r.avaliacao.taxas_no_preco)}</dd>
            </div>
          </dl>
          {r.aviso === "margem_sensivel" && (
            <Badge variant="outline" className="mt-3 border-alerta/40 text-alerta">
              Margem sensível: pouca folga nas taxas
            </Badge>
          )}
        </>
      ) : (
        <div className="mt-2 space-y-2">
          <Badge variant="outline" className="border-erro/40 text-erro">
            Inviável
          </Badge>
          <p className="text-xs text-texto-2">{MOTIVO_INVIAVEL_ROTULO[r.motivo]}</p>
          <p className="numeros text-xs text-texto-3">
            Percentuais somam {formatarPercentual(r.soma_percentuais, 1)}; margem máxima (exclusiva){" "}
            {formatarPercentual(r.margem_maxima_exclusiva, 1)}.
          </p>
        </div>
      )}
    </section>
  );
}
