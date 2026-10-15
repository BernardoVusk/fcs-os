/**
 * Formatos de entrega. Todos a 30fps (padrao das redes).
 *
 * Um mesmo componente serve todos: o layout deriva da proporcao via
 * `useVideoConfig()` (ver `useLayout`), sem duplicar arvore de layout.
 */
export const FPS = 30;

export const FORMATOS = {
  /** Instagram Reels e Stories, TikTok e TikTok Shop. O principal da FCS. */
  reels: { width: 1080, height: 1920, fps: FPS },
  /** Feed vertical do Instagram: ocupa mais tela que o quadrado. */
  feed: { width: 1080, height: 1350, fps: FPS },
  /** Video de anuncio em marketplace e feed quadrado. */
  quadrado: { width: 1080, height: 1080, fps: FPS },
  /** YouTube, apresentacao. */
  landscape: { width: 1920, height: 1080, fps: FPS },
} as const;

export type Formato = keyof typeof FORMATOS;
