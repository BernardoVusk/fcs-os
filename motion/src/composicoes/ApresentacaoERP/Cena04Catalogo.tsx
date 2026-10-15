/**
 * Cena 04: catálogo. A lista de produtos entra; os três canais acendem nas
 * palavras; o cursor abre o circuito de F1 e a ficha sobe na frente (a lista
 * recua em Z); a página rola e a Mira trava no custo, no material e nas linhas
 * da impressora; os quatro campos da ficha entram como chips vivos.
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";

import { Mira } from "../../componentes/Mira";
import { camera, CardTela, ChipVivo, COLUNA, Cursor, Dica, duracaoCena, EMENDA, Etiqueta, fala, Frase, geometriaTela, interpolar, Palco, prog, pulso, SAI, Som, TELA } from "./kit";

export const DURACAO = duracaoCena("cena04");
const F = fala("cena04");

const TIMING = {
  ETIQUETA_ENTRA: [EMENDA, EMENDA + 18] as const,
  ETIQUETA_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  LISTA_ENTRA: [EMENDA - 4, EMENDA + 16] as const,
  LISTA_FLUTUA: EMENDA + 16,
  LISTA_RECUA: [F.em("Cada") - 6, F.em("Cada") + 12] as const,
  LISTA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  FRASE1_ENTRA: F.instantes(["O", "catálogo", "veio", "dos", "anúncios"]),
  FRASE1_DESTAQUE: [F.em("dos") + 6, F.em("anúncios") + 12] as const,
  FRASE1_SAI: F.em("Cada") - 22,
  CANAL1_ENTRA: F.em("Shopee") - 8,
  CANAL1_ACENDE: [F.em("Shopee"), F.em("Shopee") + 20] as const,
  CANAL1_REAGE: [F.em("Mercado"), F.em("Mercado") + 10] as const,
  CANAL1_SAI: [F.em("Cada") - 4, F.em("Cada") + 8] as const,
  CANAL2_ENTRA: F.em("Mercado") - 8,
  CANAL2_ACENDE: [F.em("Mercado"), F.em("Mercado") + 20] as const,
  CANAL2_REAGE: [F.em("TikTok"), F.em("TikTok") + 10] as const,
  CANAL2_SAI: [F.em("Cada") - 2, F.em("Cada") + 10] as const,
  CANAL3_ENTRA: F.em("TikTok") - 8,
  CANAL3_ACENDE: [F.em("TikTok"), F.em("TikTok") + 20] as const,
  CANAL3_SAI: [F.em("Cada"), F.em("Cada") + 12] as const,
  MIRA_LISTA_ENTRA: [F.em("anúncios"), F.em("anúncios") + 8] as const,
  MIRA_LISTA_TRAVA: [F.em("anúncios"), F.em("Shopee")] as const,
  MIRA_LISTA_SAI: [F.em("Cada") - 6, F.em("Cada") + 4] as const,
  CURSOR_ENTRA: [F.em("TikTok"), F.em("TikTok") + 10] as const,
  CURSOR_VAI: F.em("Cada") - 12,
  CURSOR_CLICA: F.em("Cada") - 8,
  CURSOR_SAI: [F.em("ficha"), F.em("ficha") + 8] as const,
  FICHA_ENTRA: [F.em("Cada") - 4, F.em("Cada") + 18] as const,
  FICHA_FLUTUA: F.em("Cada") + 18,
  FICHA_ROLA: [F.em("tempo") + 4, F.em("material") - 2] as const,
  FICHA_SAI: [DURACAO - EMENDA - 2, DURACAO - 2] as const,
  FRASE2_ENTRA: F.instantes(["Cada", "produto", "tem", "a", "ficha"]),
  FRASE2_DESTAQUE: [F.em("a", 9) + 6, F.em("ficha") + 12] as const,
  FRASE2_SAI: F.fimFala + 2,
  CAMPO1_ENTRA: F.em("peso"),
  CAMPO1_ACENDE: [F.em("peso"), F.em("peso") + 20] as const,
  CAMPO1_REAGE: [F.em("tempo"), F.em("tempo") + 10] as const,
  CAMPO1_SAI: [F.fimFala + 2, F.fimFala + 14] as const,
  CAMPO2_ENTRA: F.em("tempo"),
  CAMPO2_ACENDE: [F.em("tempo"), F.em("tempo") + 20] as const,
  CAMPO2_REAGE: [F.em("material"), F.em("material") + 10] as const,
  CAMPO2_SAI: [F.fimFala + 4, F.fimFala + 16] as const,
  CAMPO3_ENTRA: F.em("material"),
  CAMPO3_ACENDE: [F.em("material"), F.em("material") + 20] as const,
  CAMPO3_REAGE: [F.em("impressora"), F.em("impressora") + 10] as const,
  CAMPO3_SAI: [F.fimFala + 6, F.fimFala + 18] as const,
  CAMPO4_ENTRA: F.em("impressora"),
  CAMPO4_ACENDE: [F.em("impressora"), F.em("impressora") + 20] as const,
  CAMPO4_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
  ZOOM_CUSTO: [F.em("ficha") - 2, F.em("ficha") + 14] as const,
  MIRA_CUSTO_PULSA: [F.em("ficha") + 14, F.em("ficha") + 26] as const,
  ZOOM_PESO: [F.em("peso") - 2, F.em("peso") + 14] as const,
  MIRA_PESO_PULSA: [F.em("peso") + 14, F.em("peso") + 26] as const,
  ZOOM_MATERIAL: [F.em("material") - 2, F.em("material") + 14] as const,
  MIRA_MATERIAL_PULSA: [F.em("material") + 14, F.em("material") + 26] as const,
  ZOOM_IMPRESSORA: [F.em("impressora") - 2, F.em("impressora") + 14] as const,
  MIRA_IMPRESSORA_PULSA: [F.em("impressora") + 14, F.em("impressora") + 26] as const,
  ZOOM_MARGEM: [F.em("impressora") + 26, F.em("impressora") + 42] as const,
  MIRA_MARGEM_PULSA: [F.em("impressora") + 42, F.em("impressora") + 54] as const,
  CAMERA_SOLTA: [F.fimFala + 6, F.fimFala + 18] as const,
  MIRA_SAI: [F.fimFala + 8, F.fimFala + 18] as const,
  DICA_ENTRA: [F.em("impressora") + 30, F.em("impressora") + 44] as const,
  DICA_SAI: [F.fimFala + 8, F.fimFala + 20] as const,
} as const;

const CANAIS = ["Shopee", "Mercado Livre", "TikTok Shop"] as const;
const CAMPOS = ["Peso", "Tempo de impressão", "Material", "Impressora"] as const;
const G = geometriaTela(TELA.x, TELA.y, TELA.largura, TELA.altura);
const ROLA_FIM = 380;

/** Caixas no print da ficha (px CSS, página inteira de 1273). */
const CAIXAS = {
  lista: { x: 288, y: 290, w: 1112, h: 420 },
  custo: { x: 288, y: 128, w: 760, h: 44 },
  cardCusto: { x: 288, y: 230, w: 242, h: 112 },
  material: { x: 288, y: 740, w: 1112, h: 40 },
  impressora: { x: 288, y: 860, w: 1112, h: 116 },
  margem: { x: 288, y: 1196, w: 1112, h: 44 },
};

