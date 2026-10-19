import { chavesDoAmbiente, cifrar, decifrar } from "@/lib/cripto";
import { lerPlataforma, type Plataforma } from "@/dominio/ofertas/plataformas";
import type { Credenciais } from "./conversor";

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

export type CredenciaisCarregadas = Credenciais & { segredos: string[] };
export type LinhaIntegracao = {
  plataforma: string;
  identificadores: unknown;
  segredo: string | null;
};

/** Monta as credenciais a partir das linhas de integração (ERP e worker leem a mesma forma). */
export function credenciaisDasLinhas(
  linhas: LinhaIntegracao[],
  ambiente?: Record<string, string | undefined>,
): CredenciaisCarregadas {
  const c: CredenciaisCarregadas = { segredos: [] };
  for (const l of linhas) {
    const p = lerPlataforma(l.plataforma);
    if (!p) continue;
    const pub = (l.identificadores ?? {}) as Record<string, string>;
    let sec: Record<string, string> = {};
    if (l.segredo) {
      try {
        sec = abrirSegredo(p, l.segredo, ambiente);
      } catch {
        sec = {};
      }
    }
    c.segredos.push(...Object.values(sec));
    if (p === "shopee" && pub.app_id && sec.secret)
      c.shopee = { app_id: pub.app_id, secret: sec.secret };
    if (p === "awin" && pub.publisher_id && sec.api_token)
      c.awin = { publisher_id: pub.publisher_id, api_token: sec.api_token };
    if (p === "amazon" && pub.tag) c.amazon = { tag: pub.tag };
  }
  return c;
}
