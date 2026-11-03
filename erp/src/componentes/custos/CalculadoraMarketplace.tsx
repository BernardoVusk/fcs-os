"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { custoProducaoRapido, validarCustoRapido } from "@/dominio/custos/custo-rapido";
import {
  calcularRoas,
  equilibrioComFaixas,
  faixaManual,
  precoComFaixas,
  resolverFaixas,
  type EntradaMarketplace,
  type FaixaResolvida,
  type OpcoesPlataforma,
} from "@/dominio/precos/marketplace";
import {
  PLATAFORMAS,
  PLATAFORMA_POR_ID,
  type IdPlataforma,
} from "@/dominio/precos/tabelas-marketplace";
import { erroPt } from "@/lib/erros-pt";
import { formatarNumero, lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Switch } from "@/componentes/ui/switch";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Campo } from "@/componentes/painel/Campo";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { Banner } from "@/componentes/painel/Banner";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OpcaoFilamento = { id: string; nome: string; custo_kg: number | null };
export type OpcaoImpressoraRapida = {
  id: string;
  nome: string;
  energia_hora: number;
  maquina_hora: number;
};
export type OpcaoEmbalagem = {
  id: string;
  nome: string;
  custo_unitario: number | null;
  unidade: string | null;
};

type Props = {
  filamentos: OpcaoFilamento[];
  impressoras: OpcaoImpressoraRapida[];
  embalagens: OpcaoEmbalagem[];
  /** Fração, de Parâmetros de custo. */
  impostoPadrao: number | null;
};

type LinhaEmbalagem = { chave: string; nome: string; quantidade: string; custo: string };

type Campos = {
  horas: string;
  gramas: string;
  filamento_id: string;
  filamento_kg: string;
  impressora_id: string;
  energia_hora: string;
  maquina_hora: string;
  falha: string;
  acabamento: string;
  pintura: string;
  fixacao: string;
  extras: string;
  embalagem: LinhaEmbalagem[];
  plataforma: IdPlataforma;
  comissao_categoria: string;
  envio_ml: "flex" | "coleta";
  taxas_manuais: boolean;
  comissao_manual: string;
  fixo_manual: string;
  imposto: string;
  extras_pedido: string;
  custo_manual: string;
  margem: number;
  margem_pos: number;
};

type CampoTexto = { [K in keyof Campos]: Campos[K] extends string ? K : never }[keyof Campos];

const CHAVE_SALVA = "fcs-erp:calculadora:v1";
const MARGEM_MAX = 70;

function camposIniciais(impostoPadrao: number | null): Campos {
  return {
    horas: "",
    gramas: "",
    filamento_id: "",
    filamento_kg: "",
    impressora_id: "",
    energia_hora: "",
    maquina_hora: "",
    falha: "",
    acabamento: "",
    pintura: "",
    fixacao: "",
    extras: "",
    embalagem: [],
    plataforma: "shopee",
    comissao_categoria: "",
    envio_ml: "flex",
    taxas_manuais: false,
    comissao_manual: "",
    fixo_manual: "",
    imposto: impostoPadrao == null ? "" : numeroParaCampo(impostoPadrao * 100, 4),
    extras_pedido: "",
    custo_manual: "",
    margem: 30,
    margem_pos: 10,
  };
}

/** Vazio conta como zero; texto que não é número vira NaN para a validação pegar. */
const num = (s: string) => (s.trim() === "" ? 0 : (lerNumeroPt(s) ?? Number.NaN));
const fracao = (s: string) => num(s) / 100;
const pct = (v: number) => formatarPercentual(v, Math.round(v * 1000) % 10 === 0 ? 0 : 1);
const data = (iso: string) => iso.split("-").reverse().join("/");

