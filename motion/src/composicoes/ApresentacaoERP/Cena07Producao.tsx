/**
 * Cena 07: produção. A fila entra e a Mira marca a ordem imprimindo; em
 * "consome o lote" a ordem concluída sobe na frente e a Mira percorre lote,
 * tempo real e peças prontas; "estimado" e "realizado" entram como dois chips
 * e a Mira fecha nos dois custos.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, ChipVivo, COLUNA, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, Palco, prog, pulso, SAI, TELA } from "./kit";

export const DURACAO = duracaoCena("cena07");
const F = fala("cena07");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  FILA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  FILA_RECUA: [F.em("consome") - 6, F.em("consome") + 12] as const,
  FILA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_IMPRIMINDO: [F.em("ordem") - 2, F.em("ordem") + 14] as const,
  MIRA_IMPRIMINDO_PULSA: [F.em("ordem") + 14, F.em("ordem") + 26] as const,
  ZOOM_CARGA: [F.em("produção") - 2, F.em("produção") + 14] as const,
  MIRA_CARGA_PULSA: [F.em("produção") + 14, F.em("produção") + 26] as const,
  ORDEM_ENTRA: [F.em("consome") - 4, F.em("consome") + 18] as const,
  ORDEM_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_LOTE: [F.em("lote") - 2, F.em("lote") + 14] as const,
  MIRA_LOTE_PULSA: [F.em("lote") + 14, F.em("lote") + 26] as const,
  ZOOM_TEMPO: [F.em("tempo") - 2, F.em("tempo") + 14] as const,
  MIRA_TEMPO_PULSA: [F.em("tempo") + 14, F.em("tempo") + 26] as const,
  ZOOM_PRONTAS: [F.em("prontas") - 2, F.em("prontas") + 14] as const,
  MIRA_PRONTAS_PULSA: [F.em("prontas") + 14, F.em("prontas") + 26] as const,
  ZOOM_ESTIMADO: [F.em("estimado") - 2, F.em("estimado") + 14] as const,
  MIRA_ESTIMADO_PULSA: [F.em("estimado") + 14, F.em("estimado") + 26] as const,
  ZOOM_REALIZADO: [F.em("realizado") - 2, F.em("realizado") + 14] as const,
  MIRA_REALIZADO_PULSA: [F.em("realizado") + 14, F.em("realizado") + 26] as const,
  CAMERA_SOLTA: [F.fimFala - 2, F.fimFala + 12] as const,
  MIRA_SAI: [F.fimFala, F.fimFala + 10] as const,
  FRASE1_ENTRA: F.instantes(["A", "ordem", "consome", "o", "lote", "registra", "registra", "o", "tempo", "real"]),
  FRASE1_DESTAQUE: [F.em("lote") + 6, F.em("real") + 12] as const,
  FRASE1_SAI: F.em("Custo") - 22,
  FRASE2_ENTRA: F.instantes(["estimado", "de", "um", "lado", "realizado", "do", "outro"]),
  FRASE2_DESTAQUE: [F.em("realizado") + 6, F.em("realizado") + 18] as const,
  FRASE2_SAI: F.fimFala + 2,
  CHIP_LOTE_ENTRA: F.em("lote"),
  CHIP_LOTE_ACENDE: [F.em("lote"), F.em("lote") + 20] as const,
  CHIP_LOTE_REAGE: [F.em("tempo"), F.em("tempo") + 10] as const,
  CHIP_LOTE_SAI: [F.em("Custo") - 4, F.em("Custo") + 8] as const,
  CHIP_TEMPO_ENTRA: F.em("tempo"),
  CHIP_TEMPO_ACENDE: [F.em("tempo"), F.em("tempo") + 20] as const,
  CHIP_TEMPO_REAGE: [F.em("prontas"), F.em("prontas") + 10] as const,
  CHIP_TEMPO_SAI: [F.em("Custo") - 2, F.em("Custo") + 10] as const,
  CHIP_PRONTAS_ENTRA: F.em("prontas"),
  CHIP_PRONTAS_ACENDE: [F.em("prontas"), F.em("prontas") + 20] as const,
  CHIP_PRONTAS_SAI: [F.em("Custo"), F.em("Custo") + 12] as const,
  CHIP_ESTIMADO_ENTRA: F.em("estimado"),
  CHIP_ESTIMADO_ACENDE: [F.em("estimado"), F.em("estimado") + 24] as const,
  CHIP_ESTIMADO_REAGE: [F.em("realizado"), F.em("realizado") + 10] as const,
  CHIP_ESTIMADO_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  CHIP_REALIZADO_ENTRA: F.em("realizado"),
  CHIP_REALIZADO_ACENDE: [F.em("realizado"), F.em("realizado") + 24] as const,
  CHIP_REALIZADO_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  DICA_ENTRA: [F.em("prontas") + 4, F.em("prontas") + 18] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
/** Caixas nos prints (px CSS). */
const CAIXAS = {
  imprimindo: { x: 675, y: 340, w: 340, h: 100 },
  carga: { x: 288, y: 190, w: 1112, h: 85 },
  lote: { x: 288, y: 529, w: 1112, h: 42 },
  tempo: { x: 513, y: 176, w: 213, h: 98 },
  prontas: { x: 1188, y: 176, w: 212, h: 98 },
  estimado: { x: 738, y: 176, w: 212, h: 98 },
  realizado: { x: 963, y: 176, w: 212, h: 98 },
};

