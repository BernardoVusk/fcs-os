import Link from "next/link";
import type { CompraDetalhe } from "@/dados/estoque/compras";
import { landedPorLinha } from "@/dominio/estoque/rateio";
import { quantidadeBaseDaLinha, type Unidade } from "@/dominio/estoque/conversao";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/formatos/moeda";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

/** Itens da compra. Confirmada: valores gravados pelo banco. Rascunho: prévia com as mesmas regras. */
export function ItensCompra({ compra, unidades }: { compra: CompraDetalhe; unidades: Unidade[] }) {
  const confirmada = compra.status === "confirmada";
  const previa = confirmada
    ? null
    : landedPorLinha(
        compra.itens.map((i) => ({
          id: i.id,
          valor: Number(i.quantidade) * Number(i.preco_unitario) - Number(i.desconto_item),
          quantidade: Number(i.quantidade),
          descontoItem: Number(i.desconto_item),
          quantidadeBase:
            quantidadeBaseDaLinha(
              {
                quantidade: Number(i.quantidade),
                unidade: i.unidade,
                pesoUtilG: i.peso_util_g == null ? null : Number(i.peso_util_g),
              },
              i.insumo,
              unidades,
            ) ?? 0,
        })),
        {
          frete: Number(compra.frete),
          descontoTotal: Number(compra.desconto_total),
          outrosCustos: Number(compra.outros_custos),
          precoIncluiFrete: compra.preco_inclui_frete,
          metodo: compra.metodo_rateio as "valor" | "quantidade",
        },
      );
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
      <Table>
        <TableHeader>
          <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
            <TableHead className="pl-5">Insumo</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Rateio</TableHead>
            <TableHead>Custo de aquisição</TableHead>
            <TableHead>Custo unitário</TableHead>
            <TableHead>Lote</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compra.itens.map((i) => {
            const filamento = i.insumo.tipo === "filamento";
            const base = confirmada
              ? i.quantidade_base
              : quantidadeBaseDaLinha(
                  {
                    quantidade: Number(i.quantidade),
                    unidade: i.unidade,
                    pesoUtilG: i.peso_util_g == null ? null : Number(i.peso_util_g),
                  },
                  i.insumo,
                  unidades,
                );
            const landed = confirmada ? i.custo_total : (previa?.[i.id]?.landed ?? null);
            const unitario = confirmada
              ? i.custo_unitario_final
              : (previa?.[i.id]?.custoUnitario ?? null);
            const rateio = confirmada
              ? i.rateio
              : landed == null
                ? null
                : landed -
                  (Number(i.quantidade) * Number(i.preco_unitario) - Number(i.desconto_item));
            const custo = formatarCustoUnitario(unitario, i.insumo.unidade_base);
            return (
              <TableRow key={i.id} className="numeros">
                <TableCell className="pl-5">
                  <Link
                    href={`/estoque/insumos/${i.insumo.id}`}
                    className="font-medium text-acao hover:underline"
                  >
                    {i.insumo.nome}
                  </Link>
                </TableCell>
                <TableCell>
                  {formatarQuantidade(
                    i.quantidade,
                    filamento && i.unidade === "un"
                      ? Number(i.quantidade) === 1
                        ? "rolo"
                        : "rolos"
                      : i.unidade,
                  )}
                  {base != null && (
                    <span className="block text-xs text-texto-3">
                      {formatarQuantidade(base, i.insumo.unidade_base)}
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatarMoeda(i.preco_unitario)}</TableCell>
                <TableCell>
                  {Number(i.desconto_item) > 0 ? (
                    formatarMoeda(i.desconto_item)
                  ) : (
                    <span className="text-texto-3">0</span>
                  )}
                </TableCell>
                <TableCell>{rateio == null ? "Sem dados" : formatarMoeda(rateio, 4)}</TableCell>
                <TableCell className="font-medium">{formatarMoeda(landed, 4)}</TableCell>
                <TableCell>
                  {custo.kg ?? custo.base}
                  {custo.kg && <span className="block text-xs text-texto-3">{custo.base}</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {i.lote_codigo ?? <span className="text-texto-3">pela data</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
