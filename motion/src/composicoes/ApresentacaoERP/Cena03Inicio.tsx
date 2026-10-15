/**
 * Cena 03: a tela inicial. O print real do painel se imprime por camadas no
 * card 3D; a cada informação nomeada pela locução, o cursor vai até o card, a
 * câmera dá o zoom de destaque e a Mira trava e pulsa; na coluna, os seis
 * itens entram, acendem na palavra e afundam quando o próximo chega.
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Camadas } from "../../componentes/Mesa";
import { Mira } from "../../componentes/Mira";
import { camera, Cartao3D, ChipVivo, COLUNA, Cursor, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, Janela, Palco, prog, pulso, SAI, Som, TELA, type Tomada } from "./kit";

export const DURACAO = duracaoCena("cena03");
const F = fala("cena03");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  TELA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  TELA_IMPRIME: [EMENDA + 4, F.em("mês") + 4] as const,
  TELA_FLUTUA: F.em("mês"),
  TELA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  FRASE_ENTRA: F.instantes(["A", "tela", "inicial", "mostra", "o", "mês"]),
  FRASE_DESTAQUE: [F.em("o", 4) + 6, F.em("mês") + 12] as const,
  FRASE_RECUA: [F.em("o", 4) + 10, F.em("planejamento")] as const,
  FRASE_SAI: F.fimFala + 2,
  DICA_ENTRA: [F.em("mês"), F.em("mês") + 14] as const,
  DICA_SAI: [F.em("planejamento") - 2, F.em("planejamento") + 10] as const,
  ITEM1_ENTRA: F.em("planejamento"),
  ITEM1_ACENDE: [F.em("planejamento"), F.em("planejamento") + 20] as const,
  ITEM1_REAGE: [F.em("alertas"), F.em("alertas") + 10] as const,
  ITEM1_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  ITEM2_ENTRA: F.em("alertas"),
  ITEM2_ACENDE: [F.em("alertas"), F.em("alertas") + 20] as const,
  ITEM2_REAGE: [F.em("filamento"), F.em("filamento") + 10] as const,
  ITEM2_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  ITEM3_ENTRA: F.em("filamento"),
  ITEM3_ACENDE: [F.em("filamento"), F.em("filamento") + 20] as const,
  ITEM3_REAGE: [F.em("receita"), F.em("receita") + 10] as const,
  ITEM3_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  ITEM4_ENTRA: F.em("receita"),
  ITEM4_ACENDE: [F.em("receita"), F.em("receita") + 20] as const,
  ITEM4_REAGE: [F.em("pedidos"), F.em("pedidos") + 10] as const,
  ITEM4_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
  ITEM5_ENTRA: F.em("pedidos"),
  ITEM5_ACENDE: [F.em("pedidos"), F.em("pedidos") + 20] as const,
  ITEM5_REAGE: [F.em("fila"), F.em("fila") + 10] as const,
  ITEM5_SAI: [F.fimFala + 10, F.fimFala + 22] as const,
  ITEM6_ENTRA: F.em("fila"),
  ITEM6_ACENDE: [F.em("fila"), F.em("fila") + 20] as const,
  ITEM6_SAI: [F.fimFala + 12, F.fimFala + 24] as const,
  CURSOR_ENTRA: [F.em("mês"), F.em("mês") + 10] as const,
  CURSOR_VAI1: F.em("planejamento") + 8,
  CURSOR_VAI2: F.em("alertas") + 8,
  CURSOR_VAI3: F.em("filamento") + 8,
  CURSOR_VAI4: F.em("receita") + 8,
  CURSOR_VAI5: F.em("pedidos") + 8,
  CURSOR_VAI6: F.em("fila") + 8,
  CURSOR_SAI: [F.fimFala + 4, F.fimFala + 14] as const,
  ZOOM1: [F.em("planejamento") - 2, F.em("planejamento") + 14] as const,
  ZOOM2: [F.em("alertas") - 2, F.em("alertas") + 14] as const,
  ZOOM3: [F.em("filamento") - 2, F.em("filamento") + 14] as const,
  ZOOM4: [F.em("receita") - 2, F.em("receita") + 14] as const,
  ZOOM5: [F.em("pedidos") - 2, F.em("pedidos") + 14] as const,
  ZOOM6: [F.em("fila") - 2, F.em("fila") + 14] as const,
  MIRA1_PULSA: [F.em("planejamento") + 14, F.em("planejamento") + 26] as const,
  MIRA2_PULSA: [F.em("alertas") + 14, F.em("alertas") + 26] as const,
  MIRA3_PULSA: [F.em("filamento") + 14, F.em("filamento") + 26] as const,
  MIRA4_PULSA: [F.em("receita") + 14, F.em("receita") + 26] as const,
  MIRA5_PULSA: [F.em("pedidos") + 14, F.em("pedidos") + 26] as const,
  MIRA6_PULSA: [F.em("fila") + 14, F.em("fila") + 26] as const,
  CAMERA_SOLTA: [F.fimFala - 4, F.fimFala + 12] as const,
  MIRA_SAI: [F.fimFala, F.fimFala + 10] as const,
} as const;

/** Caixas dos cards no print (px CSS de 1440x900). */
const CAIXAS = [
  { rotulo: "Planejamento", x: 288, y: 157, w: 550, h: 293 },
  { rotulo: "Alertas", x: 850, y: 157, w: 270, h: 293 },
  { rotulo: "Filamento", x: 288, y: 460, w: 270, h: 252 },
  { rotulo: "Receita", x: 570, y: 460, w: 270, h: 252 },
  { rotulo: "Pedidos", x: 570, y: 725, w: 270, h: 175 },
  { rotulo: "Fila", x: 850, y: 725, w: 270, h: 175 },
] as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);

