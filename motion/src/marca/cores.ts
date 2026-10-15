/**
 * Paleta oficial da FCS 3D STUDIO para vídeo.
 *
 * Fonte da verdade: `identidade/design-guide.md`. A base é o logo: ciano
 * elétrico sobre preto. Fundo claro e cor quente (laranja, vermelho, amarelo)
 * como destaque são proibidos pela marca, assim como gradiente multicolorido.
 *
 * Os tokens marcados como DERIVADOS não são cores novas: são mistura de duas
 * cores da paleta, sólida, criada só para a camada de ambiente ter delta de
 * luma suficiente (aprendizado E11) sem sair da família da marca e sem usar
 * opacidade sobre o ciano (aprendizado E2).
 */
export const cores = {
  /* ---- Superfícies ---- */
  /** Preto quase puro. Fundo padrão de todo vídeo. */
  preto: "#0A0A0A",
  /** Cinza muito escuro. Cards, painéis e fundo alternativo. */
  grafite: "#141414",
  /** Borda fina de card (1px na escala 1). */
  borda: "#1F1F1F",

  /* ---- Texto ---- */
  /** Texto principal sobre o escuro. */
  branco: "#FFFFFF",

  /* ---- Marca e ação ---- */
  /** Ciano elétrico do logo. Títulos, destaques, CTA, grafismo. Sempre cheio. */
  ciano: "#00D8FF",

  /* ---- Derivados (mistura da paleta, uso restrito) ---- */
  /**
   * 62% branco + 38% preto. Texto secundário e rótulos sobre o preto. O design
   * guide não define cinza de texto; este sai das duas cores da base.
   */
  cinzaTexto: "#A0A0A0",
  /**
   * 20% ciano + 80% preto, sólido. É o "ciano em 20% de opacidade" das bordas
   * do design guide, já resolvido em cor cheia. Camada de ambiente sobre o
   * preto (delta de luma ~32) e linha fina da malha da mesa.
   */
  cianoTrama: "#08333B",
  /** Cinza neutro de ambiente sobre o preto (delta ~41) e sobre o grafite (~31). */
  grafiteTrama: "#333333",

  /* ---- Estado: só com função de status, nunca decorativo ---- */
  sucesso: "#2F8F5B",
  erro: "#C43D2F",
} as const;

/**
 * Cantos. A marca não arredonda: cards e molduras têm canto reto ou chanfrado
 * a 45°, como as letras do logo. Raio só até 4px, para suavizar aresta de
 * elemento pequeno. O chanfro se aplica com `chanfro()` de Corte.tsx.
 */
export const cantos = {
  /** Raio máximo permitido. */
  raio: 4,
  /** Tamanho do chanfro por papel, em px na escala 1. Design guide: 8 a 12. */
  chanfroPequeno: 8,
  chanfroMedio: 12,
  chanfroGrande: 24,
} as const;

/**
 * Brilho ciano. Profundidade na marca vem de diferença de tom e de brilho,
 * nunca de sombra cinza. Em vídeo o brilho é acento de impacto (pulso curto),
 * não estado parado.
 */
export const brilho = (intensidade: number, escala = 1) =>
  intensidade <= 0
    ? "none"
    : `drop-shadow(0 0 ${(18 * escala * intensidade).toFixed(1)}px ${cores.ciano})`;
