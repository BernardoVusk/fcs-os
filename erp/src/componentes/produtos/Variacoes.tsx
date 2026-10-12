"use client";

import { useActionState, useContext, useState } from "react";
import { salvarVariacao } from "@/acoes/produtos/produtos";
import type { Variacao } from "@/dados/produtos/produtos";
import { camposSobrescritos } from "@/dominio/produtos/heranca";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";
import type { Opcao } from "./FormProduto";

const n = (v: number | string | null | undefined, casas = 2) =>
  numeroParaCampo(v == null ? null : Number(v), casas);
const pct = (v: number | null | undefined) =>
  v == null ? "" : numeroParaCampo(Number(v) * 100, 4);

export function FormVariacao({
  produtoId,
  variacao,
  insumos,
  impressoras,
}: {
  produtoId: string;
  variacao?: Variacao;
  insumos: Opcao[];
  impressoras: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState(salvarVariacao, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const a = (variacao?.atributos ?? {}) as Record<string, string | null>;
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="produto_id" value={produtoId} />
      {variacao && <input type="hidden" name="id" value={variacao.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nome da variação"
          nome="nome"
          erro={estado.erros.nome}
          dica="Ex.: Azul, Grande, Com ímã."
        >
          <Input id="nome" name="nome" defaultValue={variacao?.nome} required maxLength={80} />
        </Campo>
        <Campo rotulo="SKU" nome="sku" erro={estado.erros.sku}>
          <Input
            id="sku"
            name="sku"
            defaultValue={variacao?.sku ?? ""}
            maxLength={40}
            className="font-mono"
          />
        </Campo>
      </div>
      <p className="text-xs text-texto-3">
        Campos em branco herdam do produto. Preencha só o que muda.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Peso (g)" nome="peso_g" erro={estado.erros.peso_g}>
          <Input
            id="peso_g"
            name="peso_g"
            inputMode="decimal"
            defaultValue={n(variacao?.peso_g, 3)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Tempo (min)"
          nome="tempo_impressao_min"
          erro={estado.erros.tempo_impressao_min}
        >
          <Input
            id="tempo_impressao_min"
            name="tempo_impressao_min"
            inputMode="decimal"
            defaultValue={n(variacao?.tempo_impressao_min, 1)}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Peças por ciclo" nome="pecas_por_ciclo" erro={estado.erros.pecas_por_ciclo}>
          <Input
            id="pecas_por_ciclo"
            name="pecas_por_ciclo"
            inputMode="numeric"
            defaultValue={n(variacao?.pecas_por_ciclo, 0)}
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Taxa de falha (%)" nome="taxa_falha_pct" erro={estado.erros.taxa_falha_pct}>
          <Input
            id="taxa_falha_pct"
            name="taxa_falha_pct"
            inputMode="decimal"
            defaultValue={pct(variacao?.taxa_falha_pct)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Preparo (min)"
          nome="tempo_preparo_min"
          erro={estado.erros.tempo_preparo_min}
        >
          <Input
            id="tempo_preparo_min"
            name="tempo_preparo_min"
            inputMode="decimal"
            defaultValue={n(variacao?.tempo_preparo_min, 1)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Acabamento (min)"
          nome="tempo_acabamento_min"
          erro={estado.erros.tempo_acabamento_min}
        >
          <Input
            id="tempo_acabamento_min"
            name="tempo_acabamento_min"
            inputMode="decimal"
            defaultValue={n(variacao?.tempo_acabamento_min, 1)}
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Embalagem (min)"
          nome="tempo_embalagem_min"
          erro={estado.erros.tempo_embalagem_min}
        >
          <Input
            id="tempo_embalagem_min"
            name="tempo_embalagem_min"
            inputMode="decimal"
            defaultValue={n(variacao?.tempo_embalagem_min, 1)}
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
            defaultValue={variacao?.insumo_impressao_id ?? ""}
          >
            <option value="">Herda do produto</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Impressora"
          nome="impressora_padrao_id"
          erro={estado.erros.impressora_padrao_id}
        >
          <SelectNativo
            id="impressora_padrao_id"
            name="impressora_padrao_id"
            defaultValue={variacao?.impressora_padrao_id ?? ""}
          >
            <option value="">Herda do produto</option>
            {impressoras.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor}>
          <Input id="cor" name="cor" defaultValue={a.cor ?? ""} maxLength={40} />
        </Campo>
        <Campo rotulo="Material" nome="material" erro={estado.erros.material}>
          <Input id="material" name="material" defaultValue={a.material ?? ""} maxLength={40} />
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
      {variacao && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            value="sim"
            defaultChecked={variacao.ativo}
            className="size-4 accent-acao"
          />
          Variação ativa
        </label>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

const ROTULO: Record<string, string> = {
  peso_g: "peso",
  tempo_impressao_min: "tempo",
  pecas_por_ciclo: "peças por ciclo",
  taxa_falha_pct: "falha",
  tempo_preparo_min: "preparo",
  tempo_acabamento_min: "acabamento",
  tempo_embalagem_min: "embalagem",
  insumo_impressao_id: "filamento",
  impressora_padrao_id: "impressora",
};

export function TabelaVariacoes({
  produtoId,
  variacoes,
  editar,
  insumos,
  impressoras,
}: {
  produtoId: string;
  variacoes: Variacao[];
  editar: boolean;
  insumos: Opcao[];
  impressoras: Opcao[];
}) {
  const [aberta, setAberta] = useState<Variacao | null>(null);
  if (variacoes.length === 0)
    return (
      <EstadoVazio
        titulo="Sem variações"
        descricao="Cor, tamanho ou acabamento que mudam peso, tempo ou material. Sem variação, o produto é vendido como está."
      />
    );
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Variação</TableHead>
              <TableHead>Sobrescreve</TableHead>
              <TableHead>Custo por peça</TableHead>
              <TableHead>Situação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {variacoes.map((v) => {
              const sobre = camposSobrescritos({ ...v, atributos: null });
              return (
                <TableRow key={v.id} className="h-11">
                  <TableCell className="pl-5">
                    <p className="font-medium">{v.nome}</p>
                    {v.sku && <p className="font-mono text-xs text-texto-3">{v.sku}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-texto-2">
                    {sobre.length === 0
                      ? "Nada (herda tudo)"
                      : sobre.map((k) => ROTULO[k] ?? k).join(", ")}
                  </TableCell>
                  <TableCell className="numeros">
                    {v.custo_atual == null ? (
                      <span className="text-texto-3">Sem cálculo</span>
                    ) : (
                      formatarMoeda(v.custo_atual, 4)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.ativo ? "default" : "secondary"}>
                      {v.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  {editar && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setAberta(v)}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberta !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar variação</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberta(null)}>
            {aberta && (
              <FormVariacao
                key={aberta.id}
                produtoId={produtoId}
                variacao={aberta}
                insumos={insumos}
                impressoras={impressoras}
              />
            )}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
