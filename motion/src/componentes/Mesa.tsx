/**
 * Linguagem da mesa de impressão: o fundo e o verbo de movimento dos vídeos
 * da FCS 3D STUDIO.
 *
 * - `Grade`: a malha da mesa de impressão, cobrindo o quadro e derivando o
 *   tempo todo. É a camada de ambiente da casa.
 * - `Camadas`: revela o conteúdo de baixo para cima, camada a camada, como a
 *   peça saindo da impressora, com a camada ativa acesa em ciano cheio.
 *
 * Todo traço em cor sólida da paleta, sem opacidade sobre o ciano (E2). A
 * hierarquia entre linhas vem da espessura.
 */
import React from "react";

import { cores } from "../marca/cores";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Malha da mesa, cobrindo o quadro inteiro.
 *
 * `progresso` desenha as linhas a partir do centro do quadro para fora.
 * `deriva` desloca a malha inteira: precisa andar alguns px por frame (E1,
 * E17: pensar em px/frame, 3 a 8). Cada `principal`-ésima linha é mais grossa,
 * como a marcação da mesa a cada 5 módulos. Malha fina andando sustenta a
 * fluidez pela quantidade de bordas, não pela espessura (A22).
 */
export const Grade: React.FC<{
  largura: number;
  altura: number;
  /** Distância entre linhas, em px. */
  passo: number;
  progresso: number;
  deriva: { x: number; y: number };
  espessura: number;
  principal?: number;
  corFina?: string;
  corForte?: string;
}> = ({
  largura,
  altura,
  passo,
  progresso,
  deriva,
  espessura,
  principal = 5,
  corFina = cores.cianoTrama,
  corForte = cores.cianoTrama,
}) => {
  const p = clamp01(progresso);
  const cx = largura / 2;
  const cy = altura / 2;
  // Deslocamento dentro de um módulo forte, pra a malha não "pular" ao andar.
  const modulo = passo * principal;
  const dx = ((deriva.x % modulo) + modulo) % modulo;
  const dy = ((deriva.y % modulo) + modulo) % modulo;
  const nx = Math.ceil(largura / passo) + principal * 2;
  const ny = Math.ceil(altura / passo) + principal * 2;
  const x0 = -modulo + dx;
  const y0 = -modulo + dy;

  const meiaV = (altura / 2 + modulo) * p;
  const meiaH = (largura / 2 + modulo) * p;

  const linhas: React.ReactNode[] = [];
  for (let i = 0; i < nx; i++) {
    const x = x0 + i * passo;
    const forte = i % principal === 0;
    linhas.push(
      <line
        key={`v${i}`}
        x1={x}
        x2={x}
        y1={cy - meiaV}
        y2={cy + meiaV}
        stroke={forte ? corForte : corFina}
        strokeWidth={forte ? espessura * 2 : espessura}
      />,
    );
  }
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * passo;
    const forte = j % principal === 0;
    linhas.push(
      <line
        key={`h${j}`}
        y1={y}
        y2={y}
        x1={cx - meiaH}
        x2={cx + meiaH}
        stroke={forte ? corForte : corFina}
        strokeWidth={forte ? espessura * 2 : espessura}
      />,
    );
  }

  return (
    <svg width={largura} height={altura} style={{ position: "absolute", inset: 0 }}>
      {linhas}
    </svg>
  );
};

/**
 * Revelação por camadas de impressão, de baixo para cima.
 *
 * O conteúdo fica montado desde o frame 0 (E5): o que anima é o recorte. A
 * altura revelada anda em degraus de uma camada, e a camada ativa é uma linha
 * ciano cheia na frente de impressão. Com 24 a 48 camadas o degrau lê como
 * impressão, não como travamento.
 *
 * Curva: quem chama decide pelo papel (`atravessa` para emenda de cena,
 * `chega` para produto assentando). A linha ativa some sozinha em 0 e em 1.
 */
export const Camadas: React.FC<{
  largura: number;
  altura: number;
  /** 0–1: quanto da altura já foi impresso. */
  progresso: number;
  /** Quantas camadas cabem na altura. */
  camadas?: number;
  /** Mostra a linha da camada ativa. */
  acesa?: boolean;
  cor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  largura,
  altura,
  progresso,
  camadas = 32,
  acesa = true,
  cor = cores.ciano,
  children,
  style,
}) => {
  const p = clamp01(progresso);
  const passo = altura / camadas;
  // Degrau inteiro: a frente de impressão sobe uma camada por vez.
  const impresso = p >= 1 ? altura : Math.floor(p * camadas) * passo;
  const frente = altura - impresso;
  const linha = Math.max(2, passo * 0.45);
  const ativa = acesa && p > 0 && p < 1;

  return (
    <div style={{ position: "relative", width: largura, height: altura, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(${frente}px 0 0 0)`,
        }}
      >
        {children}
      </div>
      {ativa ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: largura,
            top: frente - linha / 2,
            height: linha,
            background: cor,
          }}
        />
      ) : null}
    </div>
  );
};
