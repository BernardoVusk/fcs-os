/**
 * Cena 12: busca e fecho. As teclas Ctrl e K afundam, a busca global abre
 * sobre o painel e a Mira marca o resultado; em "FCS ERP" tudo recua, o
 * logo se imprime por camadas de novo com "ERP" encaixando, e a frase final
 * entra palavra a palavra com a régua embaixo. A malha continua derivando
 * até o último frame e o logo respira.
 */
import React from "react";
import { AbsoluteFill, spring, staticFile, useCurrentFrame } from "remotion";

import { ReguaCorte } from "../../componentes/Corte";
import { Camadas } from "../../componentes/Mesa";
import { Logo } from "../../componentes/Logo";
import { Mira } from "../../componentes/Mira";
import { brilho, camera, CardTela, COLUNA, cores, duracaoCena, EMENDA, Etiqueta, fala, fontes, Frase, geometriaTela, Palco, pesos, prog, pulso, SAI, Som, Tecla, TELA } from "./kit";

export const DURACAO = duracaoCena("cena12", 70);
const F = fala("cena12");
/** Frame em que o fecho de marca começa (o cabeçalho sai aqui). */
export const INICIO_FECHO = F.em("FCS");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.em("FCS") - 8, F.em("FCS") + 4] as const,
  PAINEL_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  PAINEL_FLUTUA: EMENDA + 16,
  PAINEL_SAI: [F.em("FCS") - 6, F.em("FCS") + 10] as const,
  RESULTADO_ACENDE: [F.em("K") + 28, F.em("K") + 44] as const,
  TECLAS_ENTRA: [F.em("acha") - 4, F.em("acha") + 10] as const,
  CTRL_APERTA: F.em("Control"),
  K_APERTA: F.em("K"),
  TECLAS_SAEM: [F.em("FCS") - 8, F.em("FCS") + 2] as const,
  BUSCA_ENTRA: [F.em("K"), F.em("K") + 10] as const,
  BUSCA_MOLDURA: [F.em("K"), F.em("K") + 16] as const,
  ZOOM_BUSCA: [F.em("K") + 2, F.em("K") + 18] as const,
  MIRA_ENTRA: [F.em("K") + 14, F.em("K") + 22] as const,
  MIRA_TRAVA: [F.em("K") + 14, F.em("K") + 28] as const,
  MIRA_PULSA: [F.em("K") + 28, F.em("K") + 42] as const,
  MIRA_SAI: [F.em("FCS") - 8, F.em("FCS")] as const,
  CAMERA_SOLTA: [F.em("FCS") - 8, F.em("FCS") + 6] as const,
  FRASE1_ENTRA: F.instantes(["E", "tudo", "se", "acha", "com", "Control", "K"]),
  FRASE1_DESTAQUE: [F.em("Control") + 6, F.em("K") + 12] as const,
  FRASE1_SAI: F.em("FCS") - 22,
  LOGO_IMPRIME: [F.em("FCS") - 2, F.em("ERP") - 2] as const,
  ERP_ENCAIXA: F.em("ERP"),
  ERP_BRILHA: [F.em("ERP"), F.em("ERP") + 14] as const,
  ERP_ASSENTA: [F.em("ERP") + 10, F.em("ERP") + 34] as const,
  CAMERA_LOGO: [F.em("ERP") - 4, F.em("ERP") + 12] as const,
  CAMERA_ASSENTA: [F.em("ERP") + 30, F.em("Decidir") + 10] as const,
  CONJUNTO_RECUA: [F.em("Decidir") - 6, F.em("número") - 4] as const,
  FRASE2_ENTRA: F.instantes(["Decidir", "com", "número", "real", "em", "menos", "cliques"]),
  FRASE2_DESTAQUE: [F.em("número") + 6, F.em("real") + 12] as const,
  REGUA_DESENHA: [F.em("em"), F.em("cliques") + 14] as const,
  LOGO_PULSA: [F.em("cliques") + 8, F.em("cliques") + 30] as const,
  LOGO_RESPIRA: F.em("cliques") + 30,
  LOGO_FLUTUA: F.em("cliques") + 30,
  FRASE2_ASSENTA: [F.em("cliques") + 20, F.em("cliques") + 44] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
const CAIXAS = {
  busca: { x: 529, y: 299, w: 382, h: 425 },
  resultado: { x: 540, y: 515, w: 360, h: 34 },
};
const LOGO_ALTURA = 170;
const LOGO_LARGURA = (700 / 192) * LOGO_ALTURA;
const ERP_LARGURA = 370;
const VAO = 40;
const CONJUNTO = LOGO_LARGURA + VAO + ERP_LARGURA;

