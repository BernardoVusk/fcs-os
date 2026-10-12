"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { salvarCompra } from "@/acoes/estoque/compras";
import { landedPorLinha } from "@/dominio/estoque/rateio";
import { quantidadeBaseDaLinha, type Unidade } from "@/dominio/estoque/conversao";
import type { InsumoResumo } from "@/dados/estoque/insumos";
import type { CompraDetalhe } from "@/dados/estoque/compras";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarQuantidade, lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/formatos/moeda";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

type Linha = {
  chave: string;
  insumo_id: string;
  quantidade: string;
  unidade: string;
  preco_unitario: string;
  desconto_item: string;
  peso_util_g: string;
  lote_codigo: string;
};

const novaChave = () => Math.random().toString(36).slice(2, 9);
const n = (v: number | null | undefined, casas = 2) => numeroParaCampo(v, casas);

function linhaVazia(): Linha {
  return {
    chave: novaChave(),
    insumo_id: "",
    quantidade: "1",
    unidade: "un",
    preco_unitario: "",
    desconto_item: "",
    peso_util_g: "",
    lote_codigo: "",
  };
}

function pesoPadrao(insumo: InsumoResumo | undefined): string {
  const a = (insumo?.atributos ?? {}) as { peso_util_padrao_g?: number | null };
  return a.peso_util_padrao_g ? n(a.peso_util_padrao_g, 0) : "";
}

