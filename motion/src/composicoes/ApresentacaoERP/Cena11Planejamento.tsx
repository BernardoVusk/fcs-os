/**
 * Cena 11: planejamento. O calendário entra; a Mira marca conteúdo, tarefa e
 * campanha nos itens do mês; em "quadro" e "lista" o cursor clica nas abas e
 * a tela troca por whip horizontal dentro do card.
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, Cartao3D, ChipVivo, COLUNA, Cursor, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, Janela, Palco, prog, pulso, SAI, Som, Tela, TELA } from "./kit";

export const DURACAO = duracaoCena("cena11");
const F = fala("cena11");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  TELA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  TELA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_CONTEUDO: [F.em("conteúdo") - 2, F.em("conteúdo") + 14] as const,
  MIRA_CONTEUDO_PULSA: [F.em("conteúdo") + 14, F.em("conteúdo") + 26] as const,
  ZOOM_TAREFA: [F.em("tarefa") - 2, F.em("tarefa") + 14] as const,
  MIRA_TAREFA_PULSA: [F.em("tarefa") + 14, F.em("tarefa") + 26] as const,
  ZOOM_CAMPANHA: [F.em("campanha") - 2, F.em("campanha") + 14] as const,
  MIRA_CAMPANHA_PULSA: [F.em("campanha") + 14, F.em("campanha") + 26] as const,
  ZOOM_ABAS: [F.em("calendário") - 2, F.em("calendário") + 14] as const,
  MIRA_ABAS_PULSA: [F.em("calendário") + 14, F.em("calendário") + 26] as const,
  TROCA_QUADRO: [F.em("quadro"), F.em("quadro") + 8] as const,
  TROCA_LISTA: [F.em("lista"), F.em("lista") + 8] as const,
  CURSOR_ENTRA: [F.em("calendário"), F.em("calendário") + 10] as const,
  CURSOR_VAI1: F.em("quadro") - 8,
  CLIQUE_QUADRO: F.em("quadro") - 2,
  CURSOR_VAI2: F.em("lista") - 8,
  CLIQUE_LISTA: F.em("lista") - 2,
  CURSOR_SAI: [F.fimFala + 4, F.fimFala + 14] as const,
  CAMERA_SOLTA: [F.em("quadro") - 6, F.em("quadro") + 8] as const,
  MIRA_SAI: [F.em("quadro") - 8, F.em("quadro")] as const,
  FRASE_ENTRA: F.instantes(["conteúdo", "tarefa", "e", "campanha", "calendário", "quadro", "e", "lista"]),
  FRASE_DESTAQUE: [F.em("calendário") + 6, F.em("lista") + 12] as const,
  FRASE_SAI: F.fimFala + 2,
  CHIP1_ENTRA: F.em("conteúdo"),
  CHIP1_ACENDE: [F.em("conteúdo"), F.em("conteúdo") + 20] as const,
  CHIP1_REAGE: [F.em("tarefa"), F.em("tarefa") + 10] as const,
  CHIP1_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  CHIP2_ENTRA: F.em("tarefa"),
  CHIP2_ACENDE: [F.em("tarefa"), F.em("tarefa") + 20] as const,
  CHIP2_REAGE: [F.em("campanha"), F.em("campanha") + 10] as const,
  CHIP2_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  CHIP3_ENTRA: F.em("campanha"),
  CHIP3_ACENDE: [F.em("campanha"), F.em("campanha") + 20] as const,
  CHIP3_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  ABA1_ENTRA: F.em("calendário"),
  ABA1_ACENDE: [F.em("calendário"), F.em("calendário") + 20] as const,
  ABA1_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
  ABA2_ENTRA: F.em("quadro"),
  ABA2_ACENDE: [F.em("quadro"), F.em("quadro") + 20] as const,
  ABA2_SAI: [F.fimFala + 10, F.fimFala + 22] as const,
  ABA3_ENTRA: F.em("lista"),
  ABA3_ACENDE: [F.em("lista"), F.em("lista") + 20] as const,
  ABA3_SAI: [F.fimFala + 12, F.fimFala + 24] as const,
  DICA_ENTRA: [F.em("campanha") + 6, F.em("campanha") + 20] as const,
  DICA_SAI: [F.em("calendário") - 2, F.em("calendário") + 10] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
/** Caixas no print do calendário (px CSS). */
const CAIXAS = {
  conteudo: { x: 945, y: 522, w: 160, h: 28 },
  tarefa: { x: 700, y: 522, w: 180, h: 28 },
  campanha: { x: 700, y: 638, w: 180, h: 28 },
  abas: { x: 290, y: 172, w: 330, h: 30 },
  abaQuadro: { x: 401, y: 174, w: 52, h: 26 },
  abaLista: { x: 478, y: 174, w: 32, h: 26 },
};
const W = TELA.largura;

