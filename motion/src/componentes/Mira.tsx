/**
 * A mira: quatro cantoneiras com o canto cortado a 45° (o chanfro do logo),
 * linguagem de HUD de game e de telemetria de F1. É o "olhe aqui" da casa:
 * fecha sobre o elemento que a peça está nomeando, trava e pulsa enquanto ele
 * importa. Acompanha o zoom de destaque (receitas.md §1, aprendizado A18).
 *
 * Sempre ciano cheio. Entra e sai pelo comprimento das cantoneiras, nunca por
 * opacidade (E2). O pulso de brilho é acento curto, não estado parado.
 *
 * Posicionada pela caixa do alvo, em px do pai (`position: absolute`).
 */
import React from "react";

import { brilho, cores } from "../marca/cores";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const Mira: React.FC<{
  /** Caixa do alvo, em px do pai. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** 0–1: as cantoneiras crescem a partir do canto. */
  entrada: number;
  /** 0–1: as cantoneiras fecham de longe até encostar no alvo. */
  trava?: number;
  /** 0–1: pulso de brilho (sobe e volta). Passar uma curva que vai e volta. */
  pulso?: number;
  /** 0–1: as cantoneiras recolhem para o canto. */
  sai?: number;
  espessura: number;
  /** Folga entre a cantoneira e o alvo, em px. */
  folga?: number;
  cor?: string;
}> = ({
  x,
  y,
  largura,
  altura,
  entrada,
  trava = 1,
  pulso = 0,
  sai = 0,
  espessura,
  folga = 12,
  cor = cores.ciano,
}) => {
  const e = clamp01(entrada) * (1 - clamp01(sai));
  if (e <= 0) return null;

  // Aberta, a mira fica 35% maior que o alvo; travada, encosta com a folga.
  const abre = (1 - clamp01(trava)) * 0.35 * Math.max(largura, altura);
  const f = folga + abre;
  const x0 = x - f;
  const y0 = y - f;
  const x1 = x + largura + f;
  const y1 = y + altura + f;
  const braco = Math.min(largura, altura) * 0.28 * e;
  const corte = Math.min(braco * 0.4, espessura * 3);

  // Cada cantoneira: braço vertical, chanfro de 45° no canto, braço horizontal.
  const canto = (cx: number, cy: number, sx: number, sy: number) =>
    `${cx},${cy + sy * braco} ${cx},${cy + sy * corte} ${cx + sx * corte},${cy} ${cx + sx * braco},${cy}`;

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "visible",
        pointerEvents: "none",
        filter: brilho(clamp01(pulso)),
      }}
      width={1}
      height={1}
    >
      {[
        canto(x0, y0, 1, 1),
        canto(x1, y0, -1, 1),
        canto(x1, y1, -1, -1),
        canto(x0, y1, 1, -1),
      ].map((pontos, i) => (
        <polyline
          key={i}
          points={pontos}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
};
