/**
 * Cena 02: antes e agora. Três cards (planilha, cabeça, conversa) entram nas
 * palavras, com o ícone se desenhando e cada um afundando quando o vizinho
 * chega; em "agora" são riscados um a um e recuam, e um card real do painel
 * (receita recebida) sobe no lugar; em "sem dados" um card do ERP no estado
 * vazio entra e a Mira trava nele.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, Card, COLUNA, cores, duracaoCena, estiloCorpo, Etiqueta, fala, fontes, Frase, pesos, prog, pulso, SAI, vida } from "./kit";

export const DURACAO = duracaoCena("cena02");
const F = fala("cena02");

const TIMING = {
  ETIQUETA_ENTRA: [6, 24] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  FRASE1_ENTRA: F.instantes(["Antes", "planilha", "cabeça", "e", "em", "conversa"]),
  FRASE1_SAI: F.em("Agora") - 22,
  FRASE2_ENTRA: F.instantes(["Agora", "cada", "número", "vem", "do", "banco"]),
  FRASE2_DESTAQUE: [F.em("vem") + 6, F.em("banco") + 12] as const,
  FRASE2_SAI: F.em("quando") - 22,
  FRASE3_ENTRA: F.instantes(["quando", "não", "existe", "dado", "o", "sistema", "diz", "sem", "dados"]),
  FRASE3_SAI: F.fimFala + 4,
  CARD1_ENTRA: [F.em("planilha"), F.em("planilha") + 14] as const,
  CARD1_DESENHA: [F.em("planilha") + 4, F.em("planilha") + 26] as const,
  CARD1_REAGE: [F.em("cabeça"), F.em("cabeça") + 10] as const,
  CARD1_RISCA: [F.em("Agora"), F.em("Agora") + 10] as const,
  CARD1_RECUA: [F.em("número"), F.em("vem") + 10] as const,
  CARD2_ENTRA: [F.em("cabeça"), F.em("cabeça") + 14] as const,
  CARD2_DESENHA: [F.em("cabeça") + 4, F.em("cabeça") + 26] as const,
  CARD2_REAGE: [F.em("conversa"), F.em("conversa") + 10] as const,
  CARD2_RISCA: [F.em("Agora") + 5, F.em("Agora") + 15] as const,
  CARD2_RECUA: [F.em("número") + 3, F.em("vem") + 13] as const,
  CARD3_ENTRA: [F.em("conversa"), F.em("conversa") + 14] as const,
  CARD3_DESENHA: [F.em("conversa") + 4, F.em("conversa") + 26] as const,
  CARD3_REAGE: [F.em("Agora"), F.em("Agora") + 10] as const,
  CARD3_RISCA: [F.em("Agora") + 10, F.em("Agora") + 20] as const,
  CARD3_RECUA: [F.em("número") + 6, F.em("vem") + 16] as const,
  CARDS_FLUTUAM: F.em("planilha"),
  BANCO_ENTRA: [F.em("vem"), F.em("banco") + 8] as const,
  BANCO_PULSA: [F.em("banco"), F.em("banco") + 16] as const,
  BANCO_FLUTUA: F.em("banco"),
  LEGENDA_ENTRA: [F.em("banco") + 8, F.em("banco") + 20] as const,
  LEGENDA_SAI: [F.em("existe") - 4, F.em("existe") + 6] as const,
  CAMERA_BANCO: [F.em("vem"), F.em("banco") + 8] as const,
  BANCO_SAI: [F.em("existe"), F.em("dado") + 6] as const,
  VAZIO_ENTRA: [F.em("sistema"), F.em("diz") + 8] as const,
  VAZIO_FLUTUA: F.em("sistema"),
  VAZIO_ACENDE: [F.em("sem"), F.em("dados") + 10] as const,
  MIRA_ENTRA: [F.em("sem"), F.em("sem") + 8] as const,
  MIRA_FECHA: [F.em("sem"), F.em("dados") + 4] as const,
  MIRA_PULSA: [F.em("dados"), F.em("dados") + 14] as const,
  MIRA_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  CAMERA_VAZIO: [F.em("diz"), F.em("sem") + 8] as const,
  CAMERA_SOLTA: [F.fimFala, F.fimFala + 14] as const,
  VAZIO_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
} as const;

/** Ícones em linha, desenhados com pathLength (o traço "se desenha", A9). */
const ICONES: Record<string, string[]> = {
  planilha: ["M6 10 H58 V54 H6 Z", "M6 24 H58", "M6 38 H58", "M24 10 V54", "M41 10 V54"],
  cabeca: ["M22 56 V46 C12 42 8 32 10 24 C13 12 24 6 34 6 C46 6 54 16 54 26 L58 34 L54 36 V44 C54 48 50 50 46 50 H40 V56", "M28 24 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0"],
  conversa: ["M8 10 H44 V34 H22 L12 42 V34 H8 Z", "M50 22 H56 V46 H50 L42 52 V46 H30 V38"],
};

