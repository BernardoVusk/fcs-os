import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarProvisoes, listarTributos, tributoVigente } from "@/dados/financeiro/financeiro";
import { provisionarImposto, provisionarMesAtual } from "@/acoes/financeiro/cadastros";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData, hojeSaoPaulo } from "@/lib/formatos/data";
import { FormTributo } from "@/componentes/financeiro/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Banner } from "@/componentes/painel/Banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";

export const metadata = { title: "Impostos" };

export default async function PaginaImpostos() {
  const usuario = await exigirLeitura("financeiro");
  const [vigente, historico, provisoes] = await Promise.all([
    tributoVigente(),
    listarTributos(),
    listarProvisoes(),
  ]);
  const editar = podeEscrever(usuario.papel, "financeiro");
  const hoje = hojeSaoPaulo();
  const [ano, mes] = hoje.split("-").map(Number);
  const mesAnterior = new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 7);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Impostos</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Estimativa pela alíquota efetiva informada; não substitui o contador. A provisão vira um
            pagável por competência e é realizada com o valor real da guia.
          </p>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            <BotaoAcao variant="secondary" acao={provisionarImposto.bind(null, mesAnterior)}>
              Provisionar {mesAnterior}
            </BotaoAcao>
            <BotaoAcao variant="secondary" acao={provisionarMesAtual}>
              Provisionar mês atual
            </BotaoAcao>
            <DialogoNovo rotulo="Novo parâmetro" titulo="Parâmetro tributário">
              <FormTributo />
            </DialogoNovo>
          </div>
        )}
      </div>
      {!vigente ? (
        <Banner tipo="alerta" titulo="Regime e alíquota não configurados">
          Sem alíquota nenhum imposto é estimado. Nada é assumido.
        </Banner>
      ) : (
        <Banner
          tipo="info"
          titulo={`${vigente.regime}: ${formatarPercentual(vigente.aliquota_efetiva_pct, 2)} sobre ${vigente.base === "receita_liquida" ? "a receita líquida" : "o faturamento bruto"}`}
        >
          Vence dia {vigente.dia_vencimento} do mês seguinte. Vigente desde{" "}
          {formatarData(vigente.vigente_desde)}.
        </Banner>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Provisões por competência</h2>
        {provisoes.length === 0 ? (
          <p className="text-sm text-texto-2">
            Nenhuma provisão. Use Provisionar depois de registrar os pedidos pagos do mês.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Competência</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Alíquota</TableHead>
                  <TableHead className="text-right">Imposto estimado</TableHead>
                  <TableHead>Lançamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {provisoes.map((p) => (
                  <TableRow key={p.id} className="h-11">
                    <TableCell className="pl-5">{p.competencia.slice(0, 7)}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(p.base_calculo)}</TableCell>
                    <TableCell className="text-right">
                      {formatarPercentual(p.aliquota, 2)}
                    </TableCell>
                    <TableCell className="text-right">{formatarMoeda(p.valor)}</TableCell>
                    <TableCell>
                      {p.lancamento ? (
                        <a
                          href={`/financeiro/lancamentos?destaque=${p.lancamento.id}`}
                          className="text-acao hover:underline"
                        >
                          {formatarMoeda(p.lancamento.valor_previsto)}
                        </a>
                      ) : (
                        <span className="text-texto-3">sem pagável (base zero)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Histórico de parâmetros</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhum parâmetro registrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card shadow-painel">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                  <TableHead className="pl-5">Vigente desde</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead className="text-right">Alíquota</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="numeros">
                {historico.map((t) => (
                  <TableRow key={t.id} className="h-11">
                    <TableCell className="pl-5">{formatarData(t.vigente_desde)}</TableCell>
                    <TableCell>{t.regime}</TableCell>
                    <TableCell className="text-right">
                      {formatarPercentual(t.aliquota_efetiva_pct, 2)}
                    </TableCell>
                    <TableCell>
                      {t.base === "receita_liquida" ? "Receita líquida" : "Faturamento bruto"}
                    </TableCell>
                    <TableCell className="text-texto-2">{t.observacoes ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
