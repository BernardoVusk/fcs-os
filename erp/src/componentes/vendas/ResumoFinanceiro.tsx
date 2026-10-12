import type { ResumoPedido } from "@/dominio/vendas/resumo-pedido";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";

function Linha({
  rotulo,
  valor,
  destaque = false,
  nota,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  nota?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1.5 ${destaque ? "border-t border-borda font-semibold" : ""}`}
    >
      <dt className={destaque ? "" : "text-texto-2"}>
        {rotulo}
        {nota && <span className="ml-2 text-xs font-normal text-texto-3">{nota}</span>}
      </dt>
      <dd className="numeros">{valor}</dd>
    </div>
  );
}

/** Resumo financeiro do pedido (spec 7.7): receita, taxas, a receber, imposto, custos e resultado. */
export function ResumoFinanceiro({ r }: { r: ResumoPedido | null }) {
  if (!r) return <p className="text-sm text-texto-2">Sem resumo.</p>;
  return (
    <dl className="rounded-2xl bg-card p-5 text-sm shadow-painel">
      <Linha rotulo="Receita bruta" valor={formatarMoeda(r.receita_bruta)} />
      <Linha
        rotulo="Base de vendas"
        valor={formatarMoeda(r.base_vendas)}
        nota="com frete cobrado, sem cupom do vendedor"
      />
      <Linha
        rotulo={r.origem_taxas === "canal" ? "Taxas informadas pelo canal" : "Comissão"}
        valor={formatarMoeda(r.origem_taxas === "canal" ? r.taxas_canal : r.comissao)}
      />
      {r.origem_taxas === "calculadas" && (
        <Linha rotulo="Taxa de pagamento" valor={formatarMoeda(r.taxa_pagamento)} />
      )}
      {r.origem_taxas === "calculadas" && (
        <Linha
          rotulo="Taxa fixa por item"
          valor={formatarMoeda(r.taxa_fixa)}
          nota={`${r.itens} item(ns)`}
        />
      )}
      <Linha rotulo="Valor a receber do canal" valor={formatarMoeda(r.valor_a_receber)} destaque />
      <Linha
        rotulo="Imposto estimado"
        valor={r.imposto_estimado == null ? "Não configurado" : formatarMoeda(r.imposto_estimado)}
        nota="análise, não vira lançamento"
      />
      <Linha
        rotulo="Receita líquida"
        valor={r.receita_liquida == null ? "Sem dados" : formatarMoeda(r.receita_liquida)}
      />
      <Linha
        rotulo="Custo estimado"
        valor={
          r.custo_estimado == null ? "Sem custo em todos os itens" : formatarMoeda(r.custo_estimado)
        }
        nota="congelado ao marcar pago"
      />
      <Linha
        rotulo="Resultado estimado"
        valor={
          r.resultado_estimado == null
            ? "Sem dados"
            : `${formatarMoeda(r.resultado_estimado)}${r.margem_estimada != null ? ` (${formatarPercentual(r.margem_estimada, 1)})` : ""}`
        }
        destaque
      />
      <Linha
        rotulo="Custo realizado"
        valor={r.custo_realizado == null ? "Na expedição" : formatarMoeda(r.custo_realizado)}
        nota="média das peças prontas"
      />
      <Linha
        rotulo="Resultado real"
        valor={r.resultado_real == null ? "Sem dados" : formatarMoeda(r.resultado_real)}
        destaque
      />
    </dl>
  );
}
