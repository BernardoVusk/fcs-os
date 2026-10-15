/**
 * Cena 09: financeiro. O painel entra; a Mira percorre os quatro cards
 * (caixa, projeção, vencidos, próximos) nas palavras; em "fechar o mês" a
 * página rola até a DRE e a projeção de 30 dias, e os chips do mês entram.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, ChipVivo, COLUNA, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, interpolar, Palco, prog, pulso, SAI, TELA } from "./kit";

export const DURACAO = duracaoCena("cena09");
const F = fala("cena09");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  TELA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  TELA_ROLA: [F.em("fechar") - 4, F.em("mês") + 6] as const,
  TELA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_CAIXA: [F.em("caixa") - 2, F.em("caixa") + 14] as const,
  MIRA_CAIXA_PULSA: [F.em("caixa") + 14, F.em("caixa") + 26] as const,
  ZOOM_PROJECAO: [F.em("projeção") - 2, F.em("projeção") + 14] as const,
  MIRA_PROJECAO_PULSA: [F.em("projeção") + 14, F.em("projeção") + 26] as const,
  ZOOM_VENCIDOS: [F.em("vencidos") - 2, F.em("vencidos") + 14] as const,
  MIRA_VENCIDOS_PULSA: [F.em("vencidos") + 14, F.em("vencidos") + 26] as const,
  ZOOM_PROXIMOS: [F.em("próximos") - 2, F.em("próximos") + 14] as const,
  MIRA_PROXIMOS_PULSA: [F.em("próximos") + 14, F.em("próximos") + 26] as const,
  ZOOM_DRE: [F.em("mês") - 2, F.em("mês") + 14] as const,
  MIRA_DRE_PULSA: [F.em("mês") + 14, F.em("mês") + 26] as const,
  ZOOM_GRAFICO: [F.em("planilha") - 2, F.em("planilha") + 14] as const,
  MIRA_GRAFICO_PULSA: [F.em("planilha") + 14, F.em("planilha") + 26] as const,
  CAMERA_SOLTA: [F.fimFala, F.fimFala + 14] as const,
  MIRA_SAI: [F.fimFala + 2, F.fimFala + 12] as const,
  FRASE1_ENTRA: F.instantes(["caixa", "realizado", "projeção", "vencidos", "próximos"]),
  FRASE1_DESTAQUE: [F.em("projeção") + 6, F.em("projeção") + 18] as const,
  FRASE1_SAI: F.em("fechar") - 22,
  FRASE2_ENTRA: F.instantes(["fechar", "o", "mês", "sem", "planilha"]),
  FRASE2_DESTAQUE: [F.em("sem") + 6, F.em("planilha") + 12] as const,
  FRASE2_SAI: F.fimFala + 2,
  CHIP1_ENTRA: F.em("caixa"),
  CHIP1_ACENDE: [F.em("caixa"), F.em("caixa") + 20] as const,
  CHIP1_REAGE: [F.em("projeção"), F.em("projeção") + 10] as const,
  CHIP1_SAI: [F.em("fechar") - 4, F.em("fechar") + 8] as const,
  CHIP2_ENTRA: F.em("projeção"),
  CHIP2_ACENDE: [F.em("projeção"), F.em("projeção") + 20] as const,
  CHIP2_REAGE: [F.em("vencidos"), F.em("vencidos") + 10] as const,
  CHIP2_SAI: [F.em("fechar") - 2, F.em("fechar") + 10] as const,
  CHIP3_ENTRA: F.em("vencidos"),
  CHIP3_ACENDE: [F.em("vencidos"), F.em("vencidos") + 20] as const,
  CHIP3_REAGE: [F.em("próximos"), F.em("próximos") + 10] as const,
  CHIP3_SAI: [F.em("fechar"), F.em("fechar") + 12] as const,
  CHIP4_ENTRA: F.em("próximos"),
  CHIP4_ACENDE: [F.em("próximos"), F.em("próximos") + 20] as const,
  CHIP4_SAI: [F.em("fechar") + 2, F.em("fechar") + 14] as const,
  CHIP_DRE_ENTRA: F.em("mês"),
  CHIP_DRE_ACENDE: [F.em("mês"), F.em("mês") + 24] as const,
  CHIP_DRE_REAGE: [F.em("planilha"), F.em("planilha") + 10] as const,
  CHIP_DRE_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  DICA_ENTRA: [F.em("planilha") + 4, F.em("planilha") + 18] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
const ROLA_FIM = 300;
/** Caixas no print (px CSS da página de 1096). */
const CAIXAS = {
  caixa: { x: 288, y: 193, w: 270, h: 240 },
  projecao: { x: 570, y: 193, w: 270, h: 240 },
  vencidos: { x: 850, y: 193, w: 270, h: 240 },
  proximos: { x: 1130, y: 193, w: 270, h: 240 },
  dre: { x: 288, y: 445, w: 270, h: 148 },
  grafico: { x: 288, y: 650, w: 548, h: 240 },
};
const CHIPS = ["Caixa realizado", "Projeção 30 dias", "Vencidos", "Próximos 7 dias"] as const;

