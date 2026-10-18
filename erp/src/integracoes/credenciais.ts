import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { abrirSegredo } from "./segredo";
import type { Credenciais } from "./conversor";
import { lerPlataforma, type Plataforma } from "@/dominio/ofertas/plataformas";

/**
 * Único ponto do ERP que lê e decifra segredo de integração (service role, decisão registrada em
 * docs/arquitetura.md). Devolve as credenciais em memória para a chamada da API; nunca para a tela.
 */

type Linha = { plataforma: string; identificadores: unknown; segredo: { segredo: string } | null };

export type CredenciaisCarregadas = Credenciais & { segredos: string[] };

export async function carregarCredenciais(): Promise<CredenciaisCarregadas> {
  const { data, error } = await clienteAdmin("web")
    .from("ofe_integracoes")
    .select("plataforma, identificadores, segredo:ofe_integracoes_segredos(segredo)");
  if (error) throw new Error("erro_inesperado");
  const saida: CredenciaisCarregadas = { segredos: [] };
  for (const l of (data ?? []) as unknown as Linha[]) {
    const p = lerPlataforma(l.plataforma);
    if (!p) continue;
    const pub = (l.identificadores ?? {}) as Record<string, string>;
    let sec: Record<string, string> = {};
    if (l.segredo?.segredo) {
      try {
        sec = abrirSegredo(p, l.segredo.segredo);
      } catch {
        sec = {};
      }
    }
    saida.segredos.push(...Object.values(sec));
    montar(saida, p, pub, sec);
  }
  return saida;
}

function montar(
  c: Credenciais,
  p: Plataforma,
  pub: Record<string, string>,
  sec: Record<string, string>,
) {
  if (p === "shopee" && pub.app_id && sec.secret)
    c.shopee = { app_id: pub.app_id, secret: sec.secret };
  if (p === "awin" && pub.publisher_id && sec.api_token)
    c.awin = { publisher_id: pub.publisher_id, api_token: sec.api_token };
  if (p === "amazon" && pub.tag) c.amazon = { tag: pub.tag };
}
