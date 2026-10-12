import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Periodo } from "@/componentes/painel/SeletorPeriodo";
import { intervaloDoPeriodo } from "@/lib/formatos/periodo";
import { contarAlertasAbertos } from "./alertas";
import { contarConhecimentosAtivos } from "./conhecimento";
import { consumoFilamentoNoPeriodo, contarAbaixoMinimo } from "./estoque/insumos";
import { contarCalculos } from "./custos/calculos";
import { contarOrdensAbertas } from "./producao/ordens";
import { totalPecasProntas } from "./produtos/estoque-produtos";
import { contarPedidosAbertos, faturamentoNoPeriodo } from "./vendas/pedidos";
import { listarLancamentos, paraProjecao, realizadoNoPeriodo } from "./financeiro/financeiro";
import { totaisAbertos, type TotaisAbertos } from "@/dominio/financeiro/projecao";
import { lerPapel, podeLer } from "@/lib/auth/papeis";
import { proximosItens, type ProximosItens } from "./planejamento/planejamento";
import { hojeSaoPaulo } from "@/lib/formatos/data";

export type ResumoInicial = {
  alertasAbertos: number;
  canaisTotal: number;
  canaisComTaxas: number;
  conhecimentosAtivos: number;
  insumosAbaixoMinimo: number;
  /** Gramas consumidas no período; null quando não há filamento cadastrado. */
  consumoFilamentoG: number | null;
  calculosSalvos: number;
  ordensAbertas: number;
  pecasProntas: number;
  pedidosAbertos: number;
  /** Base de vendas dos pedidos pagos no período; null quando não há pedido nenhum. */
  faturamento: { total: number; pedidos: number } | null;
  /** Só para o dono; null para os demais papéis ou sem lançamentos. */
  financeiro: { recebido: number; pago: number; abertos: TotaisAbertos } | null;
  /** Próximos 7 dias e atrasados do planejamento; null quando o papel não lê. */
  planejamento: (ProximosItens & { hoje: string }) | null;
};

export async function resumoInicial(
  periodo: Periodo,
  papel: unknown = null,
): Promise<ResumoInicial> {
  const supabase = await clienteServidor();
  const papelLido = lerPapel(papel);
  const dono = papelLido === "dono";
  const lePlanejamento = papelLido !== null && podeLer(papelLido, "planejamento");
  const hojeSp = hojeSaoPaulo();
  const { inicio, fim } = intervaloDoPeriodo(periodo);
  const [
    { data: canais },
    alertasAbertos,
    conhecimentosAtivos,
    insumosAbaixoMinimo,
    consumoFilamentoG,
    calculosSalvos,
    ordensAbertas,
    pecasProntas,
    pedidosAbertos,
    faturamento,
    realizado,
    abertos,
    planejamento,
  ] = await Promise.all([
    supabase.from("canais_venda_vigentes").select("id, comissao_pct").eq("ativo", true),
    contarAlertasAbertos(),
    contarConhecimentosAtivos(),
    contarAbaixoMinimo(),
    consumoFilamentoNoPeriodo(inicio, fim),
    contarCalculos(),
    contarOrdensAbertas(),
    totalPecasProntas(),
    contarPedidosAbertos(),
    faturamentoNoPeriodo(inicio, fim),
    dono ? realizadoNoPeriodo(inicio, fim) : Promise.resolve(null),
    dono ? listarLancamentos({ estado: "abertos", limite: 2000 }) : Promise.resolve([]),
    lePlanejamento ? proximosItens(hojeSp, 7) : Promise.resolve(null),
  ]);
  const hoje = new Date().toISOString().slice(0, 10);
  const lista = canais ?? [];
  return {
    alertasAbertos,
    conhecimentosAtivos,
    insumosAbaixoMinimo,
    consumoFilamentoG,
    calculosSalvos,
    ordensAbertas,
    pecasProntas,
    pedidosAbertos,
    faturamento,
    financeiro:
      dono && realizado
        ? { ...realizado, abertos: totaisAbertos(paraProjecao(abertos), hoje) }
        : null,
    planejamento: planejamento ? { ...planejamento, hoje: hojeSp } : null,
    canaisTotal: lista.length,
    canaisComTaxas: lista.filter((c) => c.comissao_pct !== null).length,
  };
}
