import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import {
  listarContas,
  listarLancamentos,
  paraProjecao,
  realizacoesDoPeriodo,
} from "@/dados/financeiro/financeiro";
import { saldoProjetado, serieProjecao, totaisAbertos } from "@/dominio/financeiro/projecao";
import { dreGerencial } from "@/dominio/financeiro/dre";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Financeiro" };

function mesDe(data: string): { inicio: string; fim: string; rotulo: string } {
  const [ano, mes] = data.split("-").map(Number);
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  return {
    inicio: `${data.slice(0, 7)}-01`,
    fim,
    rotulo: `${String(mes).padStart(2, "0")}/${ano}`,
  };
}
function mesAnterior(data: string): string {
  const [ano, mes] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 10);
}

export default async function PaginaFinanceiro() {
  await exigirLeitura("financeiro");
  const hoje = hojeSaoPaulo();
  const mes = mesDe(hoje);
  const anterior = mesDe(mesAnterior(hoje));
  const [contas, abertosLista, realizacoesMes, realizacoesAnterior] = await Promise.all([
    listarContas(),
    listarLancamentos({ estado: "abertos", limite: 2000 }),
    realizacoesDoPeriodo(mes.inicio, mes.fim),
    realizacoesDoPeriodo(anterior.inicio, anterior.fim),
  ]);
  const saldoCaixa = contas
    .filter((c) => c.ativo)
    .reduce((acc, c) => acc + Number(c.saldo_atual ?? 0), 0);
  const abertos = paraProjecao(abertosLista);
  const totais = totaisAbertos(abertos, hoje);
  const serie = serieProjecao(saldoCaixa, abertos, hoje, 30);
  const em30 = saldoProjetado(saldoCaixa, abertos, serie[30].data, hoje);
  const dre = dreGerencial(realizacoesMes, mes.inicio, mes.fim);
  const dreAnterior = dreGerencial(realizacoesAnterior, anterior.inicio, anterior.fim);
  const variacao =
    dreAnterior.resultado !== 0
      ? (dre.resultado - dreAnterior.resultado) / Math.abs(dreAnterior.resultado)
      : null;
  const semContas = contas.length === 0;
  const minimo = Math.min(...serie.map((p) => p.saldo));
  const maximo = Math.max(...serie.map((p) => p.saldo));
  const faixa = maximo - minimo || 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Financeiro</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Caixa realizado por conta, projeção pelos lançamentos abertos e DRE gerencial do mês.
            Nenhum valor é estimativa, exceto o imposto provisionado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/financeiro/lancamentos?estado=abertos">Lançamentos abertos</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/financeiro/lancamentos?novo=1">Novo lançamento</Link>
          </Button>
        </div>
      </div>
      {semContas && (
        <Banner
          tipo="alerta"
          titulo="Nenhuma conta cadastrada"
          acao={
            <Button asChild size="sm" variant="outline">
              <Link href="/financeiro/contas?novo=1">Cadastrar conta</Link>
            </Button>
          }
        >
          Sem contas o caixa não tem onde ser realizado. Cadastre banco, carteira e o saldo de cada
          marketplace.
        </Banner>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <CartaoIndicador
          rotulo="Caixa realizado hoje"
          valor={semContas ? null : formatarMoeda(saldoCaixa)}
          dica="Cadastre contas"
          link={{ href: "/financeiro/contas", rotulo: "Ver contas" }}
        />
        <CartaoIndicador
          rotulo="Projetado em 30 dias"
          valor={semContas ? null : formatarMoeda(em30)}
          dica="Cadastre contas"
          rodape={
            <span className="text-xs text-texto-3">
              caixa mais abertos até {formatarData(serie[30].data)}
            </span>
          }
        />
        <CartaoIndicador
          rotulo="Vencidos"
          valor={`${formatarMoeda(totais.vencidos.receber)} / ${formatarMoeda(totais.vencidos.pagar)}`}
          rodape={<span className="text-xs text-texto-3">a receber / a pagar</span>}
          link={{ href: "/financeiro/lancamentos?estado=atrasado", rotulo: "Ver vencidos" }}
        />
        <CartaoIndicador
          rotulo="Próximos 7 dias"
          valor={`${formatarMoeda(totais.proximos7.receber)} / ${formatarMoeda(totais.proximos7.pagar)}`}
          rodape={<span className="text-xs text-texto-3">a receber / a pagar</span>}
        />
        <CartaoIndicador
          rotulo={`Resultado de ${mes.rotulo} (DRE)`}
          valor={formatarMoeda(dre.resultado)}
          variacao={
            variacao == null ? undefined : { percentual: variacao, rotulo: `vs ${anterior.rotulo}` }
          }
          rodape={
            <span className="text-xs text-texto-3">
              receitas {formatarMoeda(dre.receitas)} · fixas {formatarMoeda(dre.despesas_fixas)} ·
              variáveis {formatarMoeda(dre.despesas_variaveis)}
            </span>
          }
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Projeção de caixa, 30 dias</h2>
          <div className="rounded-2xl bg-card p-5 shadow-painel">
            <div className="flex h-32 items-end gap-[2px]" aria-label="Saldo projetado por dia">
              {serie.map((p) => (
                <div
                  key={p.data}
                  className={`flex-1 rounded-t-sm ${p.saldo < 0 ? "bg-erro/70" : "bg-acao/70"}`}
                  style={{ height: `${Math.max(4, ((p.saldo - minimo) / faixa) * 100)}%` }}
                  title={`${formatarData(p.data)}: ${formatarMoeda(p.saldo)}`}
                />
              ))}
            </div>
            <div className="numeros mt-2 flex justify-between text-xs text-texto-3">
              <span>
                {formatarData(serie[0].data)} · {formatarMoeda(serie[0].saldo)}
              </span>
              <span>
                {formatarData(serie[30].data)} · {formatarMoeda(serie[30].saldo)}
              </span>
            </div>
            <p className="mt-2 text-xs text-texto-3">
              Mínimo no período {formatarMoeda(minimo)}. Atrasados entram no dia de hoje.
              Transferências entre contas não entram.
            </p>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Saldo por conta</h2>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Conta</TableHead>
                  <TableHead className="text-right">Saldo atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {contas
                  .filter((c) => c.ativo)
                  .map((c) => (
                    <TableRow key={c.id} className="h-10">
                      <TableCell className="pl-5">{c.nome}</TableCell>
                      <TableCell
                        className={`text-right ${Number(c.saldo_atual) < 0 ? "text-erro" : ""}`}
                      >
                        {formatarMoeda(c.saldo_atual)}
                      </TableCell>
                    </TableRow>
                  ))}
                {contas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-texto-3">
                      Sem contas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">DRE gerencial de {mes.rotulo}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Receitas realizadas</TableHead>
                  <TableHead className="text-right">{formatarMoeda(dre.receitas)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {dre.linhas_receita.map((l) => (
                  <TableRow key={l.categoria} className="h-10">
                    <TableCell className="pl-5">{l.categoria}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(l.valor)}</TableCell>
                  </TableRow>
                ))}
                {dre.linhas_receita.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-4 text-center text-texto-3">
                      Nenhuma receita realizada no mês
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Despesas realizadas</TableHead>
                  <TableHead className="text-right">
                    {formatarMoeda(dre.despesas_fixas + dre.despesas_variaveis)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {dre.linhas_despesa.map((l) => (
                  <TableRow key={l.categoria} className="h-10">
                    <TableCell className="pl-5">
                      {l.categoria} <span className="text-xs text-texto-3">{l.natureza}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatarMoeda(l.valor)}</TableCell>
                  </TableRow>
                ))}
                {dre.linhas_despesa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-4 text-center text-texto-3">
                      Nenhuma despesa realizada no mês
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="text-xs text-texto-3">
          Fora da DRE: {formatarMoeda(dre.embutidas_no_custo)} em categorias embutidas no custo
          (filamento, energia, manutenção), que já chegam ao resultado pelo custo realizado das
          ordens. Mês anterior: resultado {formatarMoeda(dreAnterior.resultado)}
          {variacao != null && ` (${formatarPercentual(variacao, 1)})`}.
        </p>
      </section>
    </div>
  );
}
