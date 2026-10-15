"use client";

import type { Inscricao, Sorteio } from "@/dados/vendas/sorteio";
import { formatarTelefone } from "@/dominio/clientes/telefone";
import { rotuloReferencia } from "@/dominio/sorteio/referencia";
import { formatarDataHora } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { SelectNativo } from "@/componentes/painel/SelectNativo";

const ORIGENS: Record<string, string> = {
  panfleto: "Panfleto",
  instagram: "Instagram",
  outro: "Outro",
};

export function FiltroMes({
  referencia,
  opcoes,
}: {
  referencia: string;
  opcoes: { referencia: string; total: number }[];
}) {
  return (
    <form method="get" className="flex items-center gap-2">
      <label htmlFor="referencia" className="text-sm text-texto-2">
        Mês
      </label>
      <SelectNativo
        id="referencia"
        name="referencia"
        defaultValue={referencia}
        className="w-auto min-w-44"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {opcoes.map((m) => (
          <option key={m.referencia} value={m.referencia}>
            {rotuloReferencia(m.referencia)} ({m.total})
          </option>
        ))}
      </SelectNativo>
    </form>
  );
}

export function CartaoGanhador({ sorteio }: { sorteio: Sorteio }) {
  const c = sorteio.inscricao?.cliente;
  const produto = sorteio.inscricao?.produto?.nome ?? sorteio.inscricao?.produto_outro ?? "";
  return (
    <div className="rounded-2xl border border-acao/40 bg-acao-suave p-5">
      <p className="text-xs font-semibold tracking-wider text-texto-2 uppercase">
        Ganhador de {rotuloReferencia(sorteio.referencia)}
      </p>
      <p className="mt-1 text-xl font-semibold">{c?.nome ?? "Cliente anonimizado"}</p>
      <p className="mt-1 text-sm text-texto-2">
        {[c?.email, formatarTelefone(c?.telefone)].filter(Boolean).join(" | ") || "Sem contato"}
        {produto && ` | comprou: ${produto}`}
      </p>
      <p className="mt-2 text-xs text-texto-3">
        Sorteado em {formatarDataHora(sorteio.sorteado_em)}
      </p>
    </div>
  );
}

export function TabelaInscricoes({ inscricoes }: { inscricoes: Inscricao[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inscricoes.map((i) => (
            <TableRow key={i.id} className="h-11">
              <TableCell className="pl-5 font-medium">
                {i.cliente?.anonimizado ? "Anonimizado" : (i.cliente?.nome ?? "")}
              </TableCell>
              <TableCell>{i.cliente?.email ?? ""}</TableCell>
              <TableCell>{formatarTelefone(i.cliente?.telefone)}</TableCell>
              <TableCell>{i.produto?.nome ?? i.produto_outro ?? ""}</TableCell>
              <TableCell>{i.canal?.nome ?? ""}</TableCell>
              <TableCell>
                <Badge variant={i.aceita_contato ? "secondary" : "outline"}>
                  {i.aceita_contato ? "Aceita" : "Não"}
                </Badge>
              </TableCell>
              <TableCell>{ORIGENS[i.origem] ?? i.origem}</TableCell>
              <TableCell className="whitespace-nowrap">{formatarDataHora(i.criado_em)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