export const Cena12Fecho: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const busca = prog(f, T.BUSCA_ENTRA);
  const moldura = prog(f, T.BUSCA_MOLDURA, (t) => t);
  const caixaBusca = G.caixa(CAIXAS.busca.x, CAIXAS.busca.y, CAIXAS.busca.w, CAIXAS.busca.h);
  const caixaRes = G.caixa(CAIXAS.resultado.x, CAIXAS.resultado.y, CAIXAS.resultado.w, CAIXAS.resultado.h);
  const pBusca = G.ponto(CAIXAS.busca.x + CAIXAS.busca.w / 2, CAIXAS.busca.y + CAIXAS.busca.h / 2);
  const teclas = prog(f, T.TECLAS_ENTRA) * (1 - prog(f, T.TECLAS_SAEM, SAI));
  const imprime = prog(f, T.LOGO_IMPRIME, (t) => t);
  const encaixe = spring({ frame: f - T.ERP_ENCAIXA, fps: 30, config: { damping: 20, mass: 0.8, stiffness: 200 } });
  const assenta = prog(f, T.ERP_ASSENTA);
  const brilha = pulso(f, T.ERP_BRILHA) + pulso(f, T.LOGO_PULSA) * 0.6;
  const recua = prog(f, T.CONJUNTO_RECUA);
  const respira = f >= T.LOGO_RESPIRA ? 1 + Math.sin((f - T.LOGO_RESPIRA) / 9) * 0.012 : 1;
  const flutua = f >= T.LOGO_FLUTUA ? Math.sin((f - T.LOGO_FLUTUA) / 17) * 6 : 0;
  const assentaFrase = prog(f, T.FRASE2_ASSENTA);
  const resultadoAcende = pulso(f, T.RESULTADO_ACENDE);
  const xConj = 960 - CONJUNTO / 2;
  const yConj = 460 - recua * 120 + flutua;

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-teclado.mp3")} em={T.CTRL_APERTA} volume={0.4} nome="teclado" />
      <Som src={staticFile("audio/erp/sfx-motor.mp3")} em={T.LOGO_IMPRIME[0]} volume={0.5} nome="motor" />
      <Som src={staticFile("audio/erp/sfx-impacto.mp3")} em={T.ERP_ENCAIXA - 1} volume={0.85} nome="impacto" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: camera(f, [
            { faixa: T.ZOOM_BUSCA, x: pBusca.x, y: pBusca.y, s: 1.24 },
            { faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 },
            { faixa: T.CAMERA_LOGO, x: xConj + LOGO_LARGURA + VAO + ERP_LARGURA / 2, y: 460, s: 1.08 },
            { faixa: T.CAMERA_ASSENTA, x: 960, y: 540, s: 1 },
          ]),
        }}
      >
        <Palco>
          <CardTela f={f} arquivo="inicio" titulo="FCS ERP · Início" entra={T.PAINEL_ENTRA} sai={T.PAINEL_SAI} fase={f >= T.PAINEL_FLUTUA ? 0 : 0} />
          <div style={{ position: "absolute", inset: 0, opacity: busca, pointerEvents: "none" }}>
            <CardTela f={f} arquivo="busca" titulo="FCS ERP · Buscar" entra={T.PAINEL_ENTRA} sai={T.PAINEL_SAI} />
          </div>
        </Palco>
        {busca > 0 ? (
          <Mira x={caixaRes.x} y={caixaRes.y} largura={caixaRes.largura} altura={caixaRes.altura} entrada={prog(f, T.MIRA_ENTRA)} trava={prog(f, T.MIRA_TRAVA)} pulso={pulso(f, T.MIRA_PULSA)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
        {resultadoAcende > 0 ? (
          <div style={{ position: "absolute", left: caixaRes.x - 8, top: caixaRes.y - 4, width: caixaRes.largura + 16, height: caixaRes.altura + 8, background: "#00D8FF", opacity: resultadoAcende * 0.25, clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)" }} />
        ) : null}
        {moldura > 0 && moldura < 1 ? (
          <div style={{ position: "absolute", left: caixaBusca.x, top: caixaBusca.y, width: caixaBusca.largura, height: caixaBusca.altura, border: "2px solid #00D8FF", opacity: 1 - moldura, transform: `scale(${1 + (1 - moldura) * 0.08})` }} />
        ) : null}

        {/* fecho de marca */}
        <div
          style={{
            position: "absolute",
            left: xConj,
            top: yConj,
            width: CONJUNTO,
            height: LOGO_ALTURA,
            display: "flex",
            alignItems: "center",
            gap: VAO,
            transform: `scale(${(1 - recua * 0.2) * respira})`,
            transformOrigin: "center center",
            opacity: f >= T.LOGO_IMPRIME[0] ? 1 : 0,
          }}
        >
          <Camadas largura={LOGO_LARGURA} altura={LOGO_ALTURA} progresso={imprime} camadas={40}>
            <Logo altura={LOGO_ALTURA} />
          </Camadas>
          <div
            style={{
              width: ERP_LARGURA,
              fontFamily: fontes.titulo,
              fontWeight: pesos.titulo,
              fontSize: 166,
              lineHeight: 1,
              letterSpacing: `${0.06 - 0.07 * assenta}em`,
              color: cores.ciano,
              opacity: f >= T.ERP_ENCAIXA ? 1 : 0,
              transform: `scale(${f >= T.ERP_ENCAIXA ? 1.6 - 0.6 * encaixe : 1.6})`,
              transformOrigin: "left center",
              filter: brilho(brilha),
            }}
          >
            ERP
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 640 - assentaFrase * 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <Frase f={f} texto="Decidir com *número real*, em menos cliques." instantes={T.FRASE2_ENTRA} tamanho={60} alinha="center" largura={1500} />
          <ReguaCorte largura={360} espessura={6} cor={cores.ciano} progresso={prog(f, T.REGUA_DESENHA)} />
        </div>
      </div>

      {/* coluna de texto e teclas, fora da câmera */}
      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Busca global" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <Frase f={f} texto="E tudo se acha com *Control K*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={66} largura={600} />
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", opacity: Math.min(1, teclas * 1.5), filter: `blur(${(1 - teclas) * 10}px)`, transform: `translateY(${(1 - teclas) * 50}px)` }}>
          <Tecla f={f} rotulo="Ctrl" apertos={[T.CTRL_APERTA]} largura={200} altura={130} tamanho={40} />
          <Tecla f={f} rotulo="K" apertos={[T.K_APERTA]} largura={140} altura={130} tamanho={48} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
