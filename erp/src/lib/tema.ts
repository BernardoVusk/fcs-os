export const TEMAS = ["escuro", "claro"] as const;
export type Tema = (typeof TEMAS)[number];
export const COOKIE_TEMA = "fcs-tema";

export function lerTema(valor: string | undefined | null): Tema {
  return valor === "claro" ? "claro" : "escuro";
}
