import { existsSync } from "node:fs";
import { resolve } from "node:path";

export default function setup() {
  const raiz = resolve(process.cwd(), "..", ".env");
  if (existsSync(raiz)) process.loadEnvFile(raiz);
  const ref = process.env.SUPABASE_TESTE_PROJECT_REF;
  if (!ref)
    throw new Error(
      "SUPABASE_TESTE_PROJECT_REF ausente: rode node ferramentas/projeto-teste.mjs criar",
    );
  if (ref === process.env.SUPABASE_PROJECT_REF)
    throw new Error("Projeto de teste igual ao de dev. Abortando.");
  for (const n of [
    "SUPABASE_TESTE_URL",
    "SUPABASE_TESTE_ANON_KEY",
    "SUPABASE_TESTE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[n]) throw new Error(`${n} ausente`);
  }
}
