/**
 * Logo FCS 3D STUDIO: wordmark "FCS" + bloco "3D Studio", em dois recortes.
 *
 * Os PNGs de `public/logo/` saem do oficial `identidade/logo.png` (ciano sobre
 * preto, 1080x1080): o alfa foi tirado do canal azul, o fundo virou
 * transparência e o arquivo foi aparado no desenho. `fcs-branco*` é o mesmo
 * alfa em branco, para quando o ciano já está em uso no quadro.
 *
 * O recorte separa o wordmark do selo para animar os dois em tempos
 * diferentes. Lado a lado, com o `vao` entre eles, recompõem o logo exato.
 *
 * Regra da marca: o logo só pousa sobre preto ou fundo muito escuro. Nunca
 * distorcer nem recolorir fora destes dois arquivos.
 */
import React from "react";
import { Img, staticFile } from "remotion";

/** Geometria do arquivo-fonte, em px do PNG. */
export const LOGO = {
  largura: 700,
  altura: 192,
  /** "FCS" ocupa as primeiras 490 colunas. */
  wordmark: 490,
  /** Espaço entre o "S" e o bloco "3D Studio". */
  vao: 46,
  /** Bloco "3D Studio", nas últimas 164 colunas. */
  selo: 164,
} as const;

export type CorLogo = "ciano" | "branco";
export type ParteLogo = "completo" | "wordmark" | "selo";

const larguraFonte = (parte: ParteLogo) =>
  parte === "wordmark" ? LOGO.wordmark : parte === "selo" ? LOGO.selo : LOGO.largura;

export const Logo: React.FC<{
  cor?: CorLogo;
  parte?: ParteLogo;
  /** Altura do logo em px do quadro. A largura sai da proporção do recorte. */
  altura: number;
  style?: React.CSSProperties;
}> = ({ cor = "ciano", parte = "completo", altura, style }) => {
  const arquivo =
    parte === "completo" ? `logo/fcs-${cor}.png` : `logo/fcs-${cor}-${parte}.png`;
  return (
    <Img
      src={staticFile(arquivo)}
      style={{
        height: altura,
        width: (larguraFonte(parte) / LOGO.altura) * altura,
        display: "block",
        ...style,
      }}
    />
  );
};