function rotuloFaixa(f: FaixaResolvida) {
  if (f.ate == null) return f.de === 0 ? "qualquer preço" : `a partir de ${formatarMoeda(f.de)}`;
  return f.de === 0
    ? `até ${formatarMoeda(f.ate)}`
    : `de ${formatarMoeda(f.de)} a ${formatarMoeda(f.ate)}`;
}
function rotuloTaxa(f: FaixaResolvida) {
  if (f.comissao_pct === 0 && f.fixo === 0) return "sem taxa";
  const fixo = f.fixo === "metade_do_preco" ? "metade do preço" : formatarMoeda(f.fixo);
  return `${pct(f.comissao_pct)} + ${fixo} por item`;
}

/** Último preenchimento salvo no navegador, por cima dos padrões. */
function camposSalvos(impostoPadrao: number | null): Campos {
  const padrao = camposIniciais(impostoPadrao);
  try {
    const salvo = localStorage.getItem(CHAVE_SALVA);
    if (!salvo) return padrao;
    const lido = JSON.parse(salvo) as Partial<Campos>;
    return lido.plataforma && lido.plataforma in PLATAFORMA_POR_ID
      ? { ...padrao, ...lido }
      : padrao;
  } catch {
    return padrao;
  }
}

const nada = () => () => {};

/** O formulário monta só no navegador, onde o último preenchimento está guardado. */
export function CalculadoraMarketplace(props: Props) {
  const noNavegador = useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
  if (!noNavegador)
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  return <Calculadora {...props} />;
}

