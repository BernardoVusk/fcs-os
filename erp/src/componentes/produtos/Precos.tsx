"use client";

import { useActionState, useContext } from "react";
import { encerrarPreco, salvarPreco } from "@/acoes/produtos/produtos";
import type { PrecoCanal, Variacao } from "@/dados/produtos/produtos";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
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
import type { Opcao } from "./FormProduto";

export function FormPreco({
  produtoId,
  variacoes,
  canais,
}: {
  produtoId: string;
  variacoes: Variacao[];
  canais: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState(salvarPreco, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="produto_id" value={produtoId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Canal" nome="canal_id" erro={estado.erros.canal_id}>
          <SelectNativo id="canal_id" name="canal_id" defaultValue={canais[0]?.id ?? ""}>
            {canais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Variação" nome="variacao_id" erro={estado.erros.variacao_id}>
          <SelectNativo id="variacao_id" name="variacao_id" defaultValue="">
            <option value="">Produto inteiro</option>
            {variacoes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Preço de venda (R$)" nome="preco_venda" erro={estado.erros.preco_venda}>
          <Input
            id="preco_venda"
            name="preco_venda"
            inputMode="decimal"
            required
            className="numeros"
          />
        </Campo>
        <Campo rotulo="Vigente desde" nome="vigente_desde" erro={estado.erros.vigente_desde}>
          <Input
            id="vigente_desde"
            name="vigente_desde"
            type="date"
            defaultValue={hojeSaoPaulo()}
            required
          />
        </Campo>
        <Campo
          rotulo="Vigente até"
          nome="vigente_ate"
          erro={estado.erros.vigente_ate}
          dica="Vazio: até ser substituído."
        >
          <Input id="vigente_ate" name="vigente_ate" type="date" />
        </Campo>
        <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
          <Input
            id="observacoes"
            name="observacoes"
            maxLength={300}
            placeholder="Promoção, reajuste"
          />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando" : "Registrar preço"}
      </Button>
    </form>
  );
}

export function TabelaPrecos({
  produtoId,
  precos,
  variacoes,
  editar,
  hoje,
  margemAlvo,
}: {
  produtoId: string;
  precos: PrecoCanal[];
  variacoes: Variacao[];
  editar: boolean;
  hoje: string;
  margemAlvo: number | null;
}) {
  if (precos.length === 0)
    return (
      <EstadoVazio
        titulo="Sem preço registrado"
        descricao="Registre o preço por canal com vigência. A margem aparece quando o produto tem custo calculado."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Canal</TableHead>
            <TableHead>Variação</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Margem estimada</TableHead>
            <TableHead>Origem</TableHead>
            {editar && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {precos.map((p) => {
            const vigente = p.vigente_desde <= hoje && (!p.vigente_ate || p.vigente_ate >= hoje);
            return (
              <TableRow key={p.id} className={vigente ? "h-11" : "h-11 text-texto-3"}>
                <TableCell className="pl-5 font-medium">{p.canal?.nome ?? "Canal"}</TableCell>
                <TableCell>
                  {p.variacao_id
                    ? (variacoes.find((v) => v.id === p.variacao_id)?.nome ?? "Variação")
                    : "Produto"}
                </TableCell>
                <TableCell className="numeros text-right">{formatarMoeda(p.preco_venda)}</TableCell>
                <TableCell className="numeros text-sm">
                  {formatarData(p.vigente_desde)}
                  {p.vigente_ate ? ` a ${formatarData(p.vigente_ate)}` : ""}
                  {vigente && (
                    <Badge className="ml-2" variant="default">
                      Vigente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="numeros">
                  {p.margem_estimada_cache == null ? (
                    <span className="text-texto-3">Sem cálculo</span>
                  ) : (
                    <span
                      className={
                        margemAlvo != null && p.margem_estimada_cache < margemAlvo
                          ? "text-alerta"
                          : "text-sucesso"
                      }
                    >
                      {formatarPercentual(p.margem_estimada_cache, 1)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-texto-2">
                  {p.origem === "importacao" ? "Importação" : "Manual"}
                </TableCell>
                {editar && (
                  <TableCell className="text-right">
                    {vigente && !p.vigente_ate && (
                      <BotaoAcao
                        acao={() => encerrarPreco(p.id, produtoId)}
                        confirmar={{ titulo: "Encerrar esta vigência hoje?", rotulo: "Encerrar" }}
                      >
                        Encerrar
                      </BotaoAcao>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
