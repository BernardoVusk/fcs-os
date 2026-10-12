import { calcularCustoPeca } from "./custo-peca";
import type { EntradasPeca, ResultadoCusto } from "./tipos";
import { cenarios, type Cenarios, type TaxasCanal } from "@/dominio/precos/preco";

/** Muda quando uma fórmula muda; fica gravada em cada cálculo salvo. */
export const VERSAO_MOTOR = "4.0.0";

export type EntradasCalculo = {
  peca: EntradasPeca;
  /** Null quando é simulação sem canal: só custo, sem preço. */
  canal: TaxasCanal | null;
  margem_alvo: number | null;
  markup_alvo: number | null;
};

export type ResultadoCalculo = {
  versao_motor: string;
  custo: ResultadoCusto;
  preco: Cenarios | null;
};

/** Custo por peça e cenários de preço. Pura e determinística: as mesmas entradas dão o mesmo resultado em qualquer versão de parâmetros. */
export function calcular(e: EntradasCalculo): ResultadoCalculo {
  const custo = calcularCustoPeca(e.peca);
  const preco = e.canal
    ? cenarios(
        {
          custo_total: custo.exato.custo_total,
          fixo_rateado: custo.exato.fixo_rateado,
          complementares_pedido: e.peca.complementares_pedido,
          canal: e.canal,
        },
        { margem: e.margem_alvo, markup: e.markup_alvo },
      )
    : null;
  return { versao_motor: VERSAO_MOTOR, custo, preco };
}
