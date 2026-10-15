/**
 * Cena 05: estoque. A compra confirmada entra; a Mira marca os itens e o
 * frete; em "lote" a tela de insumos sobe na frente e a Mira trava na linha
 * do PLA preto e no custo médio por grama; o cursor clica em Precificação no
 * menu, puxando a próxima cena.
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, ChipVivo, COLUNA, Cursor, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, Palco, prog, pulso, SAI, Som, TELA } from "./kit";

export const DURACAO = duracaoCena("cena05");
const F = fala("cena05");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  COMPRA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  COMPRA_RECUA: [F.em("lote") - 6, F.em("lote") + 12] as const,
  COMPRA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  FRASE1_ENTRA: F.instantes(["O", "filamento", "entra", "por", "compra", "desconto", "vira", "lote"]),
  FRASE1_DESTAQUE: [F.em("compra") + 6, F.em("lote") + 12] as const,
  FRASE1_SAI: F.em("O", 10) - 22,
  ZOOM_ITENS: [F.em("compra") - 2, F.em("compra") + 14] as const,
  MIRA_ITENS_PULSA: [F.em("compra") + 14, F.em("compra") + 26] as const,
  ZOOM_FRETE: [F.em("frete") - 2, F.em("frete") + 14] as const,
  MIRA_FRETE_PULSA: [F.em("frete") + 14, F.em("frete") + 26] as const,
  ZOOM_DESCONTO: [F.em("desconto") - 2, F.em("desconto") + 14] as const,
  MIRA_DESCONTO_PULSA: [F.em("desconto") + 14, F.em("desconto") + 26] as const,
  CHIP_FRETE_ENTRA: F.em("frete"),
  CHIP_FRETE_ACENDE: [F.em("frete"), F.em("frete") + 20] as const,
  CHIP_FRETE_REAGE: [F.em("desconto"), F.em("desconto") + 10] as const,
  CHIP_FRETE_SAI: [F.em("lote") + 10, F.em("lote") + 22] as const,
  CHIP_DESCONTO_ENTRA: F.em("desconto"),
  CHIP_DESCONTO_ACENDE: [F.em("desconto"), F.em("desconto") + 20] as const,
  CHIP_DESCONTO_REAGE: [F.em("lote"), F.em("lote") + 10] as const,
  CHIP_DESCONTO_SAI: [F.em("lote") + 12, F.em("lote") + 24] as const,
  INSUMOS_ENTRA: [F.em("lote") - 4, F.em("lote") + 18] as const,
  INSUMOS_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_LINHA: [F.em("lote") + 8, F.em("lote") + 24] as const,
  MIRA_LINHA_PULSA: [F.em("lote") + 24, F.em("lote") + 36] as const,
  FRASE2_ENTRA: F.instantes(["custo", "custo", "por", "grama", "aparece", "sozinho"]),
  FRASE2_DESTAQUE: [F.em("sozinho") + 6, F.em("sozinho") + 18] as const,
  FRASE2_SAI: F.fimFala + 2,
  ZOOM_CUSTO: [F.em("custo") - 2, F.em("custo") + 14] as const,
  CUSTO_PULSA: [F.em("grama"), F.em("grama") + 16] as const,
  CHIP_CUSTO_ENTRA: F.em("grama"),
  CHIP_CUSTO_ACENDE: [F.em("grama"), F.em("grama") + 20] as const,
  CHIP_CUSTO_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  CURSOR_ENTRA: [F.em("aparece"), F.em("aparece") + 10] as const,
  CURSOR_VAI: F.em("calculadora") - 2,
  CURSOR_CLICA: F.em("calculadora") + 4,
  CURSOR_SAI: [F.fimFala + 6, F.fimFala + 14] as const,
  MENU_ACENDE: [F.em("calculadora") + 4, F.em("calculadora") + 18] as const,
  CAMERA_SOLTA: [F.fimFala - 2, F.fimFala + 12] as const,
  MIRA_SAI: [F.fimFala, F.fimFala + 10] as const,
  DICA_ENTRA: [F.em("grama") + 4, F.em("grama") + 18] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
/** Caixas nos prints (px CSS). */
const CAIXAS = {
  itens: { x: 288, y: 302, w: 1112, h: 252 },
  frete: { x: 742, y: 176, w: 194, h: 100 },
  desconto: { x: 524, y: 176, w: 196, h: 100 },
  linha: { x: 288, y: 556, w: 1112, h: 52 },
  custo: { x: 1040, y: 560, w: 150, h: 46 },
  menu: { x: 16, y: 514, w: 224, h: 36 },
};

