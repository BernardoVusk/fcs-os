"use client";

import { useActionState, useContext, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  cancelarLancamento,
  estornarLancamento,
  realizarLancamento,
} from "@/acoes/financeiro/lancamentos";
import type { LancamentoSituacao } from "@/dados/financeiro/financeiro";
import { ESTADO_LANCAMENTO_ROTULO, type EstadoLancamento } from "@/dominio/financeiro/estados";
import { FORM_INICIAL } from "@/lib/forms";
import { numeroParaCampo } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";
import type { OpcaoConta } from "./FormLancamento";

const VARIANTE: Record<EstadoLancamento, "default" | "secondary" | "outline"> = {
  planejado: "outline",
  parcial: "default",
  realizado: "default",
  cancelado: "secondary",
  estornado: "secondary",
};

export function BadgeEstado({
  estado,
  atrasado,
}: {
  estado: string | null;
  atrasado: boolean | null;
}) {
  const e = (estado ?? "planejado") as EstadoLancamento;
  return (
    <span className="inline-flex items-center gap-1">
      <Badge
        variant={VARIANTE[e] ?? "outline"}
        className={e === "realizado" ? "bg-sucesso text-acao-texto" : undefined}
      >
        {ESTADO_LANCAMENTO_ROTULO[e] ?? estado}
      </Badge>
      {atrasado && (
        <Badge variant="outline" className="border-erro/40 text-erro">
          vencido
        </Badge>
      )}
    </span>
  );
}

export function FormRealizar({
  lancamento,
  contas,
}: {
  lancamento: LancamentoSituacao;
  contas: OpcaoConta[];
}) {
  const [estado, acao, pendente] = useActionState(realizarLancamento, FORM_INICIAL);
  const [encerrar, setEncerrar] = useState(false);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  const restante = Number(lancamento.saldo_restante ?? lancamento.valor_previsto);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="lancamento_id" value={lancamento.id ?? ""} />
      <p className="text-sm text-texto-2">
        {lancamento.descricao}: previsto {formatarMoeda(lancamento.valor_previsto)}, já{" "}
        {lancamento.tipo === "receita" ? "recebido" : "pago"}{" "}
        {formatarMoeda(lancamento.valor_realizado)}, restam {formatarMoeda(restante)}.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Valor (R$)" nome="valor" erro={estado.erros.valor}>
          <Input
            id="valor"
            name="valor"
            inputMode="decimal"
            defaultValue={numeroParaCampo(restante, 2)}
            className="numeros"
            autoFocus
          />
        </Campo>
        <Campo rotulo="Data" nome="data" erro={estado.erros.data}>
          <Input id="data" name="data" type="date" defaultValue={hojeSaoPaulo()} required />
        </Campo>
        <Campo rotulo="Conta" nome="conta_id" erro={estado.erros.conta_id}>
          <SelectNativo
            id="conta_id"
            name="conta_id"
            defaultValue={lancamento.conta_id ?? contas[0]?.id ?? ""}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <Campo rotulo="Observação" nome="observacao" erro={estado.erros.observacao}>
        <Input id="observacao" name="observacao" maxLength={300} />
      </Campo>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="encerrar"
          value="sim"
          checked={encerrar}
          onChange={(e) => setEncerrar(e.target.checked)}
          className="size-4 accent-acao"
        />
        Encerrar com diferença (o que faltar não será cobrado nem pago)
      </label>
      {encerrar && (
        <Campo rotulo="Motivo da diferença" nome="motivo" erro={estado.erros.motivo}>
          <Input
            id="motivo"
            name="motivo"
            maxLength={300}
            placeholder="Desconto na negociação, taxa menor que a prevista"
          />
        </Campo>
      )}
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>
        {pendente
          ? "Registrando"
          : lancamento.tipo === "receita"
            ? "Registrar recebimento"
            : "Registrar pagamento"}
      </Button>
    </form>
  );
}

