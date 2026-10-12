import { readFileSync } from "node:fs";
import { carregarEnv, exigirEnv } from "./env.mjs";
import { consultar } from "./supabase-api.mjs";

/*
 * Consulta de leitura ou manutenção pontual, fora das migrações.
 * uso: node ferramentas/sql.mjs [--alvo dev|teste] "select ..."   ou   --arquivo caminho.sql
 */
carregarEnv();
const args = process.argv.slice(2);
const i = args.indexOf("--alvo");
const alvo = i >= 0 ? args.splice(i, 2)[1] : "dev";
const j = args.indexOf("--arquivo");
const sql = j >= 0 ? readFileSync(args[j + 1], "utf8") : args.join(" ");
if (!sql.trim()) throw new Error("informe o SQL ou --arquivo");
const ref = exigirEnv(alvo === "teste" ? "SUPABASE_TESTE_PROJECT_REF" : "SUPABASE_PROJECT_REF");
const linhas = await consultar(ref, sql);
console.log(JSON.stringify(linhas, null, 1));
