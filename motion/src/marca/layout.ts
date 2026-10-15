/**
 * Deriva orientacao, escala e zonas seguras a partir das dimensoes da
 * composicao atual.
 *
 * Assim um mesmo componente serve landscape, reels e feed sem duplicar arvore
 * de layout: quem monta a peca le `orientacao` pra decidir empilhamento e
 * multiplica os tamanhos por `escala`.
 */
import { useVideoConfig } from "remotion";

/** Referencia de escala: a menor dimensao do landscape (1920x1080). */
const BASE = 1080;

export type Orientacao = "horizontal" | "vertical";

export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const proporcao = width / height;
  const vertical = proporcao < 1;

  return {
    width,
    height,
    proporcao,
    orientacao: (vertical ? "vertical" : "horizontal") as Orientacao,
    /** Multiplicador de tamanho, ancorado na menor dimensao do quadro. */
    escala: Math.min(width, height) / BASE,
    /** Margem de seguranca das bordas. */
    margem: Math.min(width, height) * 0.08,

    /**
     * Faixas cobertas pela interface da rede social, em px.
     *
     * Instagram, TikTok e YouTube desenham perfil, legenda, botoes de curtir e
     * descricao por cima do video em formato vertical. Conteudo critico
     * (numero, CTA, contato) nessas faixas fica tapado no feed, mesmo aparecendo
     * certo no Studio.
     *
     * Em landscape nao ha sobreposicao — o video roda em player proprio.
     */
    zonaSegura: vertical
      ? { topo: height * 0.15, base: height * 0.2 }
      : { topo: 0, base: 0 },
  };
};

/**
 * Altura util entre as zonas seguras. Usar como `maxHeight` do bloco de
 * conteudo em peca vertical com muito texto.
 */
export const alturaUtil = (
  height: number,
  zona: { topo: number; base: number },
) => height - zona.topo - zona.base;
