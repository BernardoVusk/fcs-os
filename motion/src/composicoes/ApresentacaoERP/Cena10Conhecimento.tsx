/**
 * Cena 10: base de conhecimento e Claude Code. A lista entra e a Mira marca
 * os tipos (decisão, procedimento, solução) nas palavras; em "Claude Code" um
 * terminal sobe na frente, digita /kb-buscar petg, recebe a resposta da base
 * e, em "salva", grava um registro novo com check.
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, Caret, Cartao3D, Check, ChipVivo, COLUNA, cores, Dica, digitado, duracaoCena, EMENDA, estiloCorpo, Etiqueta, fala, fimDigitacao, fontes, Frase, geometriaTela, IconeClaude, Janela, Palco, pesos, prog, pulso, SAI, Som, TELA } from "./kit";

export const DURACAO = duracaoCena("cena10");
const F = fala("cena10");
const CMD1 = "/kb-buscar petg";
const CMD2 = "/kb-salvar";

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  LISTA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  LISTA_RECUA: [F.em("Claude") - 6, F.em("Claude") + 12] as const,
  LISTA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_DECISAO: [F.em("decisão") - 2, F.em("decisão") + 14] as const,
  MIRA_DECISAO_PULSA: [F.em("decisão") + 14, F.em("decisão") + 26] as const,
  ZOOM_PROCEDIMENTO: [F.em("procedimento") - 2, F.em("procedimento") + 14] as const,
  MIRA_PROCEDIMENTO_PULSA: [F.em("procedimento") + 14, F.em("procedimento") + 26] as const,
  ZOOM_SOLUCAO: [F.em("solução") - 2, F.em("solução") + 14] as const,
  MIRA_SOLUCAO_PULSA: [F.em("solução") + 14, F.em("solução") + 26] as const,
  TERMINAL_ENTRA: [F.em("Claude") - 4, F.em("Claude") + 18] as const,
  TERMINAL_FLUTUA: F.em("Claude") + 18,
  TERMINAL_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  ZOOM_TERMINAL: [F.em("conversa") - 2, F.em("conversa") + 14] as const,
  COMANDO1_DIGITA: F.em("busca"),
  COMANDO1_FIM: fimDigitacao(CMD1, F.em("busca"), 18),
  RESPOSTA1_ENTRA: F.em("documentado") - 4,
  RESPOSTA2_ENTRA: F.em("documentado") + 8,
  COMANDO2_DIGITA: F.em("salva"),
  COMANDO2_FIM: fimDigitacao(CMD2, F.em("salva"), 18),
  RESPOSTA3_ENTRA: F.em("aprendeu") - 2,
  CHECK_ENTRA: [F.em("aprendeu"), F.em("aprendeu") + 14] as const,
  TERMINAL_ACENDE: [F.em("aprendeu"), F.em("aprendeu") + 16] as const,
  CAMERA_SOLTA: [F.fimFala - 2, F.fimFala + 12] as const,
  MIRA_SAI: [F.em("Claude") - 6, F.em("Claude") + 4] as const,
  FRASE1_ENTRA: F.instantes(["A", "base", "guarda", "decisão", "procedimento", "e", "solução"]),
  FRASE1_DESTAQUE: [F.em("decisão") + 6, F.em("solução") + 12] as const,
  FRASE1_SAI: F.em("Claude") - 22,
  FRASE2_ENTRA: F.instantes(["o", "Claude", "Code", "conversa", "com", "ela"]),
  FRASE2_DESTAQUE: [F.em("conversa") + 6, F.em("conversa") + 18] as const,
  FRASE2_SAI: F.fimFala + 2,
  CHIP1_ENTRA: F.em("decisão"),
  CHIP1_ACENDE: [F.em("decisão"), F.em("decisão") + 20] as const,
  CHIP1_REAGE: [F.em("procedimento"), F.em("procedimento") + 10] as const,
  CHIP1_SAI: [F.em("Claude") - 6, F.em("Claude") + 6] as const,
  CHIP2_ENTRA: F.em("procedimento"),
  CHIP2_ACENDE: [F.em("procedimento"), F.em("procedimento") + 20] as const,
  CHIP2_REAGE: [F.em("solução"), F.em("solução") + 10] as const,
  CHIP2_SAI: [F.em("Claude") - 4, F.em("Claude") + 8] as const,
  CHIP3_ENTRA: F.em("solução"),
  CHIP3_ACENDE: [F.em("solução"), F.em("solução") + 20] as const,
  CHIP3_SAI: [F.em("Claude") - 2, F.em("Claude") + 10] as const,
  CHIP_BUSCA_ENTRA: F.em("busca"),
  CHIP_BUSCA_ACENDE: [F.em("busca"), F.em("busca") + 20] as const,
  CHIP_BUSCA_REAGE: [F.em("salva"), F.em("salva") + 10] as const,
  CHIP_BUSCA_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  CHIP_SALVA_ENTRA: F.em("salva"),
  CHIP_SALVA_ACENDE: [F.em("salva"), F.em("salva") + 20] as const,
  CHIP_SALVA_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  DICA_ENTRA: [F.em("documentado") + 6, F.em("documentado") + 20] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
/** Caixas no print (px CSS). */
const CAIXAS = {
  decisao: { x: 1300, y: 545, w: 100, h: 34 },
  procedimento: { x: 1270, y: 288, w: 130, h: 34 },
  solucao: { x: 1300, y: 456, w: 100, h: 34 },
};
const TERMINAL = { x: 1060, y: 740, largura: 900, altura: 420 };

