import type { EntradasCalculo } from "@/dominio/custos/motor";
import type { ParametrosCusto } from "@/dominio/custos/parametros";
import type { ComponentesCusto, CustoHoraImpressora } from "@/dominio/custos/tipos";
import type { TaxasCanal } from "@/dominio/precos/preco";
import type { FichaProduto } from "./heranca";
import type { ResumoBom } from "./bom";

export type ContextoCalculoProduto = {
  ficha: FichaProduto;
  bom: ResumoBom;
  /** Custo por grama do insumo de impressão (custo de reposição). Null = sem custo. */
  custo_g: number | null;
  impressora: CustoHoraImpressora | null;
  parametros: ParametrosCusto;
  /** Taxas do canal sem imposto; o imposto vem do parâmetro. Null = sem canal (só custo). */
  canal: Omit<TaxasCanal, "imposto_pct"> | null;
  margem_alvo: number | null;
  markup_alvo: number | null;
  desligados: (keyof ComponentesCusto)[];
};

export const FALTA_ROTULO: Record<string, string> = {
  peso_g: "peso da peça",
  tempo_impressao_min: "tempo de impressão",
  custo_g: "custo do filamento (confirme uma compra ou defina custo manual no insumo)",
  impressora: "impressora com custo configurado",
  tarifa_kwh: "tarifa de energia nos parâmetros",
  custo_hora_mao_obra: "mão de obra nos parâmetros",
  metodo_rateio_fixo: "método de rateio do fixo nos parâmetros",
  fixo: "custo fixo e base de rateio nos parâmetros",
  imposto_pct_estimado: "imposto estimado nos parâmetros",
  bom_sem_custo: "custo dos complementares da BOM",
};

/**
 * Traduz a ficha do produto para as entradas do motor. Nada é assumido: cada campo sem valor
 * entra na lista `faltam` e o cálculo não acontece. Taxa de falha da ficha vence a padrão.
 */
export function montarEntradasProduto(
  c: ContextoCalculoProduto,
): { ok: true; entradas: EntradasCalculo } | { ok: false; faltam: string[] } {
  const faltam: string[] = [];
  const p = c.parametros;
  if (c.ficha.peso_g == null) faltam.push("peso_g");
  if (c.ficha.tempo_impressao_min == null) faltam.push("tempo_impressao_min");
  if (c.custo_g == null) faltam.push("custo_g");
  if (!c.impressora) faltam.push("impressora");
  if (p.tarifa_kwh == null) faltam.push("tarifa_kwh");
  if (p.custo_hora_mao_obra == null) faltam.push("custo_hora_mao_obra");
  if (p.metodo_rateio_fixo == null) faltam.push("metodo_rateio_fixo");
  if (
    p.metodo_rateio_fixo === "hora" &&
    (p.custo_fixo_mensal == null || p.horas_produtivas_mes == null)
  )
    faltam.push("fixo");
  if (
    p.metodo_rateio_fixo === "peca" &&
    (p.custo_fixo_mensal == null || p.volume_mensal_estimado == null)
  )
    faltam.push("fixo");
  if (c.canal && p.imposto_pct_estimado == null) faltam.push("imposto_pct_estimado");
  if (c.bom.sem_custo.length > 0) faltam.push("bom_sem_custo");
  if (faltam.length > 0) return { ok: false, faltam: [...new Set(faltam)] };
  return {
    ok: true,
    entradas: {
      peca: {
        peso_g: c.ficha.peso_g!,
        tempo_ciclo_min: c.ficha.tempo_impressao_min!,
        pecas_por_ciclo: c.ficha.pecas_por_ciclo ?? 1,
        taxa_falha: c.ficha.taxa_falha_pct ?? p.taxa_falha_padrao ?? 0,
        desperdicio: p.desperdicio_padrao ?? 0,
        custo_g: c.custo_g!,
        preparo_ciclo_min: c.ficha.tempo_preparo_min ?? 0,
        acabamento_peca_min: c.ficha.tempo_acabamento_min ?? 0,
        embalagem_peca_min: c.ficha.tempo_embalagem_min ?? 0,
        custo_hora_mao_obra: p.custo_hora_mao_obra!,
        complementares_peca: c.bom.por_peca,
        complementares_pedido: c.bom.por_pedido,
        impressora: c.impressora!,
        fixo: {
          metodo: p.metodo_rateio_fixo!,
          custo_fixo_mensal: p.custo_fixo_mensal ?? 0,
          horas_produtivas_mes: p.horas_produtivas_mes ?? 0,
          volume_mensal_estimado: p.volume_mensal_estimado ?? 0,
        },
        desligados: c.desligados,
      },
      canal: c.canal ? { ...c.canal, imposto_pct: p.imposto_pct_estimado! } : null,
      margem_alvo: c.margem_alvo ?? p.margem_alvo_padrao ?? null,
      markup_alvo: c.markup_alvo ?? p.markup_padrao ?? null,
    },
  };
}