export const Cena03Inicio: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const zooms = [T.ZOOM1, T.ZOOM2, T.ZOOM3, T.ZOOM4, T.ZOOM5, T.ZOOM6];
  const pulsos = [T.MIRA1_PULSA, T.MIRA2_PULSA, T.MIRA3_PULSA, T.MIRA4_PULSA, T.MIRA5_PULSA, T.MIRA6_PULSA];
  const itens = [
    [T.ITEM1_ENTRA, T.ITEM1_ACENDE, T.ITEM1_REAGE, T.ITEM1_SAI],
    [T.ITEM2_ENTRA, T.ITEM2_ACENDE, T.ITEM2_REAGE, T.ITEM2_SAI],
    [T.ITEM3_ENTRA, T.ITEM3_ACENDE, T.ITEM3_REAGE, T.ITEM3_SAI],
    [T.ITEM4_ENTRA, T.ITEM4_ACENDE, T.ITEM4_REAGE, T.ITEM4_SAI],
    [T.ITEM5_ENTRA, T.ITEM5_ACENDE, T.ITEM5_REAGE, T.ITEM5_SAI],
    [T.ITEM6_ENTRA, T.ITEM6_ACENDE, undefined, T.ITEM6_SAI],
  ] as const;
  const vais = [T.CURSOR_VAI1, T.CURSOR_VAI2, T.CURSOR_VAI3, T.CURSOR_VAI4, T.CURSOR_VAI5, T.CURSOR_VAI6];
  const tomadas: Tomada[] = CAIXAS.map((c, i) => {
    const p = G.ponto(c.x + c.w / 2, c.y + c.h / 2);
    return { faixa: zooms[i], x: p.x, y: p.y, s: 1.22 };
  });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });

  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z[0]) ativa = i;
  });
  const caixaAtiva = ativa >= 0 ? G.caixa(CAIXAS[ativa].x, CAIXAS[ativa].y, CAIXAS[ativa].w, CAIXAS[ativa].h) : null;
  const travaAtiva = ativa >= 0 ? prog(f, zooms[ativa]) : 0;
  const pulsaAtiva = ativa >= 0 ? pulso(f, pulsos[ativa]) : 0;
  const recua = prog(f, T.FRASE_RECUA);

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-motor.mp3")} em={T.TELA_IMPRIME[0]} volume={0.35} nome="motor" />
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <Cartao3D f={f} x={TELA.x} y={TELA.y} largura={TELA.largura} altura={TELA.altura} entra={T.TELA_ENTRA} sai={T.TELA_SAI} rx={5} ry={-10} amplitude={f >= T.TELA_FLUTUA ? 0.8 : 0.3}>
            <Camadas largura={TELA.largura} altura={TELA.altura} progresso={prog(f, T.TELA_IMPRIME, (t) => t)} camadas={36}>
              <Janela titulo="FCS ERP · Início" largura={TELA.largura} altura={TELA.altura}>
                <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                  <img src={staticFile("erp/inicio.png")} style={{ position: "absolute", left: 0, top: 0, width: TELA.largura, display: "block" }} alt="" />
                </div>
              </Janela>
            </Camadas>
          </Cartao3D>
        </Palco>

        {caixaAtiva ? (
          <Mira x={caixaAtiva.x} y={caixaAtiva.y} largura={caixaAtiva.largura} altura={caixaAtiva.altura} entrada={1} trava={travaAtiva} pulso={pulsaAtiva} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}

        <Cursor
          f={f}
          entra={T.CURSOR_ENTRA}
          sai={T.CURSOR_SAI}
          caminho={[
            [T.CURSOR_ENTRA[0], 1500, 980],
            ...CAIXAS.map((c, i) => {
              const p = G.ponto(c.x + c.w * 0.7, c.y + c.h * 0.6);
              return [vais[i], p.x, p.y] as const;
            }),
          ]}
        />
      </div>

      {/* coluna de texto, fora da câmera */}
      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Início · o painel" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ transform: `scale(${1 - recua * 0.3})`, transformOrigin: "left top" }}>
          <Frase f={f} texto="A tela inicial mostra *o mês*" instantes={T.FRASE_ENTRA} saida={T.FRASE_SAI} tamanho={72} largura={600} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: -recua * 50 }}>
          {CAIXAS.map((c, i) => {
            const [entra, acende, reage, sai] = itens[i];
            return <ChipVivo key={c.rotulo} f={f} texto={c.rotulo} entra={entra} acende={acende} reage={reage} sai={sai} aceso={ativa === i ? 0.7 : 0} tamanho={22} />;
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Período: este mês, mês anterior, 30 dias ou 12 meses." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
