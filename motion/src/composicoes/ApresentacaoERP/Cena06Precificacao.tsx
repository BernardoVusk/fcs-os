/**
 * Cena 06: precificação. A calculadora preenchida com o circuito de F1; a cada
 * componente nomeado, o cursor clica no campo, a Mira trava na linha da
 * tabela e o chip acende na coluna; em "soma as taxas" a página rola e os
 * três preços (equilíbrio, margem, markup) recebem o zoom; o cursor fecha em
 * "Salvar cálculo".
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, ChipVivo, COLUNA, Cursor, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, interpolar, Palco, prog, pulso, SAI, Som, TELA } from "./kit";

export const DURACAO = duracaoCena("cena06");
const F = fala("cena06");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  TELA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  TELA_ROLA: [F.em("Soma") - 4, F.em("taxas") + 8] as const,
  TELA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  FRASE1_ENTRA: F.instantes(["A", "calculadora", "fecha", "o", "custo", "da", "peça"]),
  FRASE1_DESTAQUE: [F.em("custo") + 6, F.em("peça") + 12] as const,
  FRASE1_SAI: F.em("Soma") - 22,
  FRASE2_ENTRA: F.instantes(["taxas", "do", "canal", "equilíbrio", "margem"]),
  FRASE2_DESTAQUE: [F.em("equilíbrio") + 6, F.em("margem") + 12] as const,
  FRASE2_SAI: F.fimFala + 2,
  ZOOM_CUSTO: [F.em("custo") - 2, F.em("custo") + 14] as const,
  MIRA_CUSTO_PULSA: [F.em("custo") + 14, F.em("custo") + 26] as const,
  ZOOM_MATERIAL: [F.em("material") - 2, F.em("material") + 12] as const,
  MIRA_MATERIAL_PULSA: [F.em("material") + 12, F.em("material") + 24] as const,
  ZOOM_ENERGIA: [F.em("energia") - 2, F.em("energia") + 12] as const,
  MIRA_ENERGIA_PULSA: [F.em("energia") + 12, F.em("energia") + 24] as const,
  ZOOM_IMPRESSORA: [F.em("desgaste") - 2, F.em("desgaste") + 12] as const,
  MIRA_IMPRESSORA_PULSA: [F.em("desgaste") + 12, F.em("desgaste") + 24] as const,
  ZOOM_MAO: [F.em("mão") - 2, F.em("mão") + 12] as const,
  MIRA_MAO_PULSA: [F.em("mão") + 12, F.em("mão") + 24] as const,
  ZOOM_EMBALAGEM: [F.em("embalagem") - 2, F.em("embalagem") + 12] as const,
  MIRA_EMBALAGEM_PULSA: [F.em("embalagem") + 12, F.em("embalagem") + 24] as const,
  ZOOM_CANAL: [F.em("taxas") - 2, F.em("taxas") + 14] as const,
  MIRA_CANAL_PULSA: [F.em("taxas") + 14, F.em("taxas") + 26] as const,
  ZOOM_EQUILIBRIO: [F.em("equilíbrio") - 2, F.em("equilíbrio") + 14] as const,
  MIRA_EQUILIBRIO_PULSA: [F.em("equilíbrio") + 14, F.em("equilíbrio") + 26] as const,
  ZOOM_MARGEM: [F.em("margem") - 2, F.em("margem") + 14] as const,
  MIRA_MARGEM_PULSA: [F.em("margem") + 14, F.em("margem") + 26] as const,
  ZOOM_MARKUP: [F.em("real") - 2, F.em("real") + 14] as const,
  MIRA_MARKUP_PULSA: [F.em("real") + 14, F.em("real") + 26] as const,
  CAMERA_SOLTA: [F.em("marketplace") + 4, F.em("marketplace") + 20] as const,
  MIRA_SAI: [F.fimFala + 2, F.fimFala + 12] as const,
  CHIP1_ENTRA: F.em("material"),
  CHIP1_ACENDE: [F.em("material"), F.em("material") + 20] as const,
  CHIP1_REAGE: [F.em("energia"), F.em("energia") + 10] as const,
  CHIP1_SAI: [F.em("Soma") - 4, F.em("Soma") + 8] as const,
  CHIP2_ENTRA: F.em("energia"),
  CHIP2_ACENDE: [F.em("energia"), F.em("energia") + 20] as const,
  CHIP2_REAGE: [F.em("desgaste"), F.em("desgaste") + 10] as const,
  CHIP2_SAI: [F.em("Soma") - 2, F.em("Soma") + 10] as const,
  CHIP3_ENTRA: F.em("desgaste"),
  CHIP3_ACENDE: [F.em("desgaste"), F.em("desgaste") + 20] as const,
  CHIP3_REAGE: [F.em("mão"), F.em("mão") + 10] as const,
  CHIP3_SAI: [F.em("Soma"), F.em("Soma") + 12] as const,
  CHIP4_ENTRA: F.em("mão"),
  CHIP4_ACENDE: [F.em("mão"), F.em("mão") + 20] as const,
  CHIP4_REAGE: [F.em("embalagem"), F.em("embalagem") + 10] as const,
  CHIP4_SAI: [F.em("Soma") + 2, F.em("Soma") + 14] as const,
  CHIP5_ENTRA: F.em("embalagem"),
  CHIP5_ACENDE: [F.em("embalagem"), F.em("embalagem") + 20] as const,
  CHIP5_SAI: [F.em("Soma") + 4, F.em("Soma") + 16] as const,
  PRECO1_ENTRA: F.em("equilíbrio"),
  PRECO1_ACENDE: [F.em("equilíbrio"), F.em("equilíbrio") + 20] as const,
  PRECO1_REAGE: [F.em("margem"), F.em("margem") + 10] as const,
  PRECO1_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  PRECO2_ENTRA: F.em("margem"),
  PRECO2_ACENDE: [F.em("margem"), F.em("margem") + 24] as const,
  PRECO2_REAGE: [F.em("real"), F.em("real") + 10] as const,
  PRECO2_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  PRECO3_ENTRA: F.em("real"),
  PRECO3_ACENDE: [F.em("real"), F.em("real") + 20] as const,
  PRECO3_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  CURSOR_ENTRA: [F.em("fecha"), F.em("fecha") + 10] as const,
  CURSOR_VAI1: F.em("material") - 2,
  CLIQUE_INSUMO: F.em("material") + 4,
  CURSOR_VAI2: F.em("desgaste") - 2,
  CLIQUE_IMPRESSORA: F.em("desgaste") + 4,
  CURSOR_VAI3: F.em("mão") - 2,
  CLIQUE_MAO: F.em("mão") + 4,
  CURSOR_VAI4: F.em("taxas"),
  CLIQUE_CANAL: F.em("taxas") + 6,
  CURSOR_VAI5: F.fimFala - 14,
  CLIQUE_SALVAR: F.fimFala - 6,
  SALVAR_ACENDE: [F.fimFala - 6, F.fimFala + 10] as const,
  CURSOR_SAI: [F.fimFala + 10, F.fimFala + 18] as const,
  DICA_ENTRA: [F.em("marketplace"), F.em("marketplace") + 14] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
const ROLA_FIM = 520;
/** Caixas no print (px CSS da página inteira de 1329). */
const CAIXAS = {
  custo: { x: 830, y: 190, w: 182, h: 150 },
  material: { x: 830, y: 400, w: 570, h: 36 },
  energia: { x: 830, y: 548, w: 570, h: 36 },
  impressora: { x: 830, y: 437, w: 570, h: 110 },
  mao: { x: 830, y: 585, w: 570, h: 73 },
  embalagem: { x: 830, y: 659, w: 570, h: 36 },
  canal: { x: 308, y: 1210, w: 480, h: 44 },
  equilibrio: { x: 830, y: 810, w: 182, h: 202 },
  margem: { x: 1025, y: 810, w: 182, h: 202 },
  markup: { x: 1220, y: 810, w: 182, h: 202 },
  insumoCampo: { x: 555, y: 572, w: 230, h: 36 },
  impressoraCampo: { x: 308, y: 666, w: 230, h: 36 },
  maoCampo: { x: 308, y: 980, w: 150, h: 36 },
  salvar: { x: 850, y: 1210, w: 122, h: 34 },
};
const COMPONENTES = ["Material", "Energia", "Impressora", "Mão de obra", "Embalagem"] as const;
const PRECOS = ["Equilíbrio R$ 32,35", "Margem 25%: R$ 48,21", "Markup 25%: R$ 38,81"] as const;

