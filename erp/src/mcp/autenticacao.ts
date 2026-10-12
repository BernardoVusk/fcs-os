import "server-only";
import { createHash } from "node:crypto";
import { clienteAdmin } from "@/lib/supabase/admin";
import { lerPapel, type Papel } from "@/lib/auth/papeis";
import { lerEscopos, type Escopo } from "@/dominio/conhecimento/escopos";

export type SessaoMcp = {
  tokenId: string;
  usuarioId: string;
  nome: string;
  papel: Papel;
  escopos: Escopo[];
  expiraEm: string | null;
};

const TTL_CACHE_MS = 60_000;
const cache = new Map<string, { sessao: SessaoMcp | null; ate: number }>();

export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Valida o Bearer: hash em tokens_integracao, não revogado, não expirado, usuário ativo.
 * Resultado fica 60 s em cache por processo para não bater no banco a cada ferramenta.
 */
export async function verificarToken(bearer: string, agora = Date.now()): Promise<SessaoMcp | null> {
  if (!bearer.startsWith("fcs_") || bearer.length < 30 || bearer.length > 200) return null;
  const emCache = cache.get(bearer);
  if (emCache && emCache.ate > agora) return emCache.sessao;

  const admin = clienteAdmin("mcp");
  const { data } = await admin
    .from("tokens_integracao")
    .select("id, usuario_id, escopos, expira_em, revogado_em, ultimo_uso_em, usuario:usuarios_app!tokens_integracao_usuario_id_fkey(nome, papel, ativo)")
    .eq("hash_token", hashDoToken(bearer))
    .maybeSingle();

  let sessao: SessaoMcp | null = null;
  const usuario = (data?.usuario ?? null) as { nome: string; papel: string; ativo: boolean } | null;
  const papel = lerPapel(usuario?.papel);
  const expirado = !!data?.expira_em && new Date(data.expira_em).getTime() < agora;
  if (data && !data.revogado_em && !expirado && usuario?.ativo && papel) {
    sessao = {
      tokenId: data.id,
      usuarioId: data.usuario_id,
      nome: usuario.nome,
      papel,
      escopos: lerEscopos(data.escopos),
      expiraEm: data.expira_em,
    };
    const ultimo = data.ultimo_uso_em ? new Date(data.ultimo_uso_em).getTime() : 0;
    if (agora - ultimo > TTL_CACHE_MS) {
      void admin
        .from("tokens_integracao")
        .update({ ultimo_uso_em: new Date(agora).toISOString() })
        .eq("id", data.id)
        .then(
          () => undefined,
          () => undefined,
        );
    }
  }
  // Token inválido também fica em cache (curto) para não virar vetor de força bruta no banco.
  cache.set(bearer, { sessao, ate: agora + (sessao ? TTL_CACHE_MS : 5_000) });
  if (cache.size > 500) {
    for (const [chave, valor] of cache) if (valor.ate <= agora) cache.delete(chave);
  }
  return sessao;
}

export function esquecerToken(bearer: string) {
  cache.delete(bearer);
}
