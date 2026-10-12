import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { lerPeriodo, PERIODOS, SeletorPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { intervaloDoPeriodo } from "@/lib/formatos/periodo";
import { formatarData } from "@/lib/formatos/data";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarNumero } from "@/lib/formatos/numero";
import { relatorios } from "@/dados/relatorios/relatorios";
import { RELATORIOS, relatorioValido, type Relatorio } from "@/dominio/relatorios/planilhas";
import { Button } from "@/componentes/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

const moeda = (v: number | string | null | undefined) =>
  v == null || v === "" ? <span className="text-texto-3">Sem dados</span> : formatarMoeda(v);
const pct = (v: number | null | undefined) =>
  v == null ? <span className="text-texto-3">Sem dados</span> : formatarPercentual(v, 1);
const num = (v: number | string | null | undefined, casas = 0) =>
  v == null || v === "" ? (
    <span className="text-texto-3">Sem dados</span>
  ) : (
    formatarNumero(v, casas)
  );

function Vazio({ texto }: { texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={12} className="py-8 text-center text-texto-3">
        {texto}
      </TableCell>
    </TableRow>
  );
}

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; aba?: string }>;
}) {
  await exigirLeitura("relatorios");
  const sp = await searchParams;
  const periodo = lerPeriodo(sp.periodo);
  const aba: Relatorio = relatorioValido(sp.aba) ? sp.aba : "produto";
  const dados = await relatorios(intervaloDoPeriodo(periodo));
  const rotuloPeriodo = PERIODOS.find((p) => p.chave === periodo)?.rotulo ?? periodo;
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  const exportar = (formato: "csv" | "xlsx", relatorio: string = aba) =>
    `/relatorios/exportar?relatorio=${relatorio}&periodo=${periodo}&formato=${formato}`;
  const cabecalho = "bg-superficie-2/60 hover:bg-superficie-2/60";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Só dados reais: pedidos pagos, ordens concluídas e consumo registrado. {rotuloPeriodo}:{" "}
            {dados.totais.pedidos} pedido(s) pago(s), {dados.totais.ordens} ordem(ns) concluída(s).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={exportar("csv")}>CSV</a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={exportar("xlsx")}>XLSX</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exportar("xlsx", "tudo")}>Tudo em XLSX</a>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Relatório"
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
        >
          {RELATORIOS.map((r) => (
            <Link
              key={r.chave}
              href={`/relatorios?aba=${r.chave}&periodo=${periodo}`}
              className={pilula(aba === r.chave)}
              aria-current={aba === r.chave ? "page" : undefined}
            >
              {r.rotulo}
            </Link>
          ))}
        </nav>
        {aba !== "consumo" && <SeletorPeriodo atual={periodo} base={`/relatorios?aba=${aba}`} />}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
        {aba === "produto" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custo estimado</TableHead>
                <TableHead className="text-right">Custo realizado</TableHead>
                <TableHead className="text-right">Resultado est.</TableHead>
                <TableHead className="text-right">Resultado real</TableHead>
                <TableHead className="text-right">Margem est.</TableHead>
                <TableHead className="text-right">Margem real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.porProduto.length === 0 && <Vazio texto="Nenhum pedido pago no período." />}
              {dados.porProduto.map((p) => (
                <TableRow key={p.produto_id ?? "avulso"} className="h-10">
                  <TableCell className="pl-5 font-sans">
                    {p.produto_id ? (
                      <Link href={`/catalogo/produtos/${p.produto_id}`} className="hover:underline">
                        {p.produto}
                      </Link>
                    ) : (
                      p.produto
                    )}
                  </TableCell>
                  <TableCell className="text-right">{p.quantidade}</TableCell>
                  <TableCell className="text-right">{p.pedidos}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(p.receita)}</TableCell>
                  <TableCell className="text-right">{moeda(p.custo_estimado)}</TableCell>
                  <TableCell className="text-right">{moeda(p.custo_realizado)}</TableCell>
                  <TableCell className="text-right">{moeda(p.resultado_estimado)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      p.resultado_real != null && p.resultado_real < 0 && "text-erro",
                    )}
                  >
                    {moeda(p.resultado_real)}
                  </TableCell>
                  <TableCell className="text-right">{pct(p.margem_estimada)}</TableCell>
                  <TableCell className="text-right">{pct(p.margem_real)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {aba === "canal" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Canal</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Base de vendas</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
                <TableHead className="text-right">Taxa média</TableHead>
                <TableHead className="text-right">Receita líquida</TableHead>
                <TableHead className="text-right">Custo est.</TableHead>
                <TableHead className="text-right">Resultado est.</TableHead>
                <TableHead className="text-right">Margem est.</TableHead>
                <TableHead className="text-right">Resultado real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.porCanal.length === 0 && <Vazio texto="Nenhum pedido pago no período." />}
              {dados.porCanal.map((c) => (
                <TableRow key={c.canal_id} className="h-10">
                  <TableCell className="pl-5 font-sans">{c.canal}</TableCell>
                  <TableCell className="text-right">{c.pedidos}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(c.base_vendas)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(c.taxas_canal)}</TableCell>
                  <TableCell className="text-right">{pct(c.taxa_media)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(c.receita_liquida)}</TableCell>
                  <TableCell className="text-right">{moeda(c.custo_estimado)}</TableCell>
                  <TableCell className="text-right">{moeda(c.resultado_estimado)}</TableCell>
                  <TableCell className="text-right">{pct(c.margem_estimada)}</TableCell>
                  <TableCell className="text-right">{moeda(c.resultado_real)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {aba === "pedidos" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Pedido</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Base de vendas</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
                <TableHead className="text-right">A receber</TableHead>
                <TableHead className="text-right">Receita líquida</TableHead>
                <TableHead className="text-right">Custo est.</TableHead>
                <TableHead className="text-right">Resultado est.</TableHead>
                <TableHead className="text-right">Resultado real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.pedidos.length === 0 && <Vazio texto="Nenhum pedido pago no período." />}
              {dados.pedidos.map((p) => (
                <TableRow key={p.pedido_id} className="h-10">
                  <TableCell className="pl-5">
                    <Link href={`/vendas/pedidos/${p.pedido_id}`} className="hover:underline">
                      {p.codigo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatarData(p.data_pagamento)}</TableCell>
                  <TableCell className="font-sans">{p.canal_nome}</TableCell>
                  <TableCell className="text-right">{moeda(p.base_vendas)}</TableCell>
                  <TableCell className="text-right">{moeda(p.taxas_canal)}</TableCell>
                  <TableCell className="text-right">{moeda(p.valor_a_receber)}</TableCell>
                  <TableCell className="text-right">{moeda(p.receita_liquida)}</TableCell>
                  <TableCell className="text-right">{moeda(p.custo_estimado)}</TableCell>
                  <TableCell className="text-right">{moeda(p.resultado_estimado)}</TableCell>
                  <TableCell className="text-right">{moeda(p.resultado_real)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {aba === "custo" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Produto</TableHead>
                <TableHead className="text-right">Ordens</TableHead>
                <TableHead className="text-right">Peças</TableHead>
                <TableHead className="text-right">Estimado</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Est. por peça</TableHead>
                <TableHead className="text-right">Real por peça</TableHead>
                <TableHead className="text-right">Desvio</TableHead>
                <TableHead className="text-right">Desvio %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.custoRealVsEstimado.length === 0 && (
                <Vazio texto="Nenhuma ordem concluída com custo estimado e realizado no período." />
              )}
              {dados.custoRealVsEstimado.map((c) => (
                <TableRow key={c.produto_id} className="h-10">
                  <TableCell className="pl-5 font-sans">
                    <Link href={`/catalogo/produtos/${c.produto_id}`} className="hover:underline">
                      {c.produto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{c.ordens}</TableCell>
                  <TableCell className="text-right">{c.pecas}</TableCell>
                  <TableCell className="text-right">{moeda(c.estimado_total)}</TableCell>
                  <TableCell className="text-right">{moeda(c.realizado_total)}</TableCell>
                  <TableCell className="text-right">
                    {c.estimado_por_peca == null ? "" : formatarMoeda(c.estimado_por_peca, 4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.realizado_por_peca == null ? "" : formatarMoeda(c.realizado_por_peca, 4)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      (c.desvio ?? 0) > 0 && "text-erro",
                      (c.desvio ?? 0) < 0 && "text-sucesso",
                    )}
                  >
                    {moeda(c.desvio)}
                  </TableCell>
                  <TableCell className="text-right">{pct(c.desvio_pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {aba === "impressoras" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Impressora</TableHead>
                <TableHead className="text-right">Ordens</TableHead>
                <TableHead className="text-right">Horas reais</TableHead>
                <TableHead className="text-right">Horas previstas</TableHead>
                <TableHead className="text-right">Desvio de tempo</TableHead>
                <TableHead className="text-right">Aprovadas</TableHead>
                <TableHead className="text-right">Perdidas</TableHead>
                <TableHead className="text-right">Falha real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.impressoras.length === 0 && (
                <Vazio texto="Nenhuma ordem concluída no período." />
              )}
              {dados.impressoras.map((i) => (
                <TableRow key={i.impressora_id ?? "sem"} className="h-10">
                  <TableCell className="pl-5 font-sans">
                    {i.impressora_id ? (
                      <Link
                        href={`/producao/impressoras/${i.impressora_id}`}
                        className="hover:underline"
                      >
                        {i.impressora}
                      </Link>
                    ) : (
                      i.impressora
                    )}
                  </TableCell>
                  <TableCell className="text-right">{i.ordens}</TableCell>
                  <TableCell className="text-right">{num(i.horas_reais, 1)}</TableCell>
                  <TableCell className="text-right">{num(i.horas_previstas, 1)}</TableCell>
                  <TableCell className="text-right">{pct(i.desvio_tempo_pct)}</TableCell>
                  <TableCell className="text-right">{i.aprovadas}</TableCell>
                  <TableCell className="text-right">{i.perdidas}</TableCell>
                  <TableCell className={cn("text-right", (i.falha_real ?? 0) > 0.1 && "text-erro")}>
                    {pct(i.falha_real)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {aba === "consumo" && (
          <Table>
            <TableHeader>
              <TableRow className={cabecalho}>
                <TableHead className="pl-5">Mês</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Gramas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="numeros">
              {dados.consumo.length === 0 && (
                <Vazio texto="Nenhum consumo de filamento registrado nos últimos 12 meses." />
              )}
              {dados.consumo.flatMap((m) => [
                <TableRow key={m.mes} className="h-10 bg-superficie-2/30">
                  <TableCell className="pl-5 font-semibold">{m.mes}</TableCell>
                  <TableCell className="font-sans font-semibold">Total do mês</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatarNumero(m.quantidade_g, 0)} g
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatarMoeda(m.valor)}
                  </TableCell>
                </TableRow>,
                ...m.por_insumo.map((i) => (
                  <TableRow key={`${m.mes}-${i.insumo_id}`} className="h-9">
                    <TableCell className="pl-5" />
                    <TableCell className="font-sans">
                      <Link href={`/estoque/insumos/${i.insumo_id}`} className="hover:underline">
                        {i.insumo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatarNumero(i.quantidade_g, 0)} g
                    </TableCell>
                    <TableCell className="text-right">{formatarMoeda(i.valor)}</TableCell>
                  </TableRow>
                )),
              ])}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
