"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { salvarPedido } from "@/acoes/vendas/pedidos";
import type { PedidoDetalhe } from "@/dados/vendas/pedidos";
import { resumirPedido } from "@/dominio/vendas/resumo-pedido";
import { FORM_INICIAL } from "@/lib/forms";
import { lerNumeroPt, numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export type CanalPedido = {
  id: string;
  nome: string;
  taxas: { comissao_pct: number; taxa_pagamento_pct: number; taxa_fixa_item: number } | null;
};
export type ProdutoPedido = {
  id: string;
  nome: string;
  sku: string | null;
  variacoes: { id: string; nome: string }[];
};
type Linha = {
  chave: string;
  produto_id: string;
  variacao_id: string;
  titulo: string;
  quantidade: string;
  preco_unitario: string;
  desconto: string;
};

const novaChave = () => Math.random().toString(36).slice(2, 9);
const n = (v: number | string | null | undefined, casas = 2) =>
  numeroParaCampo(v == null ? null : Number(v), casas);
const pct = (v: number | null | undefined) =>
  v == null ? "" : numeroParaCampo(Number(v) * 100, 4);

export function FormPedido({
  canais,
  clientes,
  produtos,
  precos,
  impostoPct,
  pedido,
}: {
  canais: CanalPedido[];
  clientes: { id: string; nome: string }[];
  produtos: ProdutoPedido[];
  precos: Record<string, number>;
  impostoPct: number | null;
  pedido?: PedidoDetalhe;
}) {
  const [estado, acao, pendente] = useActionState(salvarPedido, FORM_INICIAL);
  const [canalId, setCanalId] = useState(pedido?.canal_id ?? canais[0]?.id ?? "");
  const canal = canais.find((c) => c.id === canalId);
  const [taxas, setTaxas] = useState({
    comissao_pct: pct(pedido?.comissao_pct ?? canal?.taxas?.comissao_pct),
    taxa_pagamento_pct: pct(pedido?.taxa_pagamento_pct ?? canal?.taxas?.taxa_pagamento_pct),
    taxa_fixa_item: n(pedido?.taxa_fixa_item ?? canal?.taxas?.taxa_fixa_item),
  });
  const [cab, setCab] = useState({
    descontos_vendedor: n(pedido?.descontos_vendedor),
    frete_cobrado: n(pedido?.frete_cobrado),
    frete_pago: n(pedido?.frete_pago),
    taxas_canal_informadas: n(pedido?.taxas_canal_informadas),
    taxas_pagamento_informadas: n(pedido?.taxas_pagamento_informadas),
  });
  const [itens, setItens] = useState<Linha[]>(
    pedido && pedido.itens.length > 0
      ? pedido.itens.map((i) => ({
          chave: novaChave(),
          produto_id: i.produto_id ?? "",
          variacao_id: i.variacao_id ?? "",
          titulo: i.titulo ?? "",
          quantidade: String(i.quantidade),
          preco_unitario: n(i.preco_unitario),
          desconto: Number(i.desconto) > 0 ? n(i.desconto) : "",
        }))
      : [
          {
            chave: novaChave(),
            produto_id: produtos[0]?.id ?? "",
            variacao_id: "",
            titulo: "",
            quantidade: "1",
            preco_unitario: n(precos[`${produtos[0]?.id}::${canalId}`]),
            desconto: "",
          },
        ],
  );
  function trocarCanal(id: string) {
    setCanalId(id);
    const c = canais.find((x) => x.id === id);
    setTaxas({
      comissao_pct: pct(c?.taxas?.comissao_pct),
      taxa_pagamento_pct: pct(c?.taxas?.taxa_pagamento_pct),
      taxa_fixa_item: n(c?.taxas?.taxa_fixa_item),
    });
  }
  const alterar = (chave: string, mudanca: Partial<Linha>) =>
    setItens(itens.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  const precoDe = (produtoId: string, variacaoId: string) =>
    precos[`${produtoId}:${variacaoId}:${canalId}`] ?? precos[`${produtoId}::${canalId}`];
  const resumo = resumirPedido({
    itens: itens.map((l) => ({
      quantidade: Math.max(0, Math.trunc(lerNumeroPt(l.quantidade) ?? 0)),
      preco_unitario: lerNumeroPt(l.preco_unitario) ?? 0,
      desconto: lerNumeroPt(l.desconto) ?? 0,
      custo_unitario_estimado: null,
      custo_unitario_realizado: null,
    })),
    descontos_vendedor: lerNumeroPt(cab.descontos_vendedor) ?? 0,
    frete_cobrado: lerNumeroPt(cab.frete_cobrado) ?? 0,
    frete_pago: lerNumeroPt(cab.frete_pago) ?? 0,
    taxas: {
      comissao_pct: (lerNumeroPt(taxas.comissao_pct) ?? 0) / 100,
      taxa_pagamento_pct: (lerNumeroPt(taxas.taxa_pagamento_pct) ?? 0) / 100,
      taxa_fixa_item: lerNumeroPt(taxas.taxa_fixa_item) ?? 0,
      imposto_pct: impostoPct,
    },
    taxas_informadas:
      cab.taxas_canal_informadas || cab.taxas_pagamento_informadas
        ? {
            taxas_canal: lerNumeroPt(cab.taxas_canal_informadas),
            taxas_pagamento: lerNumeroPt(cab.taxas_pagamento_informadas),
          }
        : null,
  });
  const itensJson = JSON.stringify(
    itens.map((l) => ({
      produto_id: l.produto_id || null,
      variacao_id: l.variacao_id || null,
      titulo: l.titulo.trim() || (produtos.find((p) => p.id === l.produto_id)?.nome ?? null),
      quantidade: Math.trunc(lerNumeroPt(l.quantidade) ?? 0),
      preco_unitario: lerNumeroPt(l.preco_unitario) ?? -1,
      desconto: lerNumeroPt(l.desconto) ?? 0,
    })),
  );
  return (
    <form action={acao} className="space-y-5" noValidate>
      {pedido && <input type="hidden" name="id" value={pedido.id} />}
      <input type="hidden" name="itens" value={itensJson} />
      <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-painel sm:grid-cols-2 lg:grid-cols-4">
        <Campo
          rotulo="Canal"
          nome="canal_id"
          erro={estado.erros.canal_id}
          dica={
            canal && !canal.taxas ? "Canal sem taxas configuradas; preencha abaixo." : undefined
          }
        >
          <SelectNativo
            id="canal_id"
            name="canal_id"
            value={canalId}
            onChange={(e) => trocarCanal(e.target.value)}
          >
            {canais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Código no canal"
          nome="codigo_externo"
          erro={estado.erros.codigo_externo}
          dica="Número do pedido na plataforma."
        >
          <Input
            id="codigo_externo"
            name="codigo_externo"
            defaultValue={pedido?.codigo_externo ?? ""}
            maxLength={80}
            className="font-mono"
          />
        </Campo>
        <Campo rotulo="Data" nome="data_pedido" erro={estado.erros.data_pedido}>
          <Input
            id="data_pedido"
            name="data_pedido"
            type="date"
            defaultValue={pedido?.data_pedido ?? hojeSaoPaulo()}
            required
          />
        </Campo>
        <Campo rotulo="Cliente" nome="cliente_id" erro={estado.erros.cliente_id}>
          <SelectNativo id="cliente_id" name="cliente_id" defaultValue={pedido?.cliente_id ?? ""}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Itens</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setItens([
                ...itens,
                {
                  chave: novaChave(),
                  produto_id: "",
                  variacao_id: "",
                  titulo: "",
                  quantidade: "1",
                  preco_unitario: "",
                  desconto: "",
                },
              ])
            }
          >
            <Plus className="size-4" /> Adicionar item
          </Button>
        </div>
        {itens.map((l, idx) => {
          const produto = produtos.find((p) => p.id === l.produto_id);
          const erroItem = Object.keys(estado.erros).find((k) => k.startsWith(`itens.${idx}.`));
          return (
            <div
              key={l.chave}
              className="grid gap-3 rounded-2xl bg-card p-4 shadow-painel sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <Campo rotulo="Produto" nome={`produto-${l.chave}`}>
                <SelectNativo
                  id={`produto-${l.chave}`}
                  value={l.produto_id}
                  onChange={(e) =>
                    alterar(l.chave, {
                      produto_id: e.target.value,
                      variacao_id: "",
                      preco_unitario: n(precoDe(e.target.value, "")) || l.preco_unitario,
                    })
                  }
                >
                  <option value="">Fora do catálogo (só título)</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </SelectNativo>
              </Campo>
              <Campo rotulo="Variação" nome={`variacao-${l.chave}`}>
                <SelectNativo
                  id={`variacao-${l.chave}`}
                  value={l.variacao_id}
                  onChange={(e) =>
                    alterar(l.chave, {
                      variacao_id: e.target.value,
                      preco_unitario: n(precoDe(l.produto_id, e.target.value)) || l.preco_unitario,
                    })
                  }
                  disabled={!produto || produto.variacoes.length === 0}
                >
                  <option value="">{produto?.variacoes.length ? "Base" : "Sem variações"}</option>
                  {produto?.variacoes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </SelectNativo>
              </Campo>
              <Campo rotulo="Quantidade" nome={`qtd-${l.chave}`}>
                <Input
                  id={`qtd-${l.chave}`}
                  inputMode="numeric"
                  value={l.quantidade}
                  onChange={(e) => alterar(l.chave, { quantidade: e.target.value })}
                  className="numeros"
                />
              </Campo>
              <Campo rotulo="Preço unitário" nome={`preco-${l.chave}`}>
                <Input
                  id={`preco-${l.chave}`}
                  inputMode="decimal"
                  value={l.preco_unitario}
                  onChange={(e) => alterar(l.chave, { preco_unitario: e.target.value })}
                  className="numeros"
                />
              </Campo>
              <Campo rotulo="Desconto da linha" nome={`desc-${l.chave}`}>
                <Input
                  id={`desc-${l.chave}`}
                  inputMode="decimal"
                  value={l.desconto}
                  onChange={(e) => alterar(l.chave, { desconto: e.target.value })}
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
              {!l.produto_id && (
                <Campo rotulo="Título do item" nome={`titulo-${l.chave}`}>
                  <Input
                    id={`titulo-${l.chave}`}
                    value={l.titulo}
                    onChange={(e) => alterar(l.chave, { titulo: e.target.value })}
                    maxLength={200}
                  />
                </Campo>
              )}
              {erroItem && (
                <p className="text-sm text-erro sm:col-span-2 lg:col-span-6">
                  Item {idx + 1}: confira quantidade e preço.
                </p>
              )}
            </div>
          );
        })}
      </section>
      <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-painel sm:grid-cols-2 lg:grid-cols-4">
        <Campo
          rotulo="Cupom do vendedor (R$)"
          nome="descontos_vendedor"
          erro={estado.erros.descontos_vendedor}
          dica="Desconto que você banca. Cupom da plataforma não entra."
        >
          <Input
            id="descontos_vendedor"
            name="descontos_vendedor"
            inputMode="decimal"
            value={cab.descontos_vendedor}
            onChange={(e) => setCab({ ...cab, descontos_vendedor: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Frete cobrado do cliente (R$)"
          nome="frete_cobrado"
          erro={estado.erros.frete_cobrado}
        >
          <Input
            id="frete_cobrado"
            name="frete_cobrado"
            inputMode="decimal"
            value={cab.frete_cobrado}
            onChange={(e) => setCab({ ...cab, frete_cobrado: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Frete pago por nós (R$)" nome="frete_pago" erro={estado.erros.frete_pago}>
          <Input
            id="frete_pago"
            name="frete_pago"
            inputMode="decimal"
            value={cab.frete_pago}
            onChange={(e) => setCab({ ...cab, frete_pago: e.target.value })}
            className="numeros"
          />
        </Campo>
        <div />
        <Campo
          rotulo="Comissão (%)"
          nome="comissao_pct"
          erro={estado.erros.comissao_pct}
          dica="Pré-preenchido pelo canal."
        >
          <Input
            id="comissao_pct"
            name="comissao_pct"
            inputMode="decimal"
            value={taxas.comissao_pct}
            onChange={(e) => setTaxas({ ...taxas, comissao_pct: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Taxa de pagamento (%)"
          nome="taxa_pagamento_pct"
          erro={estado.erros.taxa_pagamento_pct}
        >
          <Input
            id="taxa_pagamento_pct"
            name="taxa_pagamento_pct"
            inputMode="decimal"
            value={taxas.taxa_pagamento_pct}
            onChange={(e) => setTaxas({ ...taxas, taxa_pagamento_pct: e.target.value })}
            className="numeros"
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
            value={taxas.taxa_fixa_item}
            onChange={(e) => setTaxas({ ...taxas, taxa_fixa_item: e.target.value })}
            className="numeros"
          />
        </Campo>
        <div />
        <Campo
          rotulo="Taxas reais do canal (R$)"
          nome="taxas_canal_informadas"
          erro={estado.erros.taxas_canal_informadas}
          dica="Do extrato. Quando preenchido, vale no lugar das calculadas."
        >
          <Input
            id="taxas_canal_informadas"
            name="taxas_canal_informadas"
            inputMode="decimal"
            value={cab.taxas_canal_informadas}
            onChange={(e) => setCab({ ...cab, taxas_canal_informadas: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Taxa de pagamento real (R$)"
          nome="taxas_pagamento_informadas"
          erro={estado.erros.taxas_pagamento_informadas}
        >
          <Input
            id="taxas_pagamento_informadas"
            name="taxas_pagamento_informadas"
            inputMode="decimal"
            value={cab.taxas_pagamento_informadas}
            onChange={(e) => setCab({ ...cab, taxas_pagamento_informadas: e.target.value })}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
          <Textarea
            id="observacoes"
            name="observacoes"
            defaultValue={pedido?.observacoes ?? ""}
            rows={1}
            maxLength={2000}
          />
        </Campo>
      </section>
      <section className="numeros grid gap-3 rounded-2xl bg-card p-5 shadow-painel sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-[13px] text-texto-2">Receita bruta</p>
          <p className="text-lg font-semibold">{formatarMoeda(resumo.receita_bruta)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Base de vendas</p>
          <p className="text-lg font-semibold">{formatarMoeda(resumo.base_vendas)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Taxas do canal</p>
          <p className="text-lg font-semibold">{formatarMoeda(resumo.taxas_canal)}</p>
          <p className="text-xs text-texto-3">
            {resumo.origem_taxas === "canal" ? "informadas" : "calculadas"}
          </p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">A receber</p>
          <p className="text-lg font-semibold text-acao">{formatarMoeda(resumo.valor_a_receber)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Imposto estimado</p>
          <p className="text-lg font-semibold">
            {resumo.imposto_estimado == null
              ? "Não configurado"
              : formatarMoeda(resumo.imposto_estimado)}
          </p>
          {impostoPct != null && (
            <p className="text-xs text-texto-3">{formatarPercentual(impostoPct, 1)} sobre a base</p>
          )}
        </div>
      </section>
      <CampoErro chave={estado.erros._form ?? estado.erros.itens} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : pedido ? "Salvar pedido" : "Criar pedido"}
      </Button>
    </form>
  );
}
