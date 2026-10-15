/**
 * Contador animado — numero subindo de 0 ate o valor.
 *
 * Enquanto conta, o contador **e** a camada de ambiente: cada troca de glifo e
 * uma mudanca grande e local na imagem. Por isso ele sustenta sozinho a fluidez
 * do trecho em que roda. Quando para, precisa de outra coisa em movimento.
 *
 * Todo numero sai de `src/marca/empresa.ts` (indicadores com data e fonte).
 * Nunca inventar numero: o que nao foi coletado nao vira contador.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { cores } from "../marca/cores";
import { fontes, pesos } from "../marca/tipografia";

/** Formata no padrao pt-BR: ponto como separador de milhar, virgula decimal. */
const formatar = (n: number, decimais: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });

export const Contador: React.FC<{
  /** Valor final. */
  ate: number;
  de?: number;
  /** Frame em que a contagem comeca. */
  inicio: number;
  /** Quantos frames a contagem leva. Faixa util: 40–60. */
  duracao: number;
  tamanho: number;
  cor?: string;
  prefixo?: string;
  sufixo?: string;
  decimais?: number;
  /** Opacidade externa, pra quem controla o ciclo de vida do elemento. */
  opacidade?: number;
  style?: React.CSSProperties;
}> = ({
  ate,
  de = 0,
  inicio,
  duracao,
  tamanho,
  cor = cores.ciano,
  prefixo = "",
  sufixo = "",
  decimais = 0,
  opacidade = 1,
  style,
}) => {
  const frame = useCurrentFrame();

  // Desaceleracao no fim: o numero chega e assenta, sem overshoot.
  // A marca encaixa seco, nao quica.
  const valor = interpolate(frame, [inicio, inicio + duracao], [de, ate], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <div
      style={{
        fontFamily: fontes.titulo,
        fontWeight: pesos.titulo,
        fontSize: tamanho,
        lineHeight: 1,
        color: cor,
        opacity: opacidade,
        // Evita o numero "dancar" de largura a cada troca de digito.
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {prefixo}
      {formatar(valor, decimais)}
      {sufixo}
    </div>
  );
};