const ANTES = [
  { id: "planilha", rotulo: "Planilha" },
  { id: "cabeca", rotulo: "Cabeça" },
  { id: "conversa", rotulo: "Conversa" },
] as const;

const CARD = { w: 300, h: 230 };
const X0 = 1020;
const Y_CARDS = 420;

export const Cena02Antes: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const banco = vida(f, T.BANCO_ENTRA, T.BANCO_SAI);
  const vazio = vida(f, T.VAZIO_ENTRA, T.VAZIO_SAI);
  const legenda = vida(f, T.LEGENDA_ENTRA, T.LEGENDA_SAI);
  const bancoX = 1270;
  const bancoY = 560;
  const vazioX = 1270;
  const vazioY = 560;
  const cards = [
    { entra: T.CARD1_ENTRA, desenha: T.CARD1_DESENHA, reage: T.CARD1_REAGE, risca: T.CARD1_RISCA, recua: T.CARD1_RECUA },
    { entra: T.CARD2_ENTRA, desenha: T.CARD2_DESENHA, reage: T.CARD2_REAGE, risca: T.CARD2_RISCA, recua: T.CARD2_RECUA },
    { entra: T.CARD3_ENTRA, desenha: T.CARD3_DESENHA, reage: T.CARD3_REAGE, risca: T.CARD3_RISCA, recua: T.CARD3_RECUA },
  ];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: camera(f, [
            { faixa: T.CAMERA_BANCO, x: bancoX, y: bancoY, s: 1.12 },
            { faixa: T.CAMERA_VAZIO, x: vazioX, y: vazioY, s: 1.16 },
            { faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 },
          ]),
        }}
      >
        {/* três cards do "antes" */}
        {ANTES.map((c, i) => {
          const k = cards[i];
          const e = prog(f, k.entra);
          const desenha = prog(f, k.desenha, (t) => t);
          const dip = pulso(f, k.reage);
          const r = prog(f, k.risca, (t) => t);
          const recua = prog(f, k.recua);
          const flut = f >= T.CARDS_FLUTUAM ? Math.sin((f - T.CARDS_FLUTUAM) / 16 + i * 2) * 6 : 0;
          return (
            <div
              key={c.id}
              style={{
                position: "absolute",
                left: X0 + i * (CARD.w + 30) - recua * (i - 1) * 40,
                top: Y_CARDS + flut + recua * 200,
                width: CARD.w,
                height: CARD.h,
                opacity: Math.min(1, e * 1.5) * (1 - recua * 0.85),
                filter: `blur(${(1 - e) * 12 + recua * 10}px)`,
                transform: `translateY(${(1 - e) * 60}px) scale(${(0.92 + 0.08 * e) * (1 - recua * 0.25) * (1 - dip * 0.05)})`,
              }}
            >
              <Card style={{ width: "100%", height: "100%" }}>
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
                  <svg width={64} height={64} viewBox="0 0 64 64" fill="none" stroke={cores.cinzaTexto} strokeWidth={3} strokeLinecap="square">
                    {ICONES[c.id].map((d, j) => (
                      <path key={j} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.max(0, Math.min(1, desenha * ICONES[c.id].length - j))} />
                    ))}
                  </svg>
                  <span style={{ fontFamily: fontes.etiqueta, fontWeight: pesos.etiqueta, fontSize: 24, letterSpacing: "0.18em", textTransform: "uppercase", color: cores.branco, opacity: Math.min(1, desenha * 2) }}>{c.rotulo}</span>
                </div>
              </Card>
              <svg width={CARD.w} height={CARD.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <line x1={20} y1={CARD.h - 20} x2={20 + (CARD.w - 40) * r} y2={CARD.h - 20 - (CARD.h - 40) * r} stroke={cores.ciano} strokeWidth={8} strokeLinecap="square" />
              </svg>
            </div>
          );
        })}

        {/* card real do painel: receita recebida */}
        <div
          style={{
            position: "absolute",
            left: bancoX - 300,
            top: bancoY - 150 + (f >= T.BANCO_FLUTUA ? Math.sin((f - T.BANCO_FLUTUA) / 15) * 5 : 0),
            width: 600,
            height: 300,
            opacity: Math.min(1, banco * 1.5),
            filter: `blur(${(1 - banco) * 14}px)`,
            transform: `translateY(${(1 - banco) * 80}px) scale(${0.9 + 0.1 * banco + pulso(f, T.BANCO_PULSA) * 0.04})`,
          }}
        >
          <Card acende={pulso(f, T.BANCO_PULSA)} style={{ width: "100%", height: "100%" }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {/* recorte do print: card "Receita recebida (este mês)" em 570..838 x 460..712 (CSS) */}
              <Img src={staticFile("erp/inicio.png")} style={{ position: "absolute", width: 1440 * 2.2, height: 900 * 2.2, left: -570 * 2.2 + 4, top: -460 * 2.2 + 4 }} />
            </div>
          </Card>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -46, textAlign: "center", opacity: legenda, transform: `translateY(${(1 - legenda) * 10}px)`, ...estiloCorpo(22) }}>card real do painel, dado do banco</div>
        </div>

        {/* card no estado vazio, no desenho do ERP */}
        <div
          style={{
            position: "absolute",
            left: vazioX - 300,
            top: vazioY - 150 + (f >= T.VAZIO_FLUTUA ? Math.sin((f - T.VAZIO_FLUTUA) / 15 + 1) * 5 : 0),
            width: 600,
            height: 300,
            opacity: Math.min(1, vazio * 1.5),
            filter: `blur(${(1 - vazio) * 14}px)`,
            transform: `translateY(${(1 - vazio) * 80}px) scale(${0.9 + 0.1 * vazio})`,
          }}
        >
          <Card acende={prog(f, T.VAZIO_ACENDE) * 0.6} style={{ width: "100%", height: "100%" }}>
            <div style={{ padding: "40px 44px", display: "flex", flexDirection: "column", gap: 26 }}>
              <span style={{ ...estiloCorpo(24) }}>Custo realizado (este mês)</span>
              <span style={{ fontFamily: fontes.corpo, fontWeight: pesos.botao, fontSize: 64, color: cores.branco, lineHeight: 1 }}>Sem dados</span>
              <span style={{ ...estiloCorpo(22), color: cores.ciano }}>Concluir uma ordem de produção</span>
            </div>
          </Card>
        </div>
        <Mira
          x={vazioX - 300 + 30}
          y={vazioY - 150 + 100}
          largura={360}
          altura={90}
          entrada={prog(f, T.MIRA_ENTRA)}
          trava={prog(f, T.MIRA_FECHA)}
          pulso={pulso(f, T.MIRA_PULSA)}
          sai={prog(f, T.MIRA_SAI, SAI)}
          espessura={5}
        />
      </div>

      {/* coluna de texto, fora da câmera */}
      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 30, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Antes e agora" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 420 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Antes: *planilha*, cabeça e em conversa." instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={70} largura={620} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Agora cada número *vem do banco*." instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={70} largura={620} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Quando não existe dado, o sistema diz: *sem dados*." instantes={T.FRASE3_ENTRA} saida={T.FRASE3_SAI} tamanho={62} largura={640} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
