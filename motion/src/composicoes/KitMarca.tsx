/**
 * Prancha de conferência da marca: paleta, logo, tipografia e os grafismos da
 * casa num quadro só. Não é peça de entrega: serve para olhar, num still, se
 * a camada de marca de `src/marca/` e `src/componentes/` está certa depois de
 * qualquer mudança (`npx remotion still KitMarca out/kit.png`).
 */
import React from "react";
import { AbsoluteFill } from "remotion";

import { Camadas, Grade } from "../componentes/Mesa";
import { chanfro, ReguaCorte } from "../componentes/Corte";
import { Eyebrow } from "../componentes/Eyebrow";
import { Logo } from "../componentes/Logo";
import { Mira } from "../componentes/Mira";
import { cantos, cores } from "../marca/cores";
import { empresa, nichos } from "../marca/empresa";
import { useLayout } from "../marca/layout";
import { fontes, pesos, tamanhoTipo } from "../marca/tipografia";

const AMOSTRAS: { token: keyof typeof cores; papel: string }[] = [
  { token: "preto", papel: "fundo" },
  { token: "grafite", papel: "card" },
  { token: "borda", papel: "borda" },
  { token: "ciano", papel: "destaque" },
  { token: "branco", papel: "texto" },
  { token: "cinzaTexto", papel: "texto 2" },
  { token: "cianoTrama", papel: "ambiente" },
  { token: "grafiteTrama", papel: "neutro" },
];

export const KitMarca: React.FC = () => {
  const { width, height, escala, margem } = useLayout();
  const card = { w: 420 * escala, h: 300 * escala };

  return (
    <AbsoluteFill style={{ background: cores.preto }}>
      <Grade
        largura={width}
        altura={height}
        passo={48 * escala}
        progresso={1}
        deriva={{ x: 0, y: 0 }}
        espessura={1.5 * escala}
      />
      <AbsoluteFill style={{ padding: margem, display: "flex", flexDirection: "column", gap: 40 * escala }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <Logo altura={120 * escala} />
          <Eyebrow tamanho={tamanhoTipo("eyebrow", escala)}>{empresa.assinatura}</Eyebrow>
        </div>
        <ReguaCorte largura={width - margem * 2} espessura={6 * escala} cor={cores.ciano} progresso={1} />

        <div style={{ display: "flex", gap: 48 * escala }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 * escala }}>
            <div
              style={{
                fontFamily: fontes.titulo,
                fontWeight: pesos.titulo,
                fontSize: tamanhoTipo("titulo", escala),
                lineHeight: 1,
                textTransform: "uppercase",
                color: cores.ciano,
              }}
            >
              Miniatura F1
            </div>
            <div
              style={{
                fontFamily: fontes.corpo,
                fontWeight: pesos.corpo,
                fontSize: tamanhoTipo("corpo", escala),
                color: cores.branco,
              }}
            >
              {empresa.frase}
            </div>
            <div
              style={{
                fontFamily: fontes.corpo,
                fontWeight: pesos.destaque,
                fontSize: tamanhoTipo("legenda", escala),
                color: cores.cinzaTexto,
              }}
            >
              {nichos.join("  /  ")}
            </div>
            <div
              style={{
                alignSelf: "flex-start",
                marginTop: 12 * escala,
                padding: `${14 * escala}px ${32 * escala}px`,
                background: cores.ciano,
                color: cores.preto,
                fontFamily: fontes.etiqueta,
                fontWeight: pesos.botao,
                fontSize: tamanhoTipo("legenda", escala),
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                clipPath: chanfro(cantos.chanfroMedio * escala),
              }}
            >
              Peça sob demanda
            </div>
          </div>

          {/* Produto em impressão (60%) com a mira travada nele */}
          <div style={{ position: "relative", width: card.w, height: card.h }}>
            <Camadas largura={card.w} altura={card.h} progresso={0.6} camadas={32}>
              <div
                style={{
                  width: card.w,
                  height: card.h,
                  background: cores.grafite,
                  border: `${Math.max(1, escala)}px solid ${cores.borda}`,
                  clipPath: chanfro(cantos.chanfroGrande * escala),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Logo parte="selo" altura={card.h * 0.5} />
              </div>
            </Camadas>
            <Mira
              x={card.w * 0.25}
              y={card.h * 0.2}
              largura={card.w * 0.5}
              altura={card.h * 0.6}
              entrada={1}
              trava={1}
              pulso={0.6}
              espessura={4 * escala}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 * escala, marginTop: "auto" }}>
          {AMOSTRAS.map(({ token, papel }) => (
            <div key={token} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 * escala }}>
              <div
                style={{
                  height: 70 * escala,
                  background: cores[token],
                  border: `${Math.max(1, escala)}px solid ${cores.grafiteTrama}`,
                  clipPath: chanfro(cantos.chanfroPequeno * escala),
                }}
              />
              <div style={{ fontFamily: fontes.etiqueta, fontWeight: pesos.etiqueta, fontSize: 20, color: cores.branco }}>
                {token}
              </div>
              <div style={{ fontFamily: fontes.corpo, fontSize: 20, color: cores.cinzaTexto }}>
                {cores[token]} {papel}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