function Calculadora({ filamentos, impressoras, embalagens, impostoPadrao }: Props) {
  const [f, setF] = useState<Campos>(() => camposSalvos(impostoPadrao));

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_SALVA, JSON.stringify(f));
    } catch {}
  }, [f]);

  const set = (k: CampoTexto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((a) => ({ ...a, [k]: e.target.value }));
  const mudarLinha = (chave: string, k: keyof LinhaEmbalagem, v: string) =>
    setF((a) => ({
      ...a,
      embalagem: a.embalagem.map((l) => (l.chave === chave ? { ...l, [k]: v } : l)),
    }));
  const adicionarEmbalagem = (id: string) => {
    if (!id) return;
    const item = embalagens.find((e) => e.id === id);
    setF((a) => ({
      ...a,
      embalagem: [
        ...a.embalagem,
        {
          chave: crypto.randomUUID(),
          nome: item?.nome ?? "",
          quantidade: "1",
          custo: numeroParaCampo(item?.custo_unitario ?? null, 4),
        },
      ],
    }));
  };
  const escolherFilamento = (id: string) => {
    const fil = filamentos.find((x) => x.id === id);
    setF((a) => ({
      ...a,
      filamento_id: id,
      filamento_kg: fil?.custo_kg != null ? numeroParaCampo(fil.custo_kg, 2) : a.filamento_kg,
    }));
  };
  const escolherImpressora = (id: string) => {
    const imp = impressoras.find((x) => x.id === id);
    setF((a) => ({
      ...a,
      impressora_id: id,
      energia_hora: imp ? numeroParaCampo(imp.energia_hora, 4) : a.energia_hora,
      maquina_hora: imp ? numeroParaCampo(imp.maquina_hora, 4) : a.maquina_hora,
    }));
  };
  const limpar = () => {
    try {
      localStorage.removeItem(CHAVE_SALVA);
    } catch {}
    setF(camposIniciais(impostoPadrao));
  };

  const plataforma = PLATAFORMA_POR_ID[f.plataforma];
  const margem = f.margem / 100;
  const margemPos = Math.max(0, Math.min(f.margem_pos, f.margem - 1)) / 100;

  const calculo = useMemo(() => {
    const entradasCusto = {
      horas: num(f.horas),
      gramas: num(f.gramas),
      filamento_kg: num(f.filamento_kg),
      energia_hora: num(f.energia_hora),
      maquina_hora: num(f.maquina_hora),
      falha: fracao(f.falha),
      acabamento: num(f.acabamento),
      pintura: num(f.pintura),
      fixacao: num(f.fixacao),
      extras: num(f.extras),
      embalagem: f.embalagem.map((l) => ({
        quantidade: num(l.quantidade),
        custo_unitario: num(l.custo),
      })),
    };
    const erros = validarCustoRapido(entradasCusto);
    const custo = erros.length === 0 ? custoProducaoRapido(entradasCusto) : null;

    const custoManual = f.custo_manual.trim() === "" ? null : num(f.custo_manual);
    const custoUsado = custoManual ?? (custo ? custo.total_exato : null);
    const entrada: EntradaMarketplace | null =
      custoUsado == null || Number.isNaN(Number(custoUsado))
        ? null
        : {
            custo: custoUsado,
            imposto_pct: fracao(f.imposto),
            extras_pedido: num(f.extras_pedido),
          };
    const taxasValidas = [entrada?.imposto_pct, entrada?.extras_pedido].every(
      (v) => v == null || v >= 0,
    );
    const opcoes = (id: IdPlataforma): OpcoesPlataforma => ({
      comissao_categoria:
        id === f.plataforma && f.comissao_categoria.trim() !== ""
          ? fracao(f.comissao_categoria)
          : null,
      cobrar_fixo: f.envio_ml === "flex",
    });
    const faixas = f.taxas_manuais
      ? faixaManual(fracao(f.comissao_manual), num(f.fixo_manual))
      : resolverFaixas(plataforma, opcoes(f.plataforma));
    const faixasValidas = faixas.every(
      (x) => x.comissao_pct >= 0 && (x.fixo === "metade_do_preco" || x.fixo >= 0),
    );
    const pode = entrada != null && Number(entrada.custo) > 0 && taxasValidas && faixasValidas;
    const preco = pode ? precoComFaixas(entrada, faixas, margem) : null;
    const equilibrio = pode ? equilibrioComFaixas(entrada, faixas) : null;
    const roas = preco?.viavel ? calcularRoas(preco.preco, preco.detalhe.lucro, margemPos) : null;
    const comparacao =
      pode && !f.taxas_manuais
        ? PLATAFORMAS.map((p) => ({
            p,
            r: precoComFaixas(entrada, resolverFaixas(p, opcoes(p.id)), margem),
          }))
        : [];
    return {
      erros,
      custo,
      faixas,
      preco,
      equilibrio,
      roas,
      comparacao,
      semCusto: entrada == null || Number(entrada.custo) <= 0,
      taxasInvalidas: !taxasValidas || !faixasValidas,
    };
  }, [f, plataforma, margem, margemPos]);

  const { custo, preco, roas } = calculo;
  const temNumeroInvalido = [
    f.horas,
    f.gramas,
    f.filamento_kg,
    f.energia_hora,
    f.maquina_hora,
    f.falha,
    f.acabamento,
    f.pintura,
    f.fixacao,
    f.extras,
    ...f.embalagem.flatMap((l) => [l.quantidade, l.custo]),
  ].some((s) => Number.isNaN(num(s)));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Custo de produção</h2>
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>
              Limpar tudo
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero
              rotulo="Tempo de impressão (horas)"
              nome="horas"
              dica="Do fatiador."
              valor={f.horas}
              onChange={set("horas")}
            />
            <CampoNumero
              rotulo="Material (gramas)"
              nome="gramas"
              dica="Do fatiador, com suportes."
              valor={f.gramas}
              onChange={set("gramas")}
            />
            <Campo
              rotulo="Filamento"
              nome="filamento_id"
              dica={
                filamentos.length === 0
                  ? "Nenhum filamento no estoque: digite o preço ao lado."
                  : "Preenche o preço por quilo."
              }
            >
              <SelectNativo
                id="filamento_id"
                value={f.filamento_id}
                onChange={(e) => escolherFilamento(e.target.value)}
              >
                <option value="">Digitar o preço</option>
                {filamentos.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                    {x.custo_kg == null ? " (sem custo)" : ""}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <CampoNumero
              rotulo="Filamento (R$ por kg)"
              nome="filamento_kg"
              dica="Com frete."
              valor={f.filamento_kg}
              onChange={set("filamento_kg")}
            />
            <Campo
              rotulo="Impressora"
              nome="impressora_id"
              dica={
                impressoras.length === 0
                  ? "Nenhuma impressora com custos completos: digite os valores por hora."
                  : "Preenche energia e máquina por hora."
              }
            >
              <SelectNativo
                id="impressora_id"
                value={f.impressora_id}
                onChange={(e) => escolherImpressora(e.target.value)}
              >
                <option value="">Digitar os valores</option>
                {impressoras.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <CampoNumero
              rotulo="Falhas (%)"
              nome="falha"
              dica="Impressões perdidas a cada 100."
              valor={f.falha}
              onChange={set("falha")}
            />
            <CampoNumero
              rotulo="Energia (R$ por hora)"
              nome="energia_hora"
              valor={f.energia_hora}
              onChange={set("energia_hora")}
            />
            <CampoNumero
              rotulo="Máquina (R$ por hora)"
              nome="maquina_hora"
              dica="Retorno do investimento e manutenção."
              valor={f.maquina_hora}
              onChange={set("maquina_hora")}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Acabamento e embalagem</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero
              rotulo="Acabamento (R$)"
              nome="acabamento"
              valor={f.acabamento}
              onChange={set("acabamento")}
            />
            <CampoNumero
              rotulo="Pintura (R$)"
              nome="pintura"
              valor={f.pintura}
              onChange={set("pintura")}
            />
            <CampoNumero
              rotulo="Fixação e cola (R$)"
              nome="fixacao"
              valor={f.fixacao}
              onChange={set("fixacao")}
            />
            <CampoNumero
              rotulo="Extras (R$)"
              nome="extras"
              dica="Parafusos, argola de chaveiro."
              valor={f.extras}
              onChange={set("extras")}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Embalagem</p>
            {f.embalagem.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_56px_84px_auto] gap-2 text-xs text-texto-3">
                <span>Item</span>
                <span>Qtd.</span>
                <span>R$ unidade</span>
                <span className="w-8" />
              </div>
            )}
            {f.embalagem.map((l) => (
              <div
                key={l.chave}
                className="grid grid-cols-[minmax(0,1fr)_56px_84px_auto] items-center gap-2"
              >
                <Input
                  aria-label="Item"
                  value={l.nome}
                  onChange={(e) => mudarLinha(l.chave, "nome", e.target.value)}
                  placeholder="Caixa, plástico bolha"
                />
                <Input
                  aria-label="Quantidade"
                  inputMode="decimal"
                  className="numeros"
                  value={l.quantidade}
                  onChange={(e) => mudarLinha(l.chave, "quantidade", e.target.value)}
                />
                <Input
                  aria-label="Custo por unidade"
                  inputMode="decimal"
                  className="numeros"
                  value={l.custo}
                  onChange={(e) => mudarLinha(l.chave, "custo", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover item"
                  onClick={() =>
                    setF((a) => ({
                      ...a,
                      embalagem: a.embalagem.filter((x) => x.chave !== l.chave),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <SelectNativo
              aria-label="Adicionar item de embalagem"
              value=""
              onChange={(e) => adicionarEmbalagem(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value="">Adicionar item de embalagem</option>
              <option value="avulso">Item avulso</option>
              {embalagens.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                  {x.custo_unitario == null ? " (sem custo)" : ""}
                </option>
              ))}
            </SelectNativo>
          </div>
        </section>

        {(calculo.erros.length > 0 || temNumeroInvalido) && (
          <Banner tipo="erro" titulo="Confira os números">
            {temNumeroInvalido ? erroPt("numero_invalido") : erroPt(calculo.erros[0])}
          </Banner>
        )}
        {custo && (
          <section className="rounded-2xl bg-card p-5 shadow-painel">
            <p className="text-[13px] text-texto-2">Custo de produção por peça</p>
            <p
              className="numeros mt-1 text-[30px] leading-none font-semibold tracking-[-0.02em]"
              data-testid="custo-total"
            >
              {formatarMoeda(custo.total)}
            </p>
            <dl className="numeros mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              <Linha rotulo="Material" valor={custo.material} />
              <Linha rotulo="Energia" valor={custo.energia} />
              <Linha rotulo="Máquina" valor={custo.maquina} />
              <Linha rotulo="Falhas" valor={custo.falhas} />
              <Linha
                rotulo="Acabamento e extras"
                valor={custo.acabamento + custo.pintura + custo.fixacao + custo.extras}
              />
              <Linha rotulo="Embalagem" valor={custo.embalagem} />
            </dl>
          </section>
        )}
      </div>

      <div className="space-y-4">
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Plataforma</h2>
          <div
            role="group"
            aria-label="Plataforma"
            className="flex flex-wrap gap-1 rounded-2xl bg-superficie-2 p-1"
          >
            {PLATAFORMAS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === f.plataforma}
                onClick={() => setF((a) => ({ ...a, plataforma: p.id, comissao_categoria: "" }))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
                  p.id === f.plataforma
                    ? "bg-card font-medium text-texto shadow-painel"
                    : "text-texto-2 hover:text-texto",
                )}
              >
                {p.nome}
              </button>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            {preco?.viavel ? (
              <p>
                Taxa aplicada:{" "}
                <span className="numeros font-medium" data-testid="taxa-aplicada">
                  {rotuloTaxa(preco.faixa)}
                </span>
                {calculo.faixas.length > 1 && `, faixa ${rotuloFaixa(preco.faixa)}`}.
              </p>
            ) : (
              <p className="text-texto-2">
                {calculo.faixas.length > 1
                  ? "A taxa depende da faixa de preço."
                  : `Taxa: ${rotuloTaxa(calculo.faixas[0])}.`}
              </p>
            )}
            {!f.taxas_manuais && (
              <p className="text-xs text-texto-3">
                {plataforma.fonte
                  ? `Fonte: ${plataforma.fonte}, conferida em ${data(plataforma.conferido_em!)}. `
                  : ""}
                {plataforma.observacao}
              </p>
            )}
            {!f.taxas_manuais && calculo.faixas.length > 1 && (
              <details className="text-xs text-texto-2">
                <summary className="cursor-pointer text-acao">Ver todas as faixas</summary>
                <table className="numeros mt-2 w-full">
                  <tbody>
                    {calculo.faixas.map((x) => (
                      <tr key={x.de} className="border-t border-borda">
                        <td className="py-1 pr-3">{rotuloFaixa(x)}</td>
                        <td className="py-1 text-right">{rotuloTaxa(x)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="taxas_manuais"
              checked={f.taxas_manuais}
              onCheckedChange={(v) => setF((a) => ({ ...a, taxas_manuais: v }))}
            />
            <Label htmlFor="taxas_manuais">Digitar a comissão e o fixo à mão</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {f.taxas_manuais ? (
              <>
                <CampoNumero
                  rotulo="Comissão (%)"
                  nome="comissao_manual"
                  valor={f.comissao_manual}
                  onChange={set("comissao_manual")}
                />
                <CampoNumero
                  rotulo="Fixo por item (R$)"
                  nome="fixo_manual"
                  valor={f.fixo_manual}
                  onChange={set("fixo_manual")}
                />
              </>
            ) : (
              plataforma.comissao_categoria && (
                <>
                  <CampoNumero
                    rotulo="Comissão da categoria (%)"
                    nome="comissao_categoria"
                    dica={`Entre ${pct(plataforma.comissao_categoria.min)} e ${pct(plataforma.comissao_categoria.max)}. Vazio usa ${pct(plataforma.comissao_categoria.padrao)}.`}
                    valor={f.comissao_categoria}
                    onChange={set("comissao_categoria")}
                  />
                  <Campo
                    rotulo="Forma de envio"
                    nome="envio_ml"
                    dica="O fixo abaixo de R$ 79 só vale em Flex ou envio próprio."
                  >
                    <SelectNativo id="envio_ml" value={f.envio_ml} onChange={set("envio_ml")}>
                      <option value="flex">Flex ou envio próprio</option>
                      <option value="coleta">Coleta, Agência ou Full</option>
                    </SelectNativo>
                  </Campo>
                </>
              )
            )}
            <CampoNumero
              rotulo="Imposto (%)"
              nome="imposto"
              dica={
                impostoPadrao == null
                  ? "Sem imposto em Parâmetros de custo."
                  : "Padrão de Parâmetros de custo."
              }
              valor={f.imposto}
              onChange={set("imposto")}
            />
            <CampoNumero
              rotulo="Frete e outros por pedido (R$)"
              nome="extras_pedido"
              dica="Frete que você paga, brinde."
              valor={f.extras_pedido}
              onChange={set("extras_pedido")}
            />
            <CampoNumero
              rotulo="Custo de produção (R$)"
              nome="custo_manual"
              dica={
                custo
                  ? `Vazio usa o calculado: ${formatarMoeda(custo.total)}.`
                  : "Vazio usa o custo calculado."
              }
              valor={f.custo_manual}
              onChange={set("custo_manual")}
            />
          </div>

          <Deslizante
            id="margem"
            rotulo="Margem de lucro"
            valor={f.margem}
            max={MARGEM_MAX}
            onChange={(v) => setF((a) => ({ ...a, margem: v }))}
          />
        </section>

        {calculo.taxasInvalidas && (
          <Banner tipo="erro" titulo="Confira as taxas">
            Comissão, fixo, imposto e frete não podem ser negativos.
          </Banner>
        )}
        {calculo.semCusto && !calculo.taxasInvalidas && (
          <Banner tipo="info" titulo="Falta o custo">
            Preencha o custo de produção ao lado, ou digite o custo direto no campo da plataforma.
          </Banner>
        )}
        {preco && !preco.viavel && (
          <Banner tipo="alerta" titulo="Essa margem não fecha">
            Com essas taxas nenhum preço chega a {f.margem} % de margem. Baixe a margem, o imposto
            ou o frete.
          </Banner>
        )}
        {preco?.viavel && (
          <section className="rounded-2xl bg-card p-5 shadow-painel">
            <p className="text-[13px] text-texto-2">Preço de venda em {plataforma.nome}</p>
            <p
              className="numeros mt-1 text-[34px] leading-none font-semibold tracking-[-0.02em]"
              data-testid="preco-venda"
            >
              {formatarMoeda(preco.preco)}
            </p>
            <p className="numeros mt-2 text-sm text-texto-2">
              Lucro de{" "}
              <span className="font-medium text-sucesso">{formatarMoeda(preco.detalhe.lucro)}</span>{" "}
              por venda, margem de {formatarPercentual(preco.detalhe.margem)}.
            </p>
            {preco.no_piso_da_faixa && (
              <p className="mt-2 text-xs text-texto-3">
                O preço da meta caiu entre duas faixas: {formatarMoeda(preco.preco)} é o menor preço
                que chega lá, por isso a margem passa de {f.margem} %.
              </p>
            )}
            <dl className="numeros mt-4 space-y-1.5 border-t border-borda pt-4 text-sm">
              <Linha rotulo="Custo de produção" valor={preco.detalhe.custo} />
              <Linha
                rotulo={`Comissão (${pct(preco.faixa.comissao_pct)})`}
                valor={preco.detalhe.comissao}
              />
              <Linha rotulo="Fixo por item" valor={preco.detalhe.fixo} />
              <Linha rotulo={`Imposto (${pct(fracao(f.imposto))})`} valor={preco.detalhe.imposto} />
              <Linha rotulo="Frete e outros" valor={preco.detalhe.extras_pedido} />
              <Linha rotulo="Lucro" valor={preco.detalhe.lucro} forte />
            </dl>
            {calculo.equilibrio?.viavel && (
              <p className="mt-3 text-xs text-texto-3">
                Equilíbrio em {formatarMoeda(calculo.equilibrio.preco)}: abaixo disso a venda dá
                prejuízo.
              </p>
            )}
          </section>
        )}

        {preco?.viavel && roas && (
          <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
            <div>
              <h2 className="text-base font-semibold">Anúncio</h2>
              <p className="mt-1 text-xs text-texto-3">
                ROAS é receita dividida pelo gasto no anúncio. ACOS é o inverso, que é o que o
                Mercado Livre mostra.
              </p>
            </div>
            <Deslizante
              id="margem_pos"
              rotulo="Margem que quero manter depois do anúncio"
              valor={Math.min(f.margem_pos, Math.max(0, f.margem - 1))}
              max={Math.max(0, f.margem - 1)}
              onChange={(v) => setF((a) => ({ ...a, margem_pos: v }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] text-texto-2">ROAS mínimo</p>
                <p
                  className="numeros mt-1 text-[30px] leading-none font-semibold"
                  data-testid="roas-minimo"
                >
                  {roas.minimo == null ? "Não fecha" : formatarNumero(roas.minimo, 2)}
                </p>
                <p className="mt-2 text-xs text-texto-3">
                  {roas.minimo == null
                    ? "Sem lucro antes do anúncio."
                    : `Empata: gasto de até ${formatarMoeda(roas.gasto_maximo)} por venda, ACOS de até ${formatarPercentual(roas.acos_maximo)}.`}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-texto-2">ROAS ideal</p>
                <p
                  className="numeros mt-1 text-[30px] leading-none font-semibold text-acao"
                  data-testid="roas-ideal"
                >
                  {roas.ideal == null ? "Não fecha" : formatarNumero(roas.ideal, 2)}
                </p>
                <p className="mt-2 text-xs text-texto-3">
                  {roas.ideal == null
                    ? "Suba a margem de lucro ou baixe a margem pós-anúncio."
                    : `Mantém ${formatarPercentual(margemPos, 0)}: gasto de até ${formatarMoeda(roas.gasto_ideal)} por venda, ACOS de até ${formatarPercentual(roas.acos_ideal)}.`}
                </p>
              </div>
            </div>
          </section>
        )}

        {calculo.comparacao.length > 0 && (
          <section className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <p className="px-5 pt-4 text-sm font-semibold">
              Com {f.margem} % de margem em cada plataforma
            </p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="bg-superficie-2/60 text-left text-[13px] text-texto-2">
                  <th className="h-10 px-5 font-medium">Plataforma</th>
                  <th className="h-10 px-4 text-right font-medium">Preço</th>
                  <th className="h-10 px-4 text-right font-medium">Lucro</th>
                  <th className="hidden h-10 px-5 text-right font-medium sm:table-cell">Taxa</th>
                </tr>
              </thead>
              <tbody className="numeros">
                {calculo.comparacao.map(({ p, r }) => (
                  <tr
                    key={p.id}
                    className={cn("border-t border-borda", p.id === f.plataforma && "font-medium")}
                  >
                    <td className="px-5 py-2">{p.nome}</td>
                    <td className="px-4 py-2 text-right">
                      {r.viavel ? formatarMoeda(r.preco) : "Não fecha"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.viavel ? formatarMoeda(r.detalhe.lucro) : ""}
                    </td>
                    <td className="hidden px-5 py-2 text-right text-texto-2 sm:table-cell">
                      {r.viavel ? rotuloTaxa(r.faixa) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

function CampoNumero({
  rotulo,
  nome,
  dica,
  valor,
  onChange,
}: {
  rotulo: string;
  nome: string;
  dica?: string;
  valor: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Campo rotulo={rotulo} nome={nome} dica={dica}>
      <Input id={nome} inputMode="decimal" value={valor} onChange={onChange} className="numeros" />
    </Campo>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", forte && "font-semibold")}>
      <dt className={forte ? undefined : "text-texto-2"}>{rotulo}</dt>
      <dd>{formatarMoeda(valor)}</dd>
    </div>
  );
}

function Deslizante({
  id,
  rotulo,
  valor,
  max,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const limitar = (v: number) => Math.max(0, Math.min(max, Math.round(v)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{rotulo}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            aria-label={`${rotulo} (%)`}
            inputMode="numeric"
            className="numeros h-8 w-16 text-right"
            value={String(valor)}
            onChange={(e) => {
              const v = e.target.value.trim() === "" ? 0 : lerNumeroPt(e.target.value);
              if (v != null) onChange(limitar(v));
            }}
          />
          <span className="text-sm text-texto-2">%</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-acao"
      />
    </div>
  );
}