export const Cena04Catalogo: React.FC = () => {
  const f = useCurrentFrame();
  const T = TIMING;
  const rola = interpolar(f, T.FICHA_ROLA, 0, ROLA_FIM);
  const zooms = [
    { faixa: T.ZOOM_CUSTO, pulsa: T.MIRA_CUSTO_PULSA, caixa: CAIXAS.cardCusto, s: 1.26 },
    { faixa: T.ZOOM_PESO, pulsa: T.MIRA_PESO_PULSA, caixa: CAIXAS.custo, s: 1.22 },
    { faixa: T.ZOOM_MATERIAL, pulsa: T.MIRA_MATERIAL_PULSA, caixa: CAIXAS.material, s: 1.16 },
    { faixa: T.ZOOM_IMPRESSORA, pulsa: T.MIRA_IMPRESSORA_PULSA, caixa: CAIXAS.impressora, s: 1.16 },
    { faixa: T.ZOOM_MARGEM, pulsa: T.MIRA_MARGEM_PULSA, caixa: CAIXAS.margem, s: 1.18 },
  ];
  let ativa = -1;
  zooms.forEach((z, i) => {
    if (f >= z.faixa[0]) ativa = i;
  });
  const z = ativa >= 0 ? zooms[ativa] : null;
  const caixa = z ? G.caixa(z.caixa.x, z.caixa.y, z.caixa.w, z.caixa.h, rola) : null;
  const miraLista = prog(f, T.MIRA_LISTA_ENTRA) * (1 - prog(f, T.MIRA_LISTA_SAI, SAI));
  const cl = G.caixa(CAIXAS.lista.x, CAIXAS.lista.y, CAIXAS.lista.w, CAIXAS.lista.h);
  const tomadas = zooms.map((q) => {
    const p = G.ponto(q.caixa.x + q.caixa.w / 2, q.caixa.y + q.caixa.h / 2, rola);
    return { faixa: q.faixa, x: p.x, y: Math.min(900, Math.max(200, p.y)), s: q.s };
  });
  tomadas.push({ faixa: T.CAMERA_SOLTA, x: 960, y: 540, s: 1 });
  const linha = G.ponto(700, 330);
  const canais = [
    [T.CANAL1_ENTRA, T.CANAL1_ACENDE, T.CANAL1_REAGE, T.CANAL1_SAI],
    [T.CANAL2_ENTRA, T.CANAL2_ACENDE, T.CANAL2_REAGE, T.CANAL2_SAI],
    [T.CANAL3_ENTRA, T.CANAL3_ACENDE, undefined, T.CANAL3_SAI],
  ] as const;
  const campos = [
    [T.CAMPO1_ENTRA, T.CAMPO1_ACENDE, T.CAMPO1_REAGE, T.CAMPO1_SAI],
    [T.CAMPO2_ENTRA, T.CAMPO2_ACENDE, T.CAMPO2_REAGE, T.CAMPO2_SAI],
    [T.CAMPO3_ENTRA, T.CAMPO3_ACENDE, T.CAMPO3_REAGE, T.CAMPO3_SAI],
    [T.CAMPO4_ENTRA, T.CAMPO4_ACENDE, undefined, T.CAMPO4_SAI],
  ] as const;

  return (
    <AbsoluteFill>
      <Som src={staticFile("audio/erp/sfx-clique.mp3")} em={T.CURSOR_CLICA} volume={0.4} nome="clique" />
      <div style={{ position: "absolute", inset: 0, transform: camera(f, tomadas) }}>
        <Palco>
          <CardTela f={f} arquivo="catalogo-produtos" titulo="FCS ERP · Catálogo · Produtos" entra={T.LISTA_ENTRA} sai={T.LISTA_SAI} recua={prog(f, T.LISTA_RECUA)} />
          <CardTela f={f} arquivo="catalogo-produto-circuito" titulo="FCS ERP · Circuito Fórmula 1" entra={T.FICHA_ENTRA} sai={T.FICHA_SAI} rola={rola} alturaPrint={1273} fase={40} />
        </Palco>

        {miraLista > 0 ? (
          <Mira x={cl.x} y={cl.y} largura={cl.largura} altura={cl.altura} entrada={miraLista} trava={prog(f, T.MIRA_LISTA_TRAVA)} espessura={4} folga={8} />
        ) : null}
        {caixa && z && f >= T.FICHA_ENTRA[1] ? (
          <Mira x={caixa.x} y={caixa.y} largura={caixa.largura} altura={caixa.altura} entrada={1} trava={prog(f, z.faixa)} pulso={pulso(f, z.pulsa)} sai={prog(f, T.MIRA_SAI, SAI)} espessura={4} folga={8} />
        ) : null}

        <Cursor
          f={f}
          entra={T.CURSOR_ENTRA}
          sai={T.CURSOR_SAI}
          caminho={[
            [T.CURSOR_ENTRA[0], 1500, 1000],
            [T.CURSOR_VAI, linha.x, linha.y],
          ]}
          cliques={[T.CURSOR_CLICA]}
        />
      </div>

      <div style={{ position: "absolute", left: COLUNA.x, top: COLUNA.y, display: "flex", flexDirection: "column", gap: 28, width: COLUNA.largura }}>
        <Etiqueta f={f} texto="Catálogo · produtos" entra={T.ETIQUETA_ENTRA} sai={T.ETIQUETA_SAI} />
        <div style={{ position: "relative", height: 240 }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="O catálogo veio *dos anúncios*" instantes={T.FRASE1_ENTRA} saida={T.FRASE1_SAI} tamanho={70} largura={600} />
          </div>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Frase f={f} texto="Cada produto tem *a ficha*" instantes={T.FRASE2_ENTRA} saida={T.FRASE2_SAI} tamanho={70} largura={600} />
          </div>
        </div>
        <div style={{ position: "relative", height: 300 }}>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {CANAIS.map((c, i) => {
              const [entra, acende, reage, sai] = canais[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} tamanho={22} />;
            })}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {CAMPOS.map((c, i) => {
              const [entra, acende, reage, sai] = campos[i];
              return <ChipVivo key={c} f={f} texto={c} entra={entra} acende={acende} reage={reage} sai={sai} tamanho={22} />;
            })}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: COLUNA.x, top: 900 }}>
        <Dica f={f} texto="Margem por canal: 14,4%, abaixo da meta de 25%." entra={T.DICA_ENTRA} sai={T.DICA_SAI} />
      </div>
    </AbsoluteFill>
  );
};