export const Cena06Precificacao: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const rola = interpolar(f, T.TELA_ROLA, 0, ROLA_FIM);
  const zooms = [
    { faixa: T.ZOOM_CUSTO, pulsa: T.MIRA_CUSTO_PULSA, caixa: CAIXAS.custo, s: 1.22 },
    { faixa: T.ZOOM_MATERIAL, pulsa: T.MIRA_MATERIAL_PULSA, caixa: CAIXAS.material, s: 1.18 },
    { faixa: T.ZOOM_ENERGIA, pulsa: T.MIRA_ENERGIA_PULSA, caixa: CAIXAS.energia, s: 1.18 },
    { faixa: T.ZOOM_IMPRESSORA, pulsa: T.MIRA_IMPRESSORA_PULSA, caixa: CAIXAS.impressora, s: 1.18 },
    { faixa: T.ZOOM_MAO, pulsa: T.MIRA_MAO_PULSA, caixa: CAIXAS.mao, s: 1.18 },
    { faixa: T.ZOOM_EMBALAGEM, pulsa: T.MIRA_EMBALAGEM_PULSA, caixa: CAIXAS.embalagem, s: 1.18 },
    { faixa: T.ZOOM_CANAL, pulsa: T.MIRA_CANAL_PULSA, caixa: CAIXAS.canal, s: 1.2 },
    { faixa: T.ZOOM_EQUILIBRIO, pulsa: T.MIRA_EQUILIBRIO_PULSA, caixa: CAIXAS.equilibrio, s: 1.24 },
    { faixa: T.ZOOM_MARGEM, pulsa: T.MIRA_MARGEM_PULSA, caixa: CAIXAS.margem, s: 1.24 },
    { faixa: T.ZOOM_MARKUP, pulsa: T.MIRA_MARKUP_PULSA, caixa: CAIXAS.markup, s: 1.24 },
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
  const ponto = (c: { x: number; y: number; w: number; h: number }) => G.ponto(c.x + c.w * 0.8, c.y + c.h / 2, rola);
  const salvar = G.caixa(CAIXAS.salvar.x, CAIXAS.salvar.y, CAIXAS.salvar.w, CAIXAS.salvar.h, rola);
  const salvarAcende = pulso(f, T.SALVAR_ACENDE);
  const chips = [
    [T.CHIP1_ENTRA, T.CHIP1_ACENDE, T.CHIP1_REAGE, T.CHIP1_SAI],
    [T.CHIP2_ENTRA, T.CHIP2_ACENDE, T.CHIP2_REAGE, T.CHIP2_SAI],
    [T.CHIP3_ENTRA, T.CHIP3_ACENDE, T.CHIP3_REAGE, T.CHIP3_SAI],
    [T.CHIP4_ENTRA, T.CHIP4_ACENDE, T.CHIP4_REAGE, T.CHIP4_SAI],
    [T.CHIP5_ENTRA, T.CHIP5_ACENDE, undefined, T.CHIP5_SAI],
  ] as const;
  const precos = [
    [T.PRECO1_ENTRA, T.PRECO1_ACENDE, T.PRECO1_REAGE, T.PRECO1_SAI],
    [T.PRECO2_ENTRA, T.PRECO2_ACENDE, T.PRECO2_REAGE, T.PRECO2_SAI],
    [T.PRECO3_ENTRA, T.PRECO3_ACENDE, undefined, T.PRECO3_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      {[T.CLIQUE_INSUMO, T.CLIQUE_IMPRESSORA, T.CLIQUE_MAO, T.CLIQUE_CANAL, T.CLIQUE_SALVAR].map((c, i) => (
        <Som key={i} src={staticFile("audio/erp/sfx-clique.mp3")} em={c} volume={0.4} nome={`clique ${i + 1}`} />
      ))}
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="precificacao-completa" titulo="FCS ERP · Catálogo · Precificação" entra={T.TELA_ENTRA} sai={T.TELA_SAI} rola={rola} alturaPrint={1329} acende={salvarAcende * 0.5} />
        </Palco>
        {caixa && z && f >= T.TELA_ENTRA[1] ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}
        {salvarAcende > 0 ? (
          <div style={{ position: "absolute", left: salvar.x - 6, top: salvar.y - 6, width: salvar.largura + 12, height: salvar.altura + 12, border: "3px solid #00D8FF", opacity: salvarAcende, clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }} />
        ) : null}
        <Cursor
          f={f}
          entra={T.CURSOR_ENTRA}
          sai={T.CURSOR_SAI}
          caminho={[
            [T.CURSOR_ENTRA[0], 1500, 1000],
            [T.CURSOR_VAI1, ponto(CAIXAS.insumoCampo).x, ponto(CAIXAS.insumoCampo).y],
            [T.CURSOR_VAI2, ponto(CAIXAS.impressoraCampo).x, ponto(CAIXAS.impressoraCampo).y],
            [T.CURSOR_VAI3, ponto(CAIXAS.maoCampo).x, ponto(CAIXAS.maoCampo).y],
            [T.CURSOR_VAI4, ponto(CAIXAS.canal).x - 200, ponto(CAIXAS.canal).y],
            [T.CURSOR_VAI5, salvar.x + salvar.largura * 0.6, salvar.y + salvar.altura * 0.6],
          ]}
          cliques={[T.CLIQUE_INSUMO, T.CLIQUE_IMPRESSORA, T.CLIQUE_MAO, T.CLIQUE_CANAL, T.CLIQUE_SALVAR]}
        />
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Catálogo · precificação" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 240 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="A calculadora fecha o *custo da peça*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={66} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Taxas do canal, *equilíbrio*, *margem*" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={66} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 340 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {COMPONENTES.map((c, i) => {
              const [entra, acende, reage, sai] = chips[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} />;
            })}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {PRECOS.map((c, i) => {
              const [entra, acende, reage, sai] = precos[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} aceso={i === 1 && f >= entra ? 0.5 : 0} />;
            })}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="A margem real aparece em cada marketplace, no preço vigente." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
