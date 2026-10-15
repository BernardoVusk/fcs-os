/**
 * Grade de indicadores e par antes/depois.
 *
 * Regra da marca, inegociavel: **todo antes/depois mostra os dois lados**.
 * Numero de resultado sem o valor "antes" ao lado e proibido. O "antes" fica em
 * cinza, apagado, pra leitura comparativa imediata.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { Contador } from "./Contador";
import { cores } from "../marca/cores";
import { fontes, pesos } from "../marca/tipografia";

export type Kpi = {
  valor: number;
  rotulo: string;
  prefixo?: string;
  sufixo?: string;
  decimais?: number;
};

/** Entrada de um item: sobe e aparece, com stagger. */
const useEntrada = (inicio: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [inicio, inicio + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
};

const ItemKpi: React.FC<{
  kpi: Kpi;
  inicio: number;
  tamanhoNumero: number;
  tamanhoRotulo: number;
  cor: string;
}> = ({ kpi, inicio, tamanhoNumero, tamanhoRotulo, cor }) => {
  const entrada = useEntrada(inicio);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: tamanhoRotulo * 0.6,
        opacity: entrada,
        transform: `translateY(${(1 - entrada) * 16}px)`,
      }}
    >
      <Contador
        ate={kpi.valor}
        inicio={inicio}
        duracao={45}
        tamanho={tamanhoNumero}
        cor={cor}
        prefixo={kpi.prefixo}
        sufixo={kpi.sufixo}
        decimais={kpi.decimais}
      />
      <div
        style={{
          fontFamily: fontes.etiqueta,
          fontWeight: pesos.etiqueta,
          fontSize: tamanhoRotulo,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: cores.cinzaTexto,
          textAlign: "center",
        }}
      >
        {kpi.rotulo}
      </div>
    </div>
  );
};

export const GradeKpi: React.FC<{
  kpis: Kpi[];
  inicio: number;
  /** Atraso entre itens. Em video o util e 3–6 frames. */
  stagger?: number;
  tamanhoNumero: number;
  tamanhoRotulo: number;
  cor?: string;
  /** Vertical empilha; use em reels com mais de dois itens. */
  direcao?: "linha" | "coluna";
  gap?: number;
}> = ({
  kpis,
  inicio,
  stagger = 6,
  tamanhoNumero,
  tamanhoRotulo,
  cor = cores.ciano,
  direcao = "linha",
  gap,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: direcao === "linha" ? "row" : "column",
      alignItems: "center",
      justifyContent: "center",
      gap: gap ?? tamanhoNumero * 0.9,
    }}
  >
    {kpis.map((kpi, i) => (
      <ItemKpi
        key={kpi.rotulo}
        kpi={kpi}
        inicio={inicio + i * stagger}
        tamanhoNumero={tamanhoNumero}
        tamanhoRotulo={tamanhoRotulo}
        cor={cor}
      />
    ))}
  </div>
);

/**
 * Par antes/depois. Os dois lados sempre — o "antes" apagado em cinza, o
 * "depois" em ciano cheio, com o chanfro de 45° da marca entre eles.
 */
export const AntesDepois: React.FC<{
  antes: Kpi;
  depois: Kpi;
  inicio: number;
  tamanhoNumero: number;
  tamanhoRotulo: number;
}> = ({ antes, depois, inicio, tamanhoNumero, tamanhoRotulo }) => {
  const seta = useEntrada(inicio + 10);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: tamanhoNumero * 0.5,
      }}
    >
      <ItemKpi
        kpi={antes}
        inicio={inicio}
        tamanhoNumero={tamanhoNumero * 0.72}
        tamanhoRotulo={tamanhoRotulo}
        cor={cores.cinzaTexto}
      />
      {/* Chanfro de 45° da marca como separador, desenhando da esquerda */}
      <div
        style={{
          width: tamanhoNumero * 0.5,
          height: Math.max(3, tamanhoNumero * 0.05),
          background: cores.ciano,
          transform: `skewX(-45deg) scaleX(${seta})`,
          transformOrigin: "left center",
        }}
      />
      <ItemKpi
        kpi={depois}
        inicio={inicio + 18}
        tamanhoNumero={tamanhoNumero}
        tamanhoRotulo={tamanhoRotulo}
        cor={cores.ciano}
      />
    </div>
  );
};
