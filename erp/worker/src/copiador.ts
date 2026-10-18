import type { ChaveCripto } from "@/lib/cripto";
import type { Banco } from "./banco";
import type { GerenciadorSessoes } from "./sessoes";

/** Copiador de grupos de origem autorizados (Fase 16). */
export function iniciarCopiador(_: {
  banco: Banco;
  sessoes: GerenciadorSessoes;
  chaves: { atual: ChaveCripto; todas: ChaveCripto[] };
}): void {}
