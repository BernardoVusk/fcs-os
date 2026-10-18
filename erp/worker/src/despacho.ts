import type { ChaveCripto } from "@/lib/cripto";
import type { Banco } from "./banco";
import type { GerenciadorSessoes } from "./sessoes";

/** Despacho automático da fila (Fase 15). */
export function iniciarDespacho(_: {
  banco: Banco;
  sessoes: GerenciadorSessoes;
  worker: string;
  chaves: { atual: ChaveCripto; todas: ChaveCripto[] };
  parando: () => boolean;
}): ReturnType<typeof setInterval>[] {
  return [];
}
