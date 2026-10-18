import { chavesDoAmbiente, cifrar, decifrar } from "@/lib/cripto";
import type { Plataforma } from "@/dominio/ofertas/plataformas";

/**
 * Formato do segredo de uma integração: JSON com os campos secretos da plataforma, cifrado com o
 * contexto da linha. Usado pelo ERP (credenciais.ts) e pelo worker, que leem a mesma tabela.
 */

const contexto = (p: Plataforma) => `ofe_integracoes_segredos:${p}`;

export function fecharSegredo(
  plataforma: Plataforma,
  valores: Record<string, string>,
  ambiente?: Record<string, string | undefined>,
): { segredo: string; chaveId: string } {
  const { atual } = chavesDoAmbiente(ambiente);
  return {
    segredo: cifrar(JSON.stringify(valores), atual, contexto(plataforma)),
    chaveId: atual.id,
  };
}

export function abrirSegredo(
  plataforma: Plataforma,
  segredo: string,
  ambiente?: Record<string, string | undefined>,
): Record<string, string> {
  const { todas } = chavesDoAmbiente(ambiente);
  const valores = JSON.parse(decifrar(segredo, todas, contexto(plataforma))) as unknown;
  if (!valores || typeof valores !== "object") throw new Error("cifra_invalida");
  return Object.fromEntries(
    Object.entries(valores as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
}

/** Tira de um texto (erro de API, log) qualquer valor secreto conhecido. */
export function redigir(texto: string, segredos: (string | null | undefined)[]): string {
  let saida = texto;
  for (const s of segredos) if (s && s.length >= 6) saida = saida.split(s).join("[segredo]");
  return saida;
}