export const Cena10Conhecimento: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const zooms = [
    { faixa: T.ZOOM_DECISAO, pulsa: T.MIRA_DECISAO_PULSA, caixa: CAIXAS.decisao, s: 1.3 },
    { faixa: T.ZOOM_PROCEDIMENTO, pulsa: T.MIRA_PROCEDIMENTO_PULSA, caixa: CAIXAS.procedimento, s: 1.3 },
    { faixa: T.ZOOM_SOLUCAO, pulsa: T.MIRA_SOLUCAO_PULSA, caixa: CAIXAS.solucao, s: 1.3 },
  ];
  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z.faixa[0]) ativa = i;
  });
  const z = ativa >= 0 ? zooms[ativa] : null;
  const caixa = z ? G.caixa(z.caixa.x, z.caixa.y, z.caixa.w, z.caixa.h) : null;
  const tomadas = zooms.map((q) => {
    const p = G.ponto(q.caixa.x + q.caixa.w / 2, q.caixa.y + q.caixa.h / 2);
    return { faixa: q.faixa, x: p.x, y: p.y - 60, s: q.s };
  });
  tomadas.push({ faixa: T.ZOOM_TERMINAL, x: TERMINAL.x, y: TERMINAL.y - 40, s: 1.12 });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });
  const check = prog(f, T.CHECK_ENTRA, (t) => t);
  const cmd1 = digitado(CMD1, f, T.COMANDO1_DIGITA, 18);
  const cmd2 = f >= T.COMANDO2_DIGITA ? digitado(CMD2, f, T.COMANDO2_DIGITA, 18) : "";
  const linhas: { texto: string; em: number; cor?: string }[] = [
    { texto: "PETG úmido estala no bico  ·  solução  ·  petg, secagem, falha", em: T.RESPOSTA1_ENTRA, cor: cores.branco },
    { texto: "Secar 6 h a 65 graus na estufa e imprimir direto da caixa seca.", em: T.RESPOSTA2_ENTRA },
  ];
  const chips = [
    [T.CHIP1_ENTRA, T.CHIP1_ACENDE, T.CHIP1_REAGE, T.CHIP1_SAI],
    [T.CHIP2_ENTRA, T.CHIP2_ACENDE, T.CHIP2_REAGE, T.CHIP2_SAI],
    [T.CHIP3_ENTRA, T.CHIP3_ACENDE, undefined, T.CHIP3_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-teclado.mp3")} em={T.COMANDO1_DIGITA} volume={0.35} nome="teclado 1" />
      <Som src={staticFile("audio/erp/sfx-teclado.mp3")} em={T.COMANDO2_DIGITA} volume={0.35} nome="teclado 2" />
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="conhecimento" titulo="FCS ERP · Base de conhecimento" entra={T.LISTA_ENTRA} sai={T.LISTA_SAI} recua={prog(f, T.LISTA_RECUA) * 0.7} y={TELA.y - 60} />
          <Cartao3D f={f} x={TERMINAL.x} y={TERMINAL.y} largura={TERMINAL.largura} altura={TERMINAL.altura} entra={T.TERMINAL_ENTRA} sai={T.TERMINAL_SAI} rx={4} ry={-8} fase={40} pose={{ tz: 120 }} amplitude={f >= T.TERMINAL_FLUTUA ? 1 : 0.3}>
            <Janela titulo="Claude Code · Fcs OS" largura={TERMINAL.largura} altura={TERMINAL.altura} icone={<IconeClaude tamanho={22} giro={f * 1.5} />} acende={pulso(f, T.TERMINAL_ACENDE)}>
              <div style={{ position: "absolute", inset: 0, padding: "22px 30px", display: "flex", flexDirection: "column", gap: 12, fontFamily: fontes.corpo, fontWeight: pesos.destaque, fontSize: 24, lineHeight: 1.35, color: cores.branco }}>
                <div>
                  <span style={{ color: cores.ciano }}>{">"} </span>
                  {cmd1}
                  {f < T.RESPOSTA1_ENTRA ? <Caret f={f} altura={26} digitando={f < T.COMANDO1_FIM} /> : null}
                </div>
                {linhas.map((l, i) => {
                  const a = prog(f, [l.em, l.em + 8]);
                  return (
                    <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 10}px)`, ...estiloCorpo(22, l.cor ?? cores.cinzaTexto) }}>
                      {l.texto}
                    </div>
                  );
                })}
                {f >= T.COMANDO2_DIGITA ? (
                  <div>
                    <span style={{ color: cores.ciano }}>{">"} </span>
                    {cmd2}
                    {f < T.RESPOSTA3_ENTRA ? <Caret f={f} altura={26} digitando={f < T.COMANDO2_FIM} /> : null}
                  </div>
                ) : null}
                {f >= T.RESPOSTA3_ENTRA ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: prog(f, [T.RESPOSTA3_ENTRA, T.RESPOSTA3_ENTRA + 8]) }}>
                    <Check p={check} tamanho={30} />
                    <span style={estiloCorpo(22, cores.branco)}>Salvo em Base de conhecimento, origem: Claude Code.</span>
                  </div>
                ) : null}
              </div>
            </Janela>
          </Cartao3D>
        </Palco>
        {caixa && z ? (
          <Mira x={caixa.x} y={caixa.y - 60} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Conhecimento · e o Claude Code" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 330 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="A base guarda *decisão*, *procedimento* e *solução*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={58} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="O Claude Code *conversa* com ela" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={66} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 200 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {["Decisão", "Procedimento", "Solução"].map((c, i) => {
              const [entra, acende, reage, sai] = chips[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} />;
            })}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <ChipVivo f={f} texto="/kb-buscar" entra={T.CHIP_BUSCA_ENTRA} acende={T.CHIP_BUSCA_ACENDE} reage={T.CHIP_BUSCA_REAGE} sai={T.CHIP_BUSCA_SAI} />
            <ChipVivo f={f} texto="/kb-salvar" entra={T.CHIP_SALVA_ENTRA} acende={T.CHIP_SALVA_ACENDE} sai={T.CHIP_SALVA_SAI} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Pelo MCP do ERP, com token próprio e escopos." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
