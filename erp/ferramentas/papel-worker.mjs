/*
 * Liga o login do papel ofe_worker (worker do WhatsApp) com senha nova e grava a URL de conexão
 * pelo pooler no .env da raiz. A senha nunca é exibida nem versionada.
 * uso: node ferramentas/papel-worker.mjs --alvo dev|teste
 *   dev   -> OFERTAS_WORKER_DB_URL (copie para os segredos da Fly: fly secrets set ...)
 *   teste -> SUPABASE_TESTE_WORKER_DB_URL (testes de integração do worker)
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { carregarEnv, exigirEnv } from "./env.mjs";
import { api, consultar } from "./supabase-api.mjs";

carregarEnv();
const i = process.argv.indexOf("--alvo");
const alvo = i >= 0 ? process.argv[i + 1] : "dev";
if (!["dev", "teste"].includes(alvo)) throw new Error("Use --alvo dev ou --alvo teste");
const ref = exigirEnv(alvo === "dev" ? "SUPABASE_PROJECT_REF" : "SUPABASE_TESTE_PROJECT_REF");
const variavel = alvo === "dev" ? "OFERTAS_WORKER_DB_URL" : "SUPABASE_TESTE_WORKER_DB_URL";

const senha = randomBytes(24).toString("base64url");
await consultar(ref, `alter role ofe_worker with login password '${senha}' connection limit 10;`);

const pooler = await api.get(`/projects/${ref}/config/database/pooler`);
const lista = Array.isArray(pooler) ? pooler : [pooler];
const sessao = lista.find((p) => p.pool_mode === "session") ?? lista[0];
if (!sessao?.db_host) throw new Error("pooler sem host");
const url = `postgresql://ofe_worker.${ref}:${senha}@${sessao.db_host}:5432/${sessao.db_name ?? "postgres"}`;

const arquivo = resolve(process.cwd(), "..", ".env");
const atual = existsSync(arquivo) ? readFileSync(arquivo, "utf8") : "";
const linha = `${variavel}=${url}`;
const novo = new RegExp(`^${variavel}=.*$`, "m").test(atual)
  ? atual.replace(new RegExp(`^${variavel}=.*$`, "m"), linha)
  : `${atual.replace(/\s*$/, "")}\n${linha}\n`;
writeFileSync(arquivo, novo);
console.log(
  `[${alvo}] login do ofe_worker ligado; ${variavel} gravada no .env da raiz (host ${sessao.db_host}, modo ${sessao.pool_mode ?? "?"}).`,
);
