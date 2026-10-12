import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Carrega ../.env (tokens de conta e chaves do dev) e ./.env.local (runtime), nessa ordem. */
export function carregarEnv(raiz = process.cwd()) {
  for (const caminho of [resolve(raiz, "..", ".env"), resolve(raiz, ".env.local")]) {
    if (existsSync(caminho)) process.loadEnvFile(caminho);
  }
}

export function exigirEnv(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variavel ${nome} nao definida`);
  return valor;
}
