/**
 * Tipografia da marca, carregada via @remotion/google-fonts (garante que a
 * fonte esteja pronta antes do render, sem troca de fonte no meio do MP4).
 *
 * Regra da marca (`identidade/design-guide.md`):
 * - Títulos e destaques: display geométrica angular, cantos chanfrados, estilo
 *   tech. Chakra Petch é a que mais se aproxima das letras do logo (cantos
 *   cortados a 45°). Caixa alta nos títulos principais. Nunca light.
 * - Corpo, subtítulos e botões: Poppins, a referência mais próxima do "Studio"
 *   do logo.
 */
import { loadFont as carregaChakra } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as carregaPoppins } from "@remotion/google-fonts/Poppins";

const chakra = carregaChakra("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

const poppins = carregaPoppins("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const fontes = {
  /** Chakra Petch 700, caixa alta: títulos, números de destaque, nome de produto. */
  titulo: chakra.fontFamily,
  /** Poppins 400–500: corpo, subtítulos, legendas. */
  corpo: poppins.fontFamily,
  /** Chakra Petch 600 em maiúsculas com tracking largo: etiquetas e rótulos. */
  etiqueta: chakra.fontFamily,
} as const;

/**
 * Peso por papel. Usar sempre daqui, não número solto no componente.
 * Chakra Petch vai até 700: é o "Bold" do design guide para título.
 */
export const pesos = {
  display: 700,
  titulo: 700,
  etiqueta: 600,
  botao: 700,
  destaque: 500,
  corpo: 400,
} as const;

/**
 * Escalas tipográficas relativas à menor dimensão do vídeo, para o mesmo
 * componente servir 1080p e 1920p sem número mágico. Multiplicar pelo
 * `escala` de `useLayout()`.
 */
export const escalaTipo = {
  eyebrow: 22,
  legenda: 26,
  corpo: 34,
  subtitulo: 46,
  titulo: 84,
  display: 140,
} as const;

/**
 * Piso de tamanho por papel, em px do quadro final. Vídeo não dá pra
 * aproximar nem reler: abaixo disto o texto vira ruído no celular.
 */
export const minimoTipo = {
  eyebrow: 20,
  legenda: 24,
  corpo: 32,
  subtitulo: 40,
  titulo: 56,
  display: 72,
} as const;

export type PapelTipo = keyof typeof escalaTipo;

/** Aplica o piso e avisa no console (Studio e log do render) quando não passa. */
export const tamanhoTipo = (papel: PapelTipo, escala: number) => {
  const pedido = escalaTipo[papel] * escala;
  const piso = minimoTipo[papel];
  if (pedido < piso) {
    console.warn(
      `[tipografia] ${papel} ficaria em ${pedido.toFixed(0)}px, abaixo do minimo ` +
        `legivel de ${piso}px. Usando ${piso}px.`,
    );
    return piso;
  }
  return pedido;
};
