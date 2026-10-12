"use client";

import { useActionState, useState } from "react";
import { criarOrdem } from "@/acoes/producao/ordens";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

export type ProdutoParaOrdem = {
  id: string;
  nome: string;
  sku: string | null;
  insumo_impressao_id: string | null;
  impressora_padrao_id: string | null;
  pecas_por_ciclo: number;
  tempo_impressao_min: number | null;
  custo_variavel_atual: number | null;
  variacoes: {
    id: string;
    nome: string;
    insumo_impressao_id: string | null;
    tempo_impressao_min: number | null;
    pecas_por_ciclo: number | null;
    custo_variavel_atual: number | null;
  }[];
};
export type LoteOpcao = { id: string; codigo: string; quantidade_atual: number; unidade: string };

export function FormOrdem({
  produtos,
  impressoras,
  lotesPorInsumo,
  produtoInicial,
}: {
  produtos: ProdutoParaOrdem[];
  impressoras: { id: string; nome: string }[];
  lotesPorInsumo: Record<string, LoteOpcao[]>;
  produtoInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState(criarOrdem, FORM_INICIAL);
  const [produtoId, setProdutoId] = useState(produtoInicial ?? produtos[0]?.id ?? "");
  const [variacaoId, setVariacaoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const produto = produtos.find((p) => p.id === produtoId);
  const variacao = produto?.variacoes.find((v) => v.id === variacaoId);
  const insumoId = variacao?.insumo_impressao_id ?? produto?.insumo_impressao_id ?? null;
  const lotes = insumoId ? (lotesPorInsumo[insumoId] ?? []) : [];
  const tempo = variacao?.tempo_impressao_min ?? produto?.tempo_impressao_min ?? null;
  const porCiclo = variacao?.pecas_por_ciclo ?? produto?.pecas_por_ciclo ?? 1;
  const qtd = Math.max(1, Number(quantidade) || 1);
  const previsto = tempo == null ? null : Number(tempo) * Math.ceil(qtd / porCiclo);
  const custoUnit = variacao?.custo_variavel_atual ?? produto?.custo_variavel_atual ?? null;
  return (
    <form action={acao} className="space-y-5" noValidate>
      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Produto" nome="produto_id" erro={estado.erros.produto_id}>
            <SelectNativo
              id="produto_id"
              name="produto_id"
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setVariacaoId("");
              }}
            >
              {produtos.length === 0 && <option value="">Nenhum produto</option>}
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.sku ? ` (${p.sku})` : ""}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Variação" nome="variacao_id" erro={estado.erros.variacao_id}>
            <SelectNativo
              id="variacao_id"
              name="variacao_id"
              value={variacaoId}
              onChange={(e) => setVariacaoId(e.target.value)}
              disabled={!produto || produto.variacoes.length === 0}
            >
              <option value="">
                {produto && produto.variacoes.length > 0 ? "Produto base" : "Sem variações"}
              </option>
              {produto?.variacoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo="Quantidade"
            nome="quantidade_planejada"
            erro={estado.erros.quantidade_planejada}
          >
            <Input
              id="quantidade_planejada"
              name="quantidade_planejada"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Prioridade"
            nome="prioridade"
            erro={estado.erros.prioridade}
            dica="Maior sobe na fila."
          >
            <Input
              id="prioridade"
              name="prioridade"
              inputMode="numeric"
              defaultValue="0"
              className="numeros"
            />
          </Campo>
          <Campo rotulo="Impressora" nome="impressora_id" erro={estado.erros.impressora_id}>
            <SelectNativo
              id="impressora_id"
              name="impressora_id"
              defaultValue={produto?.impressora_padrao_id ?? ""}
              key={produtoId}
            >
              <option value="">Padrão do produto ou nenhuma</option>
              {impressoras.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo="Rolo em uso"
            nome="lote_id"
            erro={estado.erros.lote_id}
            dica={insumoId ? "Lote de onde o consumo vai sair." : "Produto sem filamento na ficha."}
          >
            <SelectNativo id="lote_id" name="lote_id" defaultValue="" key={insumoId ?? "sem"}>
              <option value="">Mais antigo com saldo</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} ({formatarQuantidade(l.quantidade_atual, l.unidade)})
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Prazo" nome="prazo" erro={estado.erros.prazo}>
            <Input id="prazo" name="prazo" type="date" />
          </Campo>
          <Campo rotulo="Responsável" nome="responsavel" erro={estado.erros.responsavel}>
            <Input id="responsavel" name="responsavel" maxLength={80} />
          </Campo>
        </div>
        <Campo
          rotulo="Instruções"
          nome="instrucoes"
          erro={estado.erros.instrucoes}
          dica="Perfil, cor, suportes, observações da peça."
        >
          <Textarea id="instrucoes" name="instrucoes" rows={2} maxLength={2000} />
        </Campo>
        <p className="numeros text-sm text-texto-2">
          Tempo previsto:{" "}
          {previsto == null
            ? "sem tempo na ficha"
            : `${Math.round(previsto)} min (${Math.ceil(qtd / porCiclo)} ciclo(s))`}{" "}
          · custo estimado:{" "}
          {custoUnit == null ? "produto sem cálculo" : `R$ ${(Number(custoUnit) * qtd).toFixed(2)}`}
        </p>
      </section>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente || produtos.length === 0}>
        {pendente ? "Criando" : "Criar ordem"}
      </Button>
    </form>
  );
}
