import type { Lote } from "@/dados/estoque/insumos";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { cn } from "@/lib/utils";

export function TabelaLotes({
  lotes,
  unidade,
  destaque,
}: {
  lotes: Lote[];
  unidade: string;
  destaque?: string;
}) {
  if (lotes.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum lote"
        descricao="Confirme uma compra deste insumo para criar o primeiro lote. Filamento: um rolo é um lote."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Lote</TableHead>
            <TableHead>Aberto em</TableHead>
            <TableHead className="text-right">Inicial</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Custo do lote</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lotes.map((l) => {
            const saldo = Number(l.quantidade_atual);
            const custo = formatarCustoUnitario(l.custo_unitario, unidade);
            return (
              <TableRow
                key={l.id}
                className={cn(
                  "numeros h-11",
                  saldo <= 0 && !l.divergente && "text-texto-3",
                  destaque === l.id && "bg-acao-suave hover:bg-acao-suave",
                )}
              >
                <TableCell className="pl-5 font-mono text-xs">{l.codigo}</TableCell>
                <TableCell>{formatarData(l.aberto_em)}</TableCell>
                <TableCell className="text-right">
                  {formatarQuantidade(l.quantidade_inicial, unidade)}
                </TableCell>
                <TableCell className={cn("text-right font-medium", saldo < 0 && "text-erro")}>
                  {formatarQuantidade(saldo, unidade)}
                </TableCell>
                <TableCell className="text-right">{formatarMoeda(l.valor_atual, 4)}</TableCell>
                <TableCell>
                  {custo.kg ?? custo.base}
                  {custo.kg && <span className="block text-xs text-texto-3">{custo.base}</span>}
                </TableCell>
                <TableCell>
                  {l.divergente ? (
                    <Badge variant="outline" className="border-erro/40 text-erro">
                      Divergente
                    </Badge>
                  ) : saldo > 0 ? (
                    <Badge>Com saldo</Badge>
                  ) : (
                    <Badge variant="secondary">
                      Encerrado{l.encerrado_em ? ` em ${formatarData(l.encerrado_em)}` : ""}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
