"use client";

import { useActionState, useContext, useState } from "react";
import { removerMaterial, salvarMaterial } from "@/acoes/produtos/produtos";
import type { Material, Variacao } from "@/dados/produtos/produtos";
import { PAPEIS_BOM, PAPEL_BOM_ROTULO, type PapelBom } from "@/dominio/produtos/bom";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarQuantidade, numeroParaCampo } from "@/lib/formatos/numero";
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
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type OpcaoInsumo = { id: string; nome: string; unidade_base: string; tipo: string };
export type OpcaoUnidade = { codigo: string; nome: string };

export function FormMaterial({
  produtoId,
  variacoes,
  insumos,
  unidades,
  material,
}: {
  produtoId: string;
  variacoes: Variacao[];
  insumos: OpcaoInsumo[];
  unidades: OpcaoUnidade[];
  material?: Material;
}) {
  const [estado, acao, pendente] = useActionState(salvarMaterial, FORM_INICIAL);
  const [insumoId, setInsumoId] = useState(material?.insumo_id ?? insumos[0]?.id ?? "");
  const insumo = insumos.find((i) => i.id === insumoId);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="produto_id" value={produtoId} />
      {material && <input type="hidden" name="id" value={material.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Insumo" nome="insumo_id" erro={estado.erros.insumo_id}>
          <SelectNativo
            id="insumo_id"
            name="insumo_id"
            value={insumoId}
            onChange={(e) => setInsumoId(e.target.value)}
          >
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Só para a variação"
          nome="variacao_id"
          erro={estado.erros.variacao_id}
          dica="Vazio vale para o produto inteiro."
        >
          <SelectNativo
            id="variacao_id"
            name="variacao_id"
            defaultValue={material?.variacao_id ?? ""}
          >
            <option value="">Produto inteiro</option>
            {variacoes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Quantidade" nome="quantidade" erro={estado.erros.quantidade}>
          <Input
            id="quantidade"
            name="quantidade"
            inputMode="decimal"
            defaultValue={numeroParaCampo(material?.quantidade, 3)}
            required
            className="numeros"
          />
        </Campo>
        <Campo
          rotulo="Unidade"
          nome="unidade"
          erro={estado.erros.unidade}
          dica={insumo ? `Base do insumo: ${insumo.unidade_base}` : undefined}
        >
          <SelectNativo
            id="unidade"
            name="unidade"
            defaultValue={material?.unidade ?? insumo?.unidade_base ?? "un"}
          >
            {unidades.map((u) => (
              <option key={u.codigo} value={u.codigo}>
                {u.codigo} ({u.nome})
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Papel" nome="papel" erro={estado.erros.papel}>
          <SelectNativo id="papel" name="papel" defaultValue={material?.papel ?? "complementar"}>
            {PAPEIS_BOM.map((p) => (
              <option key={p} value={p}>
                {PAPEL_BOM_ROTULO[p]}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo
          rotulo="Conta por"
          nome="por"
          erro={estado.erros.por}
          dica="Por pedido: caixa de envio, entra nos fixos por venda."
        >
          <SelectNativo id="por" name="por" defaultValue={material?.por ?? "peca"}>
            <option value="peca">Peça</option>
            <option value="pedido">Pedido</option>
          </SelectNativo>
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Input
          id="observacoes"
          name="observacoes"
          defaultValue={material?.observacoes ?? ""}
          maxLength={300}
        />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Salvar"}
      </Button>
    </form>
  );
}

export function TabelaMateriais({
  produtoId,
  materiais,
  variacoes,
  editar,
  insumos,
  unidades,
}: {
  produtoId: string;
  materiais: Material[];
  variacoes: Variacao[];
  editar: boolean;
  insumos: OpcaoInsumo[];
  unidades: OpcaoUnidade[];
}) {
  const [aberto, setAberto] = useState<Material | null>(null);
  if (materiais.length === 0)
    return (
      <EstadoVazio
        titulo="Lista de materiais vazia"
        descricao="O filamento vem da ficha. Aqui entram ímãs, parafusos, etiquetas, caixa e embalagem, por peça ou por pedido."
      />
    );
  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        <Table>
          <TableHeader>
            <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
              <TableHead className="pl-5">Insumo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Por</TableHead>
              <TableHead>Variação</TableHead>
              {editar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiais.map((m) => (
              <TableRow key={m.id} className="h-11">
                <TableCell className="pl-5 font-medium">{m.insumo?.nome ?? "Insumo"}</TableCell>
                <TableCell className="numeros">
                  {formatarQuantidade(m.quantidade, m.unidade)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {PAPEL_BOM_ROTULO[m.papel as PapelBom] ?? m.papel}
                  </Badge>
                </TableCell>
                <TableCell className="text-texto-2">
                  {m.por === "pedido" ? "Pedido" : "Peça"}
                </TableCell>
                <TableCell className="text-texto-2">
                  {m.variacao_id
                    ? (variacoes.find((v) => v.id === m.variacao_id)?.nome ?? "Variação")
                    : "Produto inteiro"}
                </TableCell>
                {editar && (
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setAberto(m)}>
                      Editar
                    </Button>
                    <BotaoAcao
                      acao={() => removerMaterial(m.id, produtoId)}
                      confirmar={{ titulo: "Remover este material da lista?", rotulo: "Remover" }}
                    >
                      Remover
                    </BotaoAcao>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar material</DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setAberto(null)}>
            {aberto && (
              <FormMaterial
                key={aberto.id}
                produtoId={produtoId}
                variacoes={variacoes}
                insumos={insumos}
                unidades={unidades}
                material={aberto}
              />
            )}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