export const Cena05Estoque: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const zooms = [
    { faixa: T.ZOOM_ITENS, pulsa: T.MIRA_ITENS_PULSA, caixa: CAIXAS.itens, s: 1.12 },
    { faixa: T.ZOOM_FRETE, pulsa: T.MIRA_FRETE_PULSA, caixa: CAIXAS.frete, s: 1.24 },
    { faixa: T.ZOOM_DESCONTO, pulsa: T.MIRA_DESCONTO_PULSA, caixa: CAIXAS.desconto, s: 1.24 },
    { faixa: T.ZOOM_LINHA, pulsa: T.MIRA_LINHA_PULSA, caixa: CAIXAS.linha, s: 1.16 },
    { faixa: T.ZOOM_CUSTO, pulsa: T.CUSTO_PULSA, caixa: CAIXAS.custo, s: 1.32 },
  ];
  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z.faixa[0]) ativa = i;
  });
  const z = ativa >= 0 ? zooms[ativa] : null;
  const caixa = z ? G.caixa(z.caixa.x, z.caixa.y, z.caixa.w, z.caixa.h) : null;
  const tomadas = zooms.map((q) => {
    const p = G.ponto(q.caixa.x + q.caixa.w / 2, q.caixa.y + q.caixa.h / 2);
    return { faixa: q.faixa, x: p.x, y: p.y, s: q.s };
  });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });
  const menu = G.ponto(CAIXAS.menu.x + 120, CAIXAS.menu.y + 18);
  const menuCaixa = G.caixa(CAIXAS.menu.x, CAIXAS.menu.y, CAIXAS.menu.w, CAIXAS.menu.h);
  const menuAcende = prog(f, T.MENU_ACENDE);

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-clique.mp3")} em={T.CURSOR_CLICA} volume={0.4} nome="clique" />
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="estoque-compra" titulo="FCS ERP · Estoque · Compra NF 48213" entra={T.COMPRA_ENTRA} sai={T.COMPRA_SAI} recua={prog(f, T.COMPRA_RECUA)} />
          <CardTela f={f} arquivo="estoque-insumos" titulo="FCS ERP · Estoque · Insumos" entra={T.INSUMOS_ENTRA} sai={T.INSUMOS_SAI} fase={40} acende={pulso(f, T.CUSTO_PULSA) * 0.5} />
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
        {menuAcende > 0 ? (
          <div style={{ position: "absolute", left: menuCaixa.x, top: menuCaixa.y, width: menuCaixa.largura, height: menuCaixa.altura, background: "#00D8FF", opacity: menuAcende * 0.35, clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)" }} />
        ) : null}
        <Cursor
          f={f}
          entra={T.CURSOR_ENTRA}
          sai={T.CURSOR_SAI}
          caminho={[
            [T.CURSOR_ENTRA[0], 1400, 1000],
            [T.CURSOR_VAI, menu.x, menu.y],
          ]}
          cliques={[T.CURSOR_CLICA]}
        />
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Estoque · compras e insumos" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 330 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="O filamento entra por *compra* e vira *lote*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={66} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="O custo por grama aparece *sozinho*" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={66} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 200 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <ChipVivo f={f} texto="Frete rateado nos itens" entra={T.CHIP_FRETE_ENTRA} acende={T.CHIP_FRETE_ACENDE} reage={T.CHIP_FRETE_REAGE} sai={T.CHIP_FRETE_SAI} />
            <ChipVivo f={f} texto="Desconto da nota" entra={T.CHIP_DESCONTO_ENTRA} acende={T.CHIP_DESCONTO_ACENDE} reage={T.CHIP_DESCONTO_REAGE} sai={T.CHIP_DESCONTO_SAI} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <ChipVivo f={f} texto="R$ 0,12711 por grama" entra={T.CHIP_CUSTO_ENTRA} acende={T.CHIP_CUSTO_ACENDE} sai={T.CHIP_CUSTO_SAI} tamanho={24} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="PLA preto: R$ 127,11 por kg, média dos três lotes." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