function AcoesLinha({
  l,
  contas,
  aoRealizar,
}: {
  l: LancamentoSituacao;
  contas: OpcaoConta[];
  aoRealizar: (l: LancamentoSituacao) => void;
}) {
  const estado = l.estado as EstadoLancamento;
  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      {(estado === "planejado" || estado === "parcial") && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => aoRealizar(l)}
          disabled={contas.length === 0}
        >
          {l.tipo === "receita" ? "Receber" : l.tipo === "despesa" ? "Pagar" : "Transferir"}
        </Button>
      )}
      {estado === "planejado" && (
        <BotaoAcao
          acao={() => cancelarLancamento(l.id!, "Cancelado pela tela")}
          confirmar={{
            titulo: "Cancelar este lançamento?",
            descricao: "Ele sai da projeção. Lançamento com realização não pode ser cancelado.",
            rotulo: "Cancelar lançamento",
          }}
        >
          Cancelar
        </BotaoAcao>
      )}
      {estado === "realizado" && (
        <BotaoAcao
          acao={() => estornarLancamento(l.id!, "Estornado pela tela")}
          confirmar={{
            titulo: "Estornar?",
            descricao:
              "Cria um contra-lançamento realizado hoje nas mesmas contas. O original fica como estornado e nada é apagado.",
            rotulo: "Estornar",
          }}
        >
          Estornar
        </BotaoAcao>
      )}
    </span>
  );
}

export function TabelaLancamentos({
  itens,
  contas,
  editar,
  destaque,
}: {
  itens: LancamentoSituacao[];
  contas: OpcaoConta[];
  editar: boolean;
  destaque?: string;
}) {
  const [realizando, setRealizando] = useState<LancamentoSituacao | null>(null);
  const colunas: ColumnDef<LancamentoSituacao, unknown>[] = [
    {
      accessorKey: "data_prevista",
      header: "Previsto para",
      cell: ({ row }) => (
        <div className="numeros flex flex-col">
          <span>{formatarData(row.original.data_prevista)}</span>
          {row.original.ultima_data && (
            <span className="text-xs text-texto-3">
              realizado {formatarData(row.original.ultima_data)}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "descricao",
      header: "Lançamento",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.descricao}</span>
          <span className="text-xs text-texto-3">
            {row.original.categoria_nome ??
              (row.original.tipo === "transferencia" ? "Transferência" : "Sem categoria")}
            {row.original.conta_nome && ` · ${row.original.conta_nome}`}
            {row.original.origem_tipo &&
              row.original.origem_tipo !== "manual" &&
              ` · ${row.original.origem_tipo}`}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "valor_previsto",
      header: "Valor",
      cell: ({ row }) => (
        <div
          className={`numeros text-right ${row.original.tipo === "receita" ? "text-sucesso" : row.original.tipo === "despesa" ? "" : "text-texto-2"}`}
        >
          <span>
            {row.original.tipo === "receita" ? "+" : row.original.tipo === "despesa" ? "-" : ""}
            {formatarMoeda(row.original.valor_previsto)}
          </span>
          {Number(row.original.valor_realizado) > 0 && Number(row.original.saldo_restante) > 0 && (
            <span className="block text-xs text-texto-3">
              restam {formatarMoeda(row.original.saldo_restante)}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "estado",
      header: "Situação",
      cell: ({ row }) => (
        <BadgeEstado estado={row.original.estado} atrasado={row.original.atrasado} />
      ),
    },
    ...(editar
      ? [
          {
            id: "acoes",
            header: "",
            cell: ({ row }: { row: { original: LancamentoSituacao } }) => (
              <AcoesLinha l={row.original} contas={contas} aoRealizar={setRealizando} />
            ),
          } as ColumnDef<LancamentoSituacao, unknown>,
        ]
      : []),
  ];
  return (
    <>
      <TabelaDados
        colunas={colunas}
        dados={itens}
        placeholderFiltro="Filtrar lançamentos"
        vazio={{
          titulo: "Nenhum lançamento",
          descricao:
            "Registre contas a pagar e a receber. Pedidos pagos e compras confirmadas entram sozinhos.",
        }}
        idLinha={(l) => l.id ?? ""}
        destaque={destaque}
        tamanhoPagina={50}
      />
      <Dialog open={realizando !== null} onOpenChange={(o) => !o && setRealizando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {realizando?.tipo === "receita" ? "Registrar recebimento" : "Registrar pagamento"}
            </DialogTitle>
          </DialogHeader>
          <ContextoDialogo.Provider value={() => setRealizando(null)}>
            {realizando && (
              <FormRealizar key={realizando.id} lancamento={realizando} contas={contas} />
            )}
          </ContextoDialogo.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