export const Cena07Producao: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const zooms = [
    { faixa: T.ZOOM_IMPRIMINDO, pulsa: T.MIRA_IMPRIMINDO_PULSA, caixa: CAIXAS.imprimindo, s: 1.2 },
    { faixa: T.ZOOM_CARGA, pulsa: T.MIRA_CARGA_PULSA, caixa: CAIXAS.carga, s: 1.14 },
    { faixa: T.ZOOM_LOTE, pulsa: T.MIRA_LOTE_PULSA, caixa: CAIXAS.lote, s: 1.18 },
    { faixa: T.ZOOM_TEMPO, pulsa: T.MIRA_TEMPO_PULSA, caixa: CAIXAS.tempo, s: 1.18 },
    { faixa: T.ZOOM_PRONTAS, pulsa: T.MIRA_PRONTAS_PULSA, caixa: CAIXAS.prontas, s: 1.18 },
    { faixa: T.ZOOM_ESTIMADO, pulsa: T.MIRA_ESTIMADO_PULSA, caixa: CAIXAS.estimado, s: 1.18 },
    { faixa: T.ZOOM_REALIZADO, pulsa: T.MIRA_REALIZADO_PULSA, caixa: CAIXAS.realizado, s: 1.18 },
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

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="producao-fila" titulo="FCS ERP · Produção · Fila" entra={T.FILA_ENTRA} sai={T.FILA_SAI} recua={prog(f, T.FILA_RECUA)} />
          <CardTela f={f} arquivo="producao-ordem" titulo="FCS ERP · Ordem OP-0007 · concluída" entra={T.ORDEM_ENTRA} sai={T.ORDEM_SAI} fase={40} />
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Produção · ordens" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 330 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="A ordem consome o *lote* e registra o *tempo real*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={62} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Estimado de um lado, *realizado* do outro" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={62} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 240 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <ChipVivo f={f} texto="Lote PLA-PR-0928: 374 g" entra={T.CHIP_LOTE_ENTRA} acende={T.CHIP_LOTE_ACENDE} reage={T.CHIP_LOTE_REAGE} sai={T.CHIP_LOTE_SAI} />
            <ChipVivo f={f} texto="Tempo real: 14 h 20" entra={T.CHIP_TEMPO_ENTRA} acende={T.CHIP_TEMPO_ACENDE} reage={T.CHIP_TEMPO_REAGE} sai={T.CHIP_TEMPO_SAI} />
            <ChipVivo f={f} texto="4 peças prontas" entra={T.CHIP_PRONTAS_ENTRA} acende={T.CHIP_PRONTAS_ACENDE} sai={T.CHIP_PRONTAS_SAI} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", gap: 14 }}>
            <ChipVivo f={f} texto="Estimado" entra={T.CHIP_ESTIMADO_ENTRA} acende={T.CHIP_ESTIMADO_ACENDE} reage={T.CHIP_ESTIMADO_REAGE} sai={T.CHIP_ESTIMADO_SAI} tamanho={24} de="baixo" />
            <ChipVivo f={f} texto="Realizado" entra={T.CHIP_REALIZADO_ENTRA} acende={T.CHIP_REALIZADO_ACENDE} sai={T.CHIP_REALIZADO_SAI} tamanho={24} de="baixo" />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Concluir a ordem deu entrada em 4 peças prontas no estoque." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
