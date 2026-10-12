import Link from "next/link";
import type { ContextoProduto } from "@/dados/produtos/calculo";
import { entradasDoContexto } from "@/dados/produtos/calculo";
import type { PrecoVigente } from "@/dados/produtos/produtos";
import { calcularProduto } from "@/acoes/produtos/calculo";
import { calcular, type ResultadoCalculo } from "@/dominio/custos/motor";
import { COMPONENTES_ROTULO, type ComponentesCusto } from "@/dominio/custos/tipos";
import { avaliarPreco, precoPorMargem } from "@/dominio/precos/preco";
import { FALTA_ROTULO } from "@/dominio/produtos/calculo-produto";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarNumero } from "@/lib/formatos/numero";
import { formatarDataHora } from "@/lib/formatos/data";
import { Banner } from "@/componentes/painel/Banner";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
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

export function CustoProduto({
  ctx,
  calculoAtual,
  precos,
  editar,
}: {
  ctx: ContextoProduto;
  calculoAtual: ResultadoCalculo | null;
  precos: PrecoVigente[];
  editar: boolean;
}) {
  const p = ctx.produto;
  const montagem = entradasDoContexto(ctx, null);
  const previa = montagem.ok ? calcular(montagem.entradas) : null;
  const desatualizado = p.custo_atual != null && p.custo_atualizado_em == null;
  const mudaria =
    previa &&
    p.custo_atual != null &&
    Math.abs(previa.custo.custo_total - Number(p.custo_atual)) >= 0.00005;
  const alvo = p.margem_alvo ?? ctx.parametros?.dados.margem_alvo_padrao ?? null;
  const imposto = ctx.parametros?.dados.imposto_pct_estimado ?? null;
  const baseExata = previa
    ? { custo_total: previa.custo.exato.custo_total, fixo_rateado: previa.custo.exato.fixo_rateado }
    : null;
  return (
    <div className="space-y-5">
      {!montagem.ok && (
        <Banner tipo="alerta" titulo="Faltam dados para calcular">
          {montagem.faltam.map((f) => FALTA_ROTULO[f] ?? f).join("; ")}.
        </Banner>
      )}
      {(desatualizado || mudaria) && montagem.ok && (
        <Banner
          tipo="info"
          titulo={desatualizado ? "Custo desatualizado" : "Os dados mudaram desde o último cálculo"}
        >
          {previa && `Se recalcular agora: ${formatarMoeda(previa.custo.custo_total, 4)} por peça.`}
        </Banner>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <div className="rounded-2xl bg-card p-5 shadow-painel">
            <p className="text-[13px] text-texto-2">Custo por peça (último cálculo)</p>
            <p className="numeros mt-1 text-[30px] leading-none font-semibold tracking-[-0.02em]">
              {p.custo_atual == null ? (
                <span className="text-xl text-texto-3">Sem cálculo</span>
              ) : (
                formatarMoeda(p.custo_atual, 4)
              )}
            </p>
            <p className="mt-2 text-xs text-texto-3">
              {p.custo_atualizado_em
                ? `calculado em ${formatarDataHora(p.custo_atualizado_em)}`
                : desatualizado
                  ? "marcado para recálculo"
                  : "calcule para ter o número"}
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-painel">
            <p className="text-[13px] text-texto-2">Só variável (vai para a ordem)</p>
            <p className="numeros mt-1 text-lg font-semibold">
              {p.custo_variavel_atual == null
                ? "Sem cálculo"
                : formatarMoeda(p.custo_variavel_atual, 4)}
            </p>
            <p className="mt-2 text-xs text-texto-3">
              {ctx.insumo
                ? `${ctx.insumo.nome}: ${ctx.custo_g == null ? "sem custo" : `R$ ${formatarNumero(ctx.custo_g * 1000, 2)}/kg (${ctx.insumo.origem})`}`
                : "filamento não definido"}
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-painel">
            <p className="text-[13px] text-texto-2">Complementares (BOM)</p>
            <p className="numeros mt-1 text-lg font-semibold">
              {formatarMoeda(ctx.bom.por_peca, 4)}{" "}
              <span className="text-sm text-texto-2">por peça</span>
            </p>
            <p className="mt-2 text-xs text-texto-3">
              {formatarMoeda(ctx.bom.por_pedido, 4)} por pedido
              {ctx.bom.sem_custo.length > 0 && ` · sem custo: ${ctx.bom.sem_custo.join(", ")}`}
            </p>
          </div>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            {p.calculo_atual_id && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/catalogo/precificacao?base=${p.calculo_atual_id}`}>
                  Abrir na calculadora
                </Link>
              </Button>
            )}
            <BotaoAcao variant="secondary" acao={calcularProduto.bind(null, p.id, null)}>
              {p.custo_atual == null ? "Calcular custo" : "Recalcular agora"}
            </BotaoAcao>
          </div>
        )}
      </div>
      {calculoAtual && (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                <TableHead className="pl-5">Componente</TableHead>
                <TableHead className="text-right">Último cálculo</TableHead>
                {previa && <TableHead className="text-right">Se recalcular agora</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {(Object.keys(calculoAtual.custo.componentes) as (keyof ComponentesCusto)[]).map(
                (k) => (
                  <TableRow key={k} className="h-10">
                    <TableCell className="pl-5">{COMPONENTES_ROTULO[k]}</TableCell>
                    <TableCell className="text-right">
                      {formatarMoeda(calculoAtual.custo.componentes[k], 4)}
                    </TableCell>
                    {previa && (
                      <TableCell className="text-right text-texto-2">
                        {formatarMoeda(previa.custo.componentes[k], 4)}
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}
              <TableRow className="h-10 font-semibold">
                <TableCell className="pl-5">Total por peça boa</TableCell>
                <TableCell className="text-right">
                  {formatarMoeda(calculoAtual.custo.custo_total, 4)}
                </TableCell>
                {previa && (
                  <TableCell className="text-right">
                    {formatarMoeda(previa.custo.custo_total, 4)}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Margem por canal no preço vigente</h3>
        {precos.filter((pr) => !pr.variacao_id).length === 0 ? (
          <p className="text-sm text-texto-2">Nenhum preço vigente. Registre na aba Preços.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Canal</TableHead>
                  <TableHead className="text-right">Preço vigente</TableHead>
                  <TableHead className="text-right">Lucro por peça</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Preço para a margem alvo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {precos
                  .filter((pr) => !pr.variacao_id)
                  .map((pr) => {
                    const canal = ctx.canais.find((c) => c.id === pr.canal_id);
                    if (!canal) return null;
                    const pode =
                      canal.taxas && imposto != null && baseExata && pr.preco_venda != null;
                    const av = pode
                      ? avaliarPreco(
                          {
                            ...baseExata!,
                            complementares_pedido: ctx.bom.por_pedido,
                            canal: { ...canal.taxas!, imposto_pct: imposto! },
                          },
                          pr.preco_venda!,
                        )
                      : null;
                    const sugerido =
                      pode && alvo != null
                        ? precoPorMargem(
                            {
                              ...baseExata!,
                              complementares_pedido: ctx.bom.por_pedido,
                              canal: { ...canal.taxas!, imposto_pct: imposto! },
                            },
                            alvo,
                          )
                        : null;
                    return (
                      <TableRow key={pr.id} className="h-11">
                        <TableCell className="pl-5 font-medium">{canal.nome}</TableCell>
                        <TableCell className="text-right">
                          {formatarMoeda(pr.preco_venda)}
                        </TableCell>
                        <TableCell className="text-right">
                          {av ? (
                            formatarMoeda(av.lucro)
                          ) : (
                            <span className="text-texto-3">
                              {!canal.taxas
                                ? "canal sem taxas"
                                : imposto == null
                                  ? "sem imposto nos parâmetros"
                                  : "sem custo"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {av ? (
                            <span
                              className={
                                alvo != null && av.margem < alvo ? "text-alerta" : "text-sucesso"
                              }
                            >
                              {formatarPercentual(av.margem, 1)}
                              {alvo != null && av.margem < alvo && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 border-alerta/40 text-alerta"
                                >
                                  abaixo de {formatarPercentual(alvo, 0)}
                                </Badge>
                              )}
                            </span>
                          ) : (
                            "Sem dados"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sugerido ? (
                            sugerido.viavel ? (
                              formatarMoeda(sugerido.preco)
                            ) : (
                              "Inviável"
                            )
                          ) : alvo == null ? (
                            <span className="text-texto-3">sem margem alvo</span>
                          ) : (
                            "Sem dados"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
