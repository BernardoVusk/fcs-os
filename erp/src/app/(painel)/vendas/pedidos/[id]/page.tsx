import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { lerResumo, listarStatus, obterPedido } from "@/dados/vendas/pedidos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { STATUS_PAGAMENTO_ROTULO } from "@/dominio/vendas/status";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, formatarDataHora } from "@/lib/formatos/data";
import { BadgeStatusPedido, BotaoOrdemDoItem, MudarStatus } from "@/componentes/vendas/Pedidos";
import { ResumoFinanceiro } from "@/componentes/vendas/ResumoFinanceiro";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("vendas");
  const { id } = await params;
  const pedido = await obterPedido(id);
  if (!pedido) notFound();
  const supabase = await clienteServidor();
  const [lista, ordens] = await Promise.all([
    listarStatus(),
    supabase
      .from("ordens_producao")
      .select("id, codigo, status, pedido_item_id")
      .in(
        "pedido_item_id",
        pedido.itens.map((i) => i.id),
      ),
  ]);
  const editar = podeEscrever(usuario.papel, "vendas");
  const podeProduzir = podeEscrever(usuario.papel, "producao");
  const aberto = !pedido.status?.fechado && !pedido.data_envio;
  const resumo = lerResumo(pedido);
  const ordensPorItem = new Map((ordens.data ?? []).map((o) => [o.pedido_item_id, o]));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[28px] leading-tight font-semibold tracking-tight">
              {pedido.codigo}
            </h1>
            <BadgeStatusPedido status={pedido.status} />
            <Badge variant="outline">
              {STATUS_PAGAMENTO_ROTULO[pedido.status_pagamento] ?? pedido.status_pagamento}
            </Badge>
          </div>
          <p className="numeros mt-1 text-sm text-texto-2">
            {pedido.canal?.nome ?? "Canal"}
            {pedido.codigo_externo && ` · ${pedido.codigo_externo}`} ·{" "}
            {formatarData(pedido.data_pedido)}
            {pedido.cliente && ` · ${pedido.cliente.nome}`}
            {pedido.data_pagamento && ` · pago em ${formatarData(pedido.data_pagamento)}`}
            {pedido.data_envio && ` · enviado em ${formatarData(pedido.data_envio)}`}
          </p>
        </div>
        {editar && aberto && (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/vendas/pedidos/${pedido.id}/editar`}>Editar itens</Link>
          </Button>
        )}
      </div>
      {editar && (
        <MudarStatus
          pedido={{
            id: pedido.id,
            status_codigo: pedido.status?.codigo ?? null,
            data_envio: pedido.data_envio,
          }}
          lista={lista}
        />
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Itens</h2>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Item</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Custo est.</TableHead>
                  <TableHead className="text-right">Custo real</TableHead>
                  <TableHead>Produção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {pedido.itens.map((i) => {
                  const ordem = ordensPorItem.get(i.id);
                  return (
                    <TableRow key={i.id} className="h-11">
                      <TableCell className="pl-5">
                        {i.produto_id ? (
                          <Link
                            href={`/catalogo/produtos/${i.produto_id}`}
                            className="font-medium text-acao hover:underline"
                          >
                            {i.produto?.nome ?? i.titulo}
                          </Link>
                        ) : (
                          <span className="font-medium">{i.titulo ?? "Item"}</span>
                        )}
                        {i.variacao && <span className="text-texto-2"> · {i.variacao.nome}</span>}
                        {!i.produto_id && (
                          <span className="block text-xs text-texto-3">
                            fora do catálogo
                            {i.codigo_anuncio ? ` · anúncio ${i.codigo_anuncio}` : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{i.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {formatarMoeda(i.preco_unitario)}
                        {Number(i.desconto) > 0 && (
                          <span className="block text-xs text-texto-3">
                            desc. {formatarMoeda(i.desconto)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.custo_unitario_estimado == null ? (
                          <span className="text-texto-3">ao pagar</span>
                        ) : (
                          formatarMoeda(i.custo_unitario_estimado, 4)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.custo_unitario_realizado == null ? (
                          <span className="text-texto-3">ao enviar</span>
                        ) : (
                          formatarMoeda(i.custo_unitario_realizado, 4)
                        )}
                      </TableCell>
                      <TableCell>
                        {ordem ? (
                          <Link
                            href={`/producao/ordens/${ordem.id}`}
                            className="font-mono text-xs text-acao hover:underline"
                          >
                            {ordem.codigo} ({ordem.status})
                          </Link>
                        ) : podeProduzir && i.produto_id && !pedido.status?.fechado ? (
                          <BotaoOrdemDoItem itemId={i.id} />
                        ) : (
                          <span className="text-xs text-texto-3">Sem ordem</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Linha do tempo</h2>
            <ol className="space-y-2 rounded-2xl bg-card p-5 shadow-painel">
              {pedido.eventos.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="numeros text-texto-3">{formatarDataHora(e.em)}</span>
                  <span>
                    {e.de?.nome ? `${e.de.nome} para ` : ""}
                    <span className="font-medium">{e.para?.nome ?? "status"}</span>
                  </span>
                  {e.nota && <span className="text-texto-2">{e.nota}</span>}
                  <span className="text-xs text-texto-3">{e.origem}</span>
                </li>
              ))}
            </ol>
          </section>
          {pedido.observacoes && (
            <p className="text-sm whitespace-pre-line text-texto-2">{pedido.observacoes}</p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Resumo financeiro</h2>
          <ResumoFinanceiro r={resumo} />
          <p className="text-xs text-texto-3">
            Taxas{" "}
            {resumo?.origem_taxas === "canal"
              ? "informadas pelo canal"
              : "calculadas pelas taxas do canal no pedido"}
            . O recebível e a conciliação com o repasse chegam no financeiro.
          </p>
        </section>
      </div>
    </div>
  );
}