export const Cena11Planejamento: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const zooms = [
    { faixa: T.ZOOM_CONTEUDO, pulsa: T.MIRA_CONTEUDO_PULSA, caixa: CAIXAS.conteudo, s: 1.3 },
    { faixa: T.ZOOM_TAREFA, pulsa: T.MIRA_TAREFA_PULSA, caixa: CAIXAS.tarefa, s: 1.3 },
    { faixa: T.ZOOM_CAMPANHA, pulsa: T.MIRA_CAMPANHA_PULSA, caixa: CAIXAS.campanha, s: 1.3 },
    { faixa: T.ZOOM_ABAS, pulsa: T.MIRA_ABAS_PULSA, caixa: CAIXAS.abas, s: 1.22 },
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
  const troca1 = prog(f, T.TROCA_QUADRO, (t) => t);
  const troca2 = prog(f, T.TROCA_LISTA, (t) => t);
  const quadro = G.ponto(CAIXAS.abaQuadro.x + 26, CAIXAS.abaQuadro.y + 13);
  const lista = G.ponto(CAIXAS.abaLista.x + 16, CAIXAS.abaLista.y + 13);
  const chips = [
    [T.CHIP1_ENTRA, T.CHIP1_ACENDE, T.CHIP1_REAGE, T.CHIP1_SAI],
    [T.CHIP2_ENTRA, T.CHIP2_ACENDE, T.CHIP2_REAGE, T.CHIP2_SAI],
    [T.CHIP3_ENTRA, T.CHIP3_ACENDE, undefined, T.CHIP3_SAI],
  ] as const;
  const abas = [
    [T.ABA1_ENTRA, T.ABA1_ACENDE, T.ABA1_SAI],
    [T.ABA2_ENTRA, T.ABA2_ACENDE, T.ABA2_SAI],
    [T.ABA3_ENTRA, T.ABA3_ACENDE, T.ABA3_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-clique.mp3")} em={T.CLIQUE_QUADRO} volume={0.4} nome="clique 1" />
      <Som src={staticFile("audio/erp/sfx-clique.mp3")} em={T.CLIQUE_LISTA} volume={0.4} nome="clique 2" />
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <Cartao3D f={f} x={TELA.x} y={TELA.y} largura={TELA.largura} altura={TELA.altura} entra={T.TELA_ENTRA} sai={T.TELA_SAI} rx={5} ry={-10} amplitude={0.8}>
            <Janela titulo="FCS ERP · Planejamento" largura={TELA.largura} altura={TELA.altura}>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: -(troca1 + troca2) * W, top: 0, width: W * 3, height: "100%", display: "flex", filter: `blur(${(Math.sin(Math.PI * troca1) + Math.sin(Math.PI * troca2)) * 14}px)` }}>
                  {["planejamento-calendario", "planejamento-quadro", "planejamento-lista"].map((a) => (
                    <div key={a} style={{ position: "relative", width: W, height: "100%" }}>
                      <Tela arquivo={a} largura={W} altura={TELA.altura - 54} />
                    </div>
                  ))}
                </div>
              </div>
            </Janela>
          </Cartao3D>
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
        <Cursor
          f={f}
          entra={T.CURSOR_ENTRA}
          sai={T.CURSOR_SAI}
          caminho={[
            [T.CURSOR_ENTRA[0], 1500, 1000],
            [T.CURSOR_VAI1, quadro.x, quadro.y],
            [T.CURSOR_VAI2, lista.x, lista.y],
          ]}
          cliques={[T.CLIQUE_QUADRO, T.CLIQUE_LISTA]}
        />
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Planejamento · conteúdo e tarefas" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <Frase f={f} texto="Conteúdo, tarefa e campanha: *calendário*, *quadro* e *lista*" instantes={T.FRASE_ENTRA} saida={T.FRASE_SAI} tamanho={58} largura={600} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {["Reels: circuito de Interlagos", "Responder avaliações da Shopee", "Temporada de Fórmula 1"].map((c, i) => {
            const [entra, acende, reage, sai] = chips[i];
            return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} tamanho={20} />;
          })}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Calendário", "Quadro", "Lista"].map((c, i) => {
            const [entra, acende, sai] = abas[i];
            const vez = i === 0 ? 1 - troca1 : i === 1 ? troca1 - troca2 : troca2;
            return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} sai={sai} aceso={Math.max(0, vez) * 0.8} tamanho={20} de="baixo" />;
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Os mesmos itens nas três vistas, com modelo e recorrência." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