export function FormCompra({
  fornecedores,
  insumos,
  unidades,
  compra,
}: {
  fornecedores: { id: string; nome: string }[];
  insumos: InsumoResumo[];
  unidades: Unidade[];
  compra?: CompraDetalhe;
}) {
  const [estado, acao, pendente] = useActionState(salvarCompra, FORM_INICIAL);
  const [itens, setItens] = useState<Linha[]>(() =>
    compra && compra.itens.length > 0
      ? compra.itens.map((i) => ({
          chave: novaChave(),
          insumo_id: i.insumo_id,
          quantidade: n(Number(i.quantidade), 3),
          unidade: i.unidade,
          preco_unitario: n(Number(i.preco_unitario), 2),
          desconto_item: Number(i.desconto_item) > 0 ? n(Number(i.desconto_item), 2) : "",
          peso_util_g: i.peso_util_g == null ? "" : n(Number(i.peso_util_g), 0),
          lote_codigo: i.lote_codigo ?? "",
        }))
      : [linhaVazia()],
  );
  const [cab, setCab] = useState({
    frete: compra ? n(Number(compra.frete)) : "",
    desconto_total: compra ? n(Number(compra.desconto_total)) : "",
    outros_custos: compra ? n(Number(compra.outros_custos)) : "",
    preco_inclui_frete: compra?.preco_inclui_frete ?? false,
    metodo_rateio: (compra?.metodo_rateio ?? "valor") as "valor" | "quantidade",
  });

  function alterar(chave: string, mudanca: Partial<Linha>) {
    setItens((lista) => lista.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }
  function trocarInsumo(chave: string, insumoId: string) {
    const insumo = insumos.find((i) => i.id === insumoId);
    const filamento = insumo?.tipo === "filamento";
    alterar(chave, {
      insumo_id: insumoId,
      unidade: filamento ? "un" : (insumo?.unidade_base ?? "un"),
      peso_util_g: filamento ? pesoPadrao(insumo) : "",
    });
  }

  // Prévia do custo de aquisição com as mesmas regras do banco (rateio por valor, resíduo na maior linha).
  const calculo = itens.map((l) => {
    const insumo = insumos.find((i) => i.id === l.insumo_id);
    const qtd = lerNumeroPt(l.quantidade) ?? 0;
    const preco = lerNumeroPt(l.preco_unitario) ?? 0;
    const desc = lerNumeroPt(l.desconto_item) ?? 0;
    const base = insumo
      ? quantidadeBaseDaLinha(
          { quantidade: qtd, unidade: l.unidade, pesoUtilG: lerNumeroPt(l.peso_util_g) },
          insumo,
          unidades,
        )
      : null;
    return {
      id: l.chave,
      valor: qtd * preco - desc,
      quantidade: qtd,
      descontoItem: desc,
      quantidadeBase: base ?? 0,
      insumo,
      base,
    };
  });
  const landed = landedPorLinha(calculo, {
    frete: lerNumeroPt(cab.frete) ?? 0,
    descontoTotal: lerNumeroPt(cab.desconto_total) ?? 0,
    outrosCustos: lerNumeroPt(cab.outros_custos) ?? 0,
    precoIncluiFrete: cab.preco_inclui_frete,
    metodo: cab.metodo_rateio,
  });
  const totalLinhas = calculo.reduce((acc, c) => acc + c.valor, 0);
  const totalLanded = Object.values(landed).reduce((acc, l) => acc + l.landed, 0);
  const itensJson = JSON.stringify(
    itens.map((l) => ({
      insumo_id: l.insumo_id,
      quantidade: lerNumeroPt(l.quantidade),
      unidade: l.unidade,
      preco_unitario: lerNumeroPt(l.preco_unitario),
      desconto_item: lerNumeroPt(l.desconto_item) ?? 0,
      peso_util_g: lerNumeroPt(l.peso_util_g),
      lote_codigo: l.lote_codigo.trim() || null,
    })),
  );
  const erroLinha = (idx: number) => {
    const chave = Object.keys(estado.erros).find((k) => k.startsWith(`itens.${idx}.`));
    return chave ? erroPt(estado.erros[chave]) : undefined;
  };

  return (
    <form action={acao} className="space-y-6" noValidate>
      {compra && <input type="hidden" name="id" value={compra.id} />}
      <input type="hidden" name="itens" value={itensJson} />
      <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-painel sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Fornecedor" nome="fornecedor_id" erro={estado.erros.fornecedor_id}>
          <SelectNativo
            id="fornecedor_id"
            name="fornecedor_id"
            defaultValue={compra?.fornecedor_id ?? ""}
          >
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Data" nome="data" erro={estado.erros.data}>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={compra?.data ?? hojeSaoPaulo()}
            required
          />
        </Campo>
        <Campo
          rotulo="Documento ou pedido"
          nome="numero_documento"
          erro={estado.erros.numero_documento}
        >
          <Input
            id="numero_documento"
            name="numero_documento"
            defaultValue={compra?.numero_documento ?? ""}
            maxLength={60}
            placeholder="NF, número do pedido"
          />
        </Campo>
        <Campo rotulo="Rateio" nome="metodo_rateio" erro={estado.erros.metodo_rateio}>
          <SelectNativo
            id="metodo_rateio"
            name="metodo_rateio"
            value={cab.metodo_rateio}
            onChange={(e) =>
              setCab({ ...cab, metodo_rateio: e.target.value as "valor" | "quantidade" })
            }
          >
            <option value="valor">Por valor da linha</option>
            <option value="quantidade">Por quantidade</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Frete (R$)" nome="frete" erro={estado.erros.frete}>
          <Input
            id="frete"
            name="frete"
            inputMode="decimal"
            value={cab.frete}
            onChange={(e) => setCab({ ...cab, frete: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Desconto do pedido (R$)"
          nome="desconto_total"
          erro={estado.erros.desconto_total}
        >
          <Input
            id="desconto_total"
            name="desconto_total"
            inputMode="decimal"
            value={cab.desconto_total}
            onChange={(e) => setCab({ ...cab, desconto_total: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Outros encargos (R$)" nome="outros_custos" erro={estado.erros.outros_custos}>
          <Input
            id="outros_custos"
            name="outros_custos"
            inputMode="decimal"
            value={cab.outros_custos}
            onChange={(e) => setCab({ ...cab, outros_custos: e.target.value })}
            className="numeros"
          />
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="preco_inclui_frete"
            value="sim"
            checked={cab.preco_inclui_frete}
            onChange={(e) => setCab({ ...cab, preco_inclui_frete: e.target.checked })}
            className="size-4 accent-acao"
          />
          Preços já incluem o frete
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Itens</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setItens([...itens, linhaVazia()])}
          >
            <Plus className="size-4" /> Adicionar item
          </Button>
        </div>
        {itens.map((l, idx) => {
          const c = calculo[idx];
          const filamento = c.insumo?.tipo === "filamento";
          const r = landed[l.chave];
          const custo =
            c.insumo && r && c.base
              ? formatarCustoUnitario(r.custoUnitario, c.insumo.unidade_base)
              : null;
          return (
            <div key={l.chave} className="space-y-3 rounded-2xl bg-card p-4 shadow-painel">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
                <Campo rotulo="Insumo" nome={`insumo-${l.chave}`}>
                  <SelectNativo
                    id={`insumo-${l.chave}`}
                    value={l.insumo_id}
                    onChange={(e) => trocarInsumo(l.chave, e.target.value)}
                  >
                    <option value="">Escolha</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}
                      </option>
                    ))}
                  </SelectNativo>
                </Campo>
                <Campo rotulo={filamento ? "Rolos" : "Quantidade"} nome={`qtd-${l.chave}`}>
                  <Input
                    id={`qtd-${l.chave}`}
                    inputMode="decimal"
                    value={l.quantidade}
                    onChange={(e) => alterar(l.chave, { quantidade: e.target.value })}
                    className="numeros"
                  />
                </Campo>
                <Campo rotulo="Unidade" nome={`un-${l.chave}`}>
                  <SelectNativo
                    id={`un-${l.chave}`}
                    value={l.unidade}
                    onChange={(e) => alterar(l.chave, { unidade: e.target.value })}
                    disabled={filamento}
                  >
                    {filamento ? (
                      <option value="un">rolo</option>
                    ) : (
                      unidades.map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          {u.codigo}
                        </option>
                      ))
                    )}
                  </SelectNativo>
                </Campo>
                <Campo
                  rotulo={filamento ? "Preço por rolo" : "Preço unitário"}
                  nome={`preco-${l.chave}`}
                >
                  <Input
                    id={`preco-${l.chave}`}
                    inputMode="decimal"
                    value={l.preco_unitario}
                    onChange={(e) => alterar(l.chave, { preco_unitario: e.target.value })}
                    className="numeros"
                  />
                </Campo>
                <Campo rotulo="Desconto do item" nome={`desc-${l.chave}`}>
                  <Input
                    id={`desc-${l.chave}`}
                    inputMode="decimal"
                    value={l.desconto_item}
                    onChange={(e) => alterar(l.chave, { desconto_item: e.target.value })}
                    className="numeros"
                  />
                </Campo>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover item"
                    onClick={() => setItens(itens.filter((x) => x.chave !== l.chave))}
                    disabled={itens.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filamento && (
                  <Campo
                    rotulo="Peso útil por rolo (g)"
                    nome={`peso-${l.chave}`}
                    dica="Cada rolo vira um lote."
                  >
                    <Input
                      id={`peso-${l.chave}`}
                      inputMode="decimal"
                      value={l.peso_util_g}
                      onChange={(e) => alterar(l.chave, { peso_util_g: e.target.value })}
                      className="numeros"
                    />
                  </Campo>
                )}
                <Campo
                  rotulo="Código do lote"
                  nome={`lote-${l.chave}`}
                  dica="Opcional. Vazio gera pela data."
                >
                  <Input
                    id={`lote-${l.chave}`}
                    value={l.lote_codigo}
                    onChange={(e) => alterar(l.chave, { lote_codigo: e.target.value })}
                    maxLength={40}
                    className="font-mono"
                  />
                </Campo>
                <div className="numeros self-end text-sm text-texto-2 lg:col-span-2">
                  {c.insumo && r ? (
                    <>
                      <span className="text-texto">{formatarMoeda(r.landed)}</span> na linha,{" "}
                      {c.base
                        ? formatarQuantidade(c.base, c.insumo.unidade_base)
                        : "quantidade base indefinida"}
                      {custo && (
                        <>
                          {" "}
                          a <span className="text-texto">{custo.kg ?? custo.base}</span>
                          {custo.kg && <span className="text-texto-3"> ({custo.base})</span>}
                        </>
                      )}
                    </>
                  ) : (
                    "Escolha o insumo para ver o custo."
                  )}
                </div>
              </div>
              {erroLinha(idx) && <p className="text-sm text-erro">{erroLinha(idx)}</p>}
            </div>
          );
        })}
      </section>

      <section className="numeros flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-5 shadow-painel">
        <div className="text-sm text-texto-2">
          Linhas {formatarMoeda(totalLinhas)} · custo de aquisição total{" "}
          <span className="font-medium text-texto">{formatarMoeda(totalLanded)}</span>
        </div>
        <div className="flex items-center gap-3">
          <CampoErro chave={estado.erros._form ?? estado.erros.itens} />
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando" : compra ? "Salvar rascunho" : "Salvar como rascunho"}
          </Button>
        </div>
      </section>
      <p className="text-xs text-texto-3">
        A compra entra no estoque só ao confirmar, na tela seguinte. Até lá dá para ajustar itens e
        frete.
      </p>
    </form>
  );
}