export const Cena09Financeiro: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const rola = interpolar(f, T.TELA_ROLA, 0, ROLA_FIM);
  const zooms = [
    { faixa: T.ZOOM_CAIXA, pulsa: T.MIRA_CAIXA_PULSA, caixa: CAIXAS.caixa, s: 1.22 },
    { faixa: T.ZOOM_PROJECAO, pulsa: T.MIRA_PROJECAO_PULSA, caixa: CAIXAS.projecao, s: 1.22 },
    { faixa: T.ZOOM_VENCIDOS, pulsa: T.MIRA_VENCIDOS_PULSA, caixa: CAIXAS.vencidos, s: 1.22 },
    { faixa: T.ZOOM_PROXIMOS, pulsa: T.MIRA_PROXIMOS_PULSA, caixa: CAIXAS.proximos, s: 1.22 },
    { faixa: T.ZOOM_DRE, pulsa: T.MIRA_DRE_PULSA, caixa: CAIXAS.dre, s: 1.24 },
    { faixa: T.ZOOM_GRAFICO, pulsa: T.MIRA_GRAFICO_PULSA, caixa: CAIXAS.grafico, s: 1.16 },
  ];
  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z.faixa[0]) ativa = i;
  });
  const z = ativa >= 0 ? zooms[ativa] : null;
  const caixa = z ? G.caixa(z.caixa.x, z.caixa.y, z.caixa.w, z.caixa.h, rola) : null;
  const tomadas = zooms.map((q) => {
    const p = G.ponto(q.caixa.x + q.caixa.w / 2, q.caixa.y + q.caixa.h / 2, rola);
    return { faixa: q.faixa, x: p.x, y: Math.min(920, Math.max(220, p.y)), s: q.s };
  });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });
  const chips = [
    [T.CHIP1_ENTRA, T.CHIP1_ACENDE, T.CHIP1_REAGE, T.CHIP1_SAI],
    [T.CHIP2_ENTRA, T.CHIP2_ACENDE, T.CHIP2_REAGE, T.CHIP2_SAI],
    [T.CHIP3_ENTRA, T.CHIP3_ACENDE, T.CHIP3_REAGE, T.CHIP3_SAI],
    [T.CHIP4_ENTRA, T.CHIP4_ACENDE, undefined, T.CHIP4_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="financeiro" titulo="FCS ERP · Financeiro · Visão geral" entra={T.TELA_ENTRA} sai={T.TELA_SAI} rola={rola} alturaPrint={1096} />
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Financeiro · caixa" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 330 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Caixa realizado, *projeção*, vencidos, próximos" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={62} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Fechar o mês *sem planilha*" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={70} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 240 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {CHIPS.map((c, i) => {
              const [entra, acende, reage, sai] = chips[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} />;
            })}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <ChipVivo f={f} texto="DRE do mês: receitas, fixas, variáveis" entra={T.CHIP_DRE_ENTRA} acende={T.CHIP_DRE_ACENDE} reage={T.CHIP_DRE_REAGE} sai={T.CHIP_DRE_SAI} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Projeção de 30 dias: caixa mais lançamentos abertos, sem contar duas vezes." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
