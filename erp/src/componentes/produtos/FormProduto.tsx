"use client";

import { useActionState } from "react";
import { salvarProduto } from "@/acoes/produtos/produtos";
import type { Produto } from "@/dados/produtos/produtos";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type Opcao = { id: string; nome: string };
export const STATUS_PRODUTO: Record<
  string,
  { rotulo: string; variante: "default" | "secondary" | "outline" }
> = {
  rascunho: { rotulo: "Rascunho", variante: "outline" },
  ativo: { rotulo: "Ativo", variante: "default" },
  pausado: { rotulo: "Pausado", variante: "secondary" },
  descontinuado: { rotulo: "Descontinuado", variante: "secondary" },
};

const n = (v: number | string | null | undefined, casas = 2) =>
  numeroParaCampo(v == null ? null : Number(v), casas);
const pct = (v: number | null | undefined) =>
  v == null ? "" : numeroParaCampo(Number(v) * 100, 4);

export function FormProduto({
  produto,
  categorias,
  insumos,
  impressoras,
}: {
  produto?: Produto;
  categorias: Opcao[];
  insumos: Opcao[];
  impressoras: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState(salvarProduto, FORM_INICIAL);
  useAoSalvar(estado);
  const a = (produto?.atributos ?? {}) as Record<string, string | null>;
  return (
    <form action={acao} className="space-y-5" noValidate>
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
        <h2 className="text-base font-semibold">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
            <Input id="nome" name="nome" defaultValue={produto?.nome} required maxLength={160} />
          </Campo>
          <Campo rotulo="SKU" nome="sku" erro={estado.erros.sku} dica="Opcional, único.">
            <Input
              id="sku"
              name="sku"
              defaultValue={produto?.sku ?? ""}
              maxLength={40}
              className="font-mono"
            />
          </Campo>
          <Campo rotulo="Situação" nome="status" erro={estado.erros.status}>
            <SelectNativo id="status" name="status" defaultValue={produto?.status ?? "rascunho"}>
              {Object.entries(STATUS_PRODUTO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.rotulo}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Categoria" nome="categoria_id" erro={estado.erros.categoria_id}>
            <SelectNativo
              id="categoria_id"
              name="categoria_id"
              defaultValue={produto?.categoria_id ?? ""}
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor}>
            <Input id="cor" name="cor" defaultValue={a.cor ?? ""} maxLength={40} />
          </Campo>
          <Campo rotulo="Material" nome="material" erro={estado.erros.material}>
            <Input
              id="material"
              name="material"
              defaultValue={a.material ?? ""}
              maxLength={40}
              placeholder="PLA, PETG"
            />
          </Campo>
          <Campo rotulo="Tamanho" nome="tamanho" erro={estado.erros.tamanho}>
            <Input id="tamanho" name="tamanho" defaultValue={a.tamanho ?? ""} maxLength={40} />
          </Campo>
          <Campo rotulo="Acabamento" nome="acabamento" erro={estado.erros.acabamento}>
            <Input
              id="acabamento"
              name="acabamento"
              defaultValue={a.acabamento ?? ""}
              maxLength={80}
            />
          </Campo>
        </div>
        <Campo rotulo="Descrição" nome="descricao" erro={estado.erros.descricao}>
          <Textarea
            id="descricao"
            name="descricao"
            defaultValue={produto?.descricao ?? ""}
            rows={3}
            maxLength={4000}
          />
        </Campo>
      </section>
      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
        <h2 className="text-base font-semibold">Fabricação</h2>
        <p className="text-sm text-texto-2">
          Campo vazio significa sem dados e bloqueia o cálculo; nunca vira zero.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            rotulo="Peso (g)"
            nome="peso_g"
            erro={estado.erros.peso_g}
            dica="Do fatiador, com suportes."
          >
            <Input
              id="peso_g"
              name="peso_g"
              inputMode="decimal"
              defaultValue={n(produto?.peso_g, 3)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Tempo de impressão (min)"
            nome="tempo_impressao_min"
            erro={estado.erros.tempo_impressao_min}
            dica="Do ciclo inteiro."
          >
            <Input
              id="tempo_impressao_min"
              name="tempo_impressao_min"
              inputMode="decimal"
              defaultValue={n(produto?.tempo_impressao_min, 1)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Peças por ciclo"
            nome="pecas_por_ciclo"
            erro={estado.erros.pecas_por_ciclo}
          >
            <Input
              id="pecas_por_ciclo"
              name="pecas_por_ciclo"
              inputMode="numeric"
              defaultValue={n(produto?.pecas_por_ciclo ?? 1, 0)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Taxa de falha (%)"
            nome="taxa_falha_pct"
            erro={estado.erros.taxa_falha_pct}
            dica="Vazio usa o padrão dos parâmetros."
          >
            <Input
              id="taxa_falha_pct"
              name="taxa_falha_pct"
              inputMode="decimal"
              defaultValue={pct(produto?.taxa_falha_pct)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Preparo por ciclo (min)"
            nome="tempo_preparo_min"
            erro={estado.erros.tempo_preparo_min}
          >
            <Input
              id="tempo_preparo_min"
              name="tempo_preparo_min"
              inputMode="decimal"
              defaultValue={n(produto?.tempo_preparo_min, 1)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Acabamento por peça (min)"
            nome="tempo_acabamento_min"
            erro={estado.erros.tempo_acabamento_min}
          >
            <Input
              id="tempo_acabamento_min"
              name="tempo_acabamento_min"
              inputMode="decimal"
              defaultValue={n(produto?.tempo_acabamento_min, 1)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Embalagem por peça (min)"
            nome="tempo_embalagem_min"
            erro={estado.erros.tempo_embalagem_min}
          >
            <Input
              id="tempo_embalagem_min"
              name="tempo_embalagem_min"
              inputMode="decimal"
              defaultValue={n(produto?.tempo_embalagem_min, 1)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Margem alvo (%)"
            nome="margem_alvo"
            erro={estado.erros.margem_alvo}
            dica="Vazio usa o padrão dos parâmetros."
          >
            <Input
              id="margem_alvo"
              name="margem_alvo"
              inputMode="decimal"
              defaultValue={pct(produto?.margem_alvo)}
              className="numeros"
            />
          </Campo>
          <Campo
            rotulo="Filamento"
            nome="insumo_impressao_id"
            erro={estado.erros.insumo_impressao_id}
          >
            <SelectNativo
              id="insumo_impressao_id"
              name="insumo_impressao_id"
              defaultValue={produto?.insumo_impressao_id ?? ""}
            >
              <option value="">Não definido</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo="Impressora padrão"
            nome="impressora_padrao_id"
            erro={estado.erros.impressora_padrao_id}
          >
            <SelectNativo
              id="impressora_padrao_id"
              name="impressora_padrao_id"
              defaultValue={produto?.impressora_padrao_id ?? ""}
            >
              <option value="">Não definida</option>
              {impressoras.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo
            rotulo="Licença do modelo"
            nome="licenca"
            erro={estado.erros.licenca}
            dica="Autor, loja ou licença."
          >
            <Input
              id="licenca"
              name="licenca"
              defaultValue={produto?.licenca ?? ""}
              maxLength={200}
            />
          </Campo>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="licenca_comercial"
              value="sim"
              defaultChecked={produto?.licenca_comercial ?? false}
              className="size-4 accent-acao"
            />
            Licença permite venda
          </label>
        </div>
        <Campo
          rotulo="Observações de fabricação"
          nome="observacoes_fabricacao"
          erro={estado.erros.observacoes_fabricacao}
          dica="Perfil de fatiamento, suportes, orientação."
        >
          <Textarea
            id="observacoes_fabricacao"
            name="observacoes_fabricacao"
            defaultValue={produto?.observacoes_fabricacao ?? ""}
            rows={3}
            maxLength={4000}
          />
        </Campo>
      </section>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : produto ? "Salvar ficha" : "Criar produto"}
      </Button>
    </form>
  );
}
