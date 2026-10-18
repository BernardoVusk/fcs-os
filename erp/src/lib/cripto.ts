import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifra de credenciais de terceiros e sessões do WhatsApp (AES-256-GCM).
 * Usada pelo ERP e pelo worker; a chave vem de OFERTAS_CHAVE_CRIPTO (32 bytes em base64)
 * e, durante uma troca de chave, OFERTAS_CHAVE_CRIPTO_ANTERIOR abre o que foi cifrado antes.
 * Formato: v1.<id da chave>.<iv>.<tag>.<dados>, tudo em base64url.
 */
export type ChaveCripto = { id: string; chave: Buffer };

const VERSAO = "v1";

export function lerChave(base64: string): ChaveCripto {
  const chave = Buffer.from(base64.trim(), "base64");
  if (chave.length !== 32) throw new Error("chave_cripto_invalida");
  return { id: createHash("sha256").update(chave).digest("hex").slice(0, 8), chave };
}

/** Chave atual e anterior (se houver) lidas do ambiente. */
export function chavesDoAmbiente(ambiente: Record<string, string | undefined> = process.env): {
  atual: ChaveCripto;
  todas: ChaveCripto[];
} {
  const atual = ambiente.OFERTAS_CHAVE_CRIPTO;
  if (!atual) throw new Error("chave_cripto_ausente");
  const chave = lerChave(atual);
  const anterior = ambiente.OFERTAS_CHAVE_CRIPTO_ANTERIOR;
  return { atual: chave, todas: anterior ? [chave, lerChave(anterior)] : [chave] };
}

/**
 * O contexto (tabela e id da linha) entra como dado autenticado: o texto cifrado só abre no
 * mesmo contexto, então copiar o segredo de uma linha para outra não funciona.
 */
export function cifrar(texto: string, chave: ChaveCripto, contexto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave.chave, iv);
  c.setAAD(Buffer.from(contexto, "utf8"));
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [
    VERSAO,
    chave.id,
    iv.toString("base64url"),
    c.getAuthTag().toString("base64url"),
    dados.toString("base64url"),
  ].join(".");
}

export function decifrar(cifrado: string, chaves: ChaveCripto[], contexto: string): string {
  const partes = cifrado.split(".");
  if (partes.length !== 5 || partes[0] !== VERSAO) throw new Error("cifra_invalida");
  const [, id, iv, tag, dados] = partes;
  const chave = chaves.find((k) => k.id === id);
  if (!chave) throw new Error("chave_desconhecida");
  const d = createDecipheriv("aes-256-gcm", chave.chave, Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(contexto, "utf8"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  try {
    return Buffer.concat([d.update(Buffer.from(dados, "base64url")), d.final()]).toString("utf8");
  } catch {
    throw new Error("cifra_invalida");
  }
}

/** Id da chave que cifrou o valor, para saber o que recifrar depois de trocar a chave. */
export function idDaChave(cifrado: string): string | null {
  const partes = cifrado.split(".");
  return partes.length === 5 && partes[0] === VERSAO ? partes[1] : null;
}
