/**
 * Cena 01: abertura. O logo FCS se imprime por camadas, "ERP" encaixa seco ao
 * lado com pulso de brilho e impacto; o conjunto recua para o topo e a frase
 * entra palavra a palavra com a régua chanfrada se desenhando embaixo; os seis
 * módulos chegam em chips, cada um acende na palavra falada e afunda quando o
 * vizinho chega, e a Mira fecha sobre a fileira em "num lugar só".
 */
import React from "react";
import { AbsoluteFill, spring, staticFile, useCurrentFrame } from "remotion";

import { ReguaCorte } from "../../componentes/Corte";
import { Camadas } from "../../componentes/Mesa";
import { Logo } from "../../componentes/Logo";
import { Mira } from "../../componentes/Mira";
import { brilho, camera, ChipVivo, cores, duracaoCena, fala, fontes, Frase, pesos, prog, pulso, SAI, Som } from "./kit";

export const DURACAO = duracaoCena("cena01");
const F = fala("cena01");

const TIMING = {
  LOGO_IMPRIME: [4, F.em("FCS")] as const,
  LOGO_FLUTUA: F.em("FCS"),
  ERP_ENCAIXA: F.em("ERP"),
  ERP_BRILHA: [F.em("ERP"), F.em("ERP") + 14] as const,
  ERP_ASSENTA: [F.em("ERP") + 10, F.em("ERP") + 34] as const,
  CAMERA_ERP: [F.em("ERP") - 6, F.em("ERP") + 10] as const,
  CAMERA_VOLTA: [F.em("ERP") + 30, F.em("sistema") + 4] as const,
  CONJUNTO_RECUA: [F.em("sistema") - 10, F.em("sistema") + 12] as const,
  FRASE_ENTRA: F.instantes(["sistema", "sistema", "que", "a", "gente", "fez", "para", "tocar", "a", "FCS", "3D", "STUDIO"]),
  FRASE_DESTAQUE: [F.em("FCS", 9) + 6, F.em("STUDIO") + 12] as const,
  REGUA_DESENHA: [F.em("tocar"), F.em("STUDIO") + 12] as const,
  REGUA_SAI: [F.em("custo") - 6, F.em("custo") + 8] as const,
  FRASE_RECUA: [F.em("custo") - 6, F.em("custo") + 12] as const,
  FRASE_SAI: F.fimFala + 2,
  CHIP1_ENTRA: F.em("custo"),
  CHIP1_ACENDE: [F.em("custo"), F.em("custo") + 20] as const,
  CHIP1_REAGE: [F.em("estoque"), F.em("estoque") + 10] as const,
  CHIP1_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  CHIP2_ENTRA: F.em("estoque"),
  CHIP2_ACENDE: [F.em("estoque"), F.em("estoque") + 20] as const,
  CHIP2_REAGE: [F.em("produto"), F.em("produto") + 10] as const,
  CHIP2_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  CHIP3_ENTRA: F.em("produto"),
  CHIP3_ACENDE: [F.em("produto"), F.em("produto") + 20] as const,
  CHIP3_REAGE: [F.em("pedido"), F.em("pedido") + 10] as const,
  CHIP3_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
  CHIP4_ENTRA: F.em("pedido"),
  CHIP4_ACENDE: [F.em("pedido"), F.em("pedido") + 20] as const,
  CHIP4_REAGE: [F.em("produção"), F.em("produção") + 10] as const,
  CHIP4_SAI: [F.fimFala + 10, F.fimFala + 22] as const,
  CHIP5_ENTRA: F.em("produção"),
  CHIP5_ACENDE: [F.em("produção"), F.em("produção") + 20] as const,
  CHIP5_REAGE: [F.em("caixa"), F.em("caixa") + 10] as const,
  CHIP5_SAI: [F.fimFala + 12, F.fimFala + 24] as const,
  CHIP6_ENTRA: F.em("caixa"),
  CHIP6_ACENDE: [F.em("caixa"), F.em("caixa") + 20] as const,
  CHIP6_REAGE: [F.em("num"), F.em("num") + 10] as const,
  CHIP6_SAI: [F.fimFala + 14, F.fimFala + 26] as const,
  CHIPS_FLUTUAM: F.em("custo"),
  CHIPS_JUNTAM: [F.em("num"), F.em("lugar") + 6] as const,
  MIRA_ENTRA: [F.em("num"), F.em("num") + 8] as const,
  MIRA_FECHA: [F.em("num"), F.em("só")] as const,
  MIRA_PULSA: [F.em("só"), F.em("só") + 14] as const,
  MIRA_SAI: [F.fimFala + 4, F.fimFala + 18] as const,
  CAMERA_FILEIRA: [F.em("num") - 4, F.em("lugar") + 8] as const,
  CAMERA_SOLTA: [F.fimFala, F.fimFala + 14] as const,
  CONJUNTO_SAI: [F.fimFala + 6, F.fimFala + 20] as const,
} as const;

const MODULOS = ["Custo", "Estoque", "Produto", "Pedido", "Produção", "Caixa"] as const;
const LOGO_ALTURA = 200;
const LOGO_LARGURA = (700 / 192) * LOGO_ALTURA;
const ERP_LARGURA = 430;
const VAO = 44;
const CONJUNTO = LOGO_LARGURA + VAO + ERP_LARGURA;

