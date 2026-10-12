import "server-only";

type Nome = "SUPABASE_URL" | "SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY";

/** Leitura preguiçosa: falha só quando a variável é usada, nunca no build. */
export function env(nome: Nome): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida (erp/.env.local)`);
  return valor;
}
