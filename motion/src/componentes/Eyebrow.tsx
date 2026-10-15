/**
 * Rótulo de seção: Chakra Petch SemiBold em maiúsculas, tracking largo.
 * Ciano sobre o preto; cinza de texto quando o ciano já está em uso no quadro.
 */
import React from "react";
import { cores } from "../marca/cores";
import { fontes, pesos } from "../marca/tipografia";

export const Eyebrow: React.FC<{
  children: React.ReactNode;
  tamanho: number;
  cor?: string;
  style?: React.CSSProperties;
}> = ({ children, tamanho, cor = cores.ciano, style }) => (
  <div
    style={{
      fontFamily: fontes.etiqueta,
      fontWeight: pesos.etiqueta,
      fontSize: tamanho,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: cor,
      ...style,
    }}
  >
    {children}
  </div>
);