export const Cena01Abertura: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const imprime = prog(f, T.LOGO_IMPRIME, (t) => t);
  const encaixe = spring({ frame: f - T.ERP_ENCAIXA, fps: 30, config: { damping: 20, mass: 0.8, stiffness: 200 } });
  const brilha = pulso(f, T.ERP_BRILHA);
  const assenta = prog(f, T.ERP_ASSENTA);
  const recua = prog(f, T.CONJUNTO_RECUA);
  const saiConjunto = prog(f, T.CONJUNTO_SAI, SAI);
  const juntam = prog(f, T.CHIPS_JUNTAM);
  const fecha = prog(f, T.MIRA_FECHA);
  const pulsa = pulso(f, T.MIRA_PULSA);
  const flut = f >= T.LOGO_FLUTUA ? Math.sin((f - T.LOGO_FLUTUA) / 19) * 5 : 0;
  const recuaFrase = prog(f, T.FRASE_RECUA);

  const escalaConj = 1 - recua * 0.5;
  const yConj = 470 - recua * 300 - saiConjunto * 200;
  const xConj = 960 - CONJUNTO / 2;

  const larguraChip = 200;
  const gap = 28 - juntam * 16;
  const totalFileira = MODULOS.length * larguraChip + (MODULOS.length - 1) * gap;
  const x0 = 960 - totalFileira / 2;
  const yFileira = 760;
  const chips = [
    [T.CHIP1_ENTRA, T.CHIP1_ACENDE, T.CHIP1_REAGE, T.CHIP1_SAI],
    [T.CHIP2_ENTRA, T.CHIP2_ACENDE, T.CHIP2_REAGE, T.CHIP2_SAI],
    [T.CHIP3_ENTRA, T.CHIP3_ACENDE, T.CHIP3_REAGE, T.CHIP3_SAI],
    [T.CHIP4_ENTRA, T.CHIP4_ACENDE, T.CHIP4_REAGE, T.CHIP4_SAI],
    [T.CHIP5_ENTRA, T.CHIP5_ACENDE, T.CHIP5_REAGE, T.CHIP5_SAI],
    [T.CHIP6_ENTRA, T.CHIP6_ACENDE, T.CHIP6_REAGE, T.CHIP6_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-motor.mp3")} em={T.LOGO_IMPRIME[0]} volume={0.5} nome="motor" />
      <Som src={staticFile("audio/erp/sfx-impacto.mp3")} em={T.ERP_ENCAIXA - 1} volume={0.8} nome="impacto" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: camera(f, [
            { faixa: T.CAMERA_ERP, x: xConj + LOGO_LARGURA + VAO + ERP_LARGURA / 2, y: 470, s: 1.1 },
            { faixa: T.CAMERA_VOLTA, x: 960, y: 540, s: 1 },
            { faixa: T.CAMERA_FILEIRA, x: 960, y: yFileira, s: 1.14 },
            { faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 },
          ]),
        }}
      >
        {/* logo imprimindo por camadas + ERP encaixando */}
        <div
          style={{
            position: "absolute",
            left: xConj,
            top: yConj + flut,
            width: CONJUNTO,
            height: LOGO_ALTURA,
            display: "flex",
            alignItems: "center",
            gap: VAO,
            transform: `scale(${escalaConj})`,
            transformOrigin: "center top",
            opacity: 1 - saiConjunto,
            filter: `blur(${saiConjunto * 16}px)`,
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
              fontSize: 196,
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

        {/* frase e régua */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 560 - recuaFrase * 150,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 26,
            transform: `scale(${1 - recuaFrase * 0.28})`,
          }}
        >
          <Frase f={f} texto="O sistema que a gente fez para tocar a *FCS 3D STUDIO*" instantes={T.FRASE_ENTRA} saida={T.FRASE_SAI} tamanho={56} alinha="center" largura={1700} />
          <ReguaCorte largura={420} espessura={6} cor={cores.ciano} progresso={prog(f, T.REGUA_DESENHA) * (1 - prog(f, T.REGUA_SAI, SAI))} />
        </div>

        {/* seis módulos */}
        {MODULOS.map((m, i) => {
          const [entra, acende, reage, sai] = chips[i];
          return (
            <div
              key={m}
              style={{
                position: "absolute",
                left: x0 + i * (larguraChip + gap),
                top: yFileira - 34 + (f >= T.CHIPS_FLUTUAM ? Math.sin((f - T.CHIPS_FLUTUAM) / 14 + i) * 4 : 0),
                width: larguraChip,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <ChipVivo f={f} texto={m} entra={entra} acende={acende} reage={reage} sai={sai} aceso={juntam * 0.15} tamanho={24} de="baixo" />
            </div>
          );
        })}

        <Mira
          x={x0 - 14}
          y={yFileira - 48}
          largura={totalFileira + 28}
          altura={96}
          entrada={prog(f, T.MIRA_ENTRA)}
          trava={fecha}
          pulso={pulsa}
          sai={prog(f, T.MIRA_SAI, SAI)}
          espessura={5}
          folga={10}
        />
      </div>
    </AbsoluteFill>
  );
};
