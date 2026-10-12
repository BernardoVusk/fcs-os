import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { carregarEnv, exigirEnv } from "./env.mjs";
import { consultar } from "./supabase-api.mjs";
import { pendentes } from "./migracoes.mjs";

carregarEnv();
const i = process.argv.indexOf("--alvo");
const alvo = i >= 0 ? process.argv[i + 1] : "dev";
if (!["dev", "teste"].includes(alvo)) throw new Error("Use --alvo dev ou --alvo teste");
const ref = exigirEnv(alvo === "dev" ? "SUPABASE_PROJECT_REF" : "SUPABASE_TESTE_PROJECT_REF");
const pasta = resolve(process.cwd(), "..", "supabase", "migrations");

await consultar(
  ref,
  `create table if not exists public.migracoes_aplicadas (nome text primary key, aplicada_em timestamptz not null default now());
   alter table public.migracoes_aplicadas enable row level security;`,
);
const aplicadas = (await consultar(ref, "select nome from public.migracoes_aplicadas order by nome")).map(
  (l) => l.nome,
);
const fila = pendentes(aplicadas, readdirSync(pasta));

if (fila.length === 0) {
  console.log(`[${alvo}] nada pendente (${aplicadas.length} aplicadas)`);
} else {
  for (const nome of fila) {
    const sql = readFileSync(resolve(pasta, nome), "utf8");
    console.log(`[${alvo}] aplicando ${nome}`);
    await consultar(
      ref,
      `begin;\n${sql}\ninsert into public.migracoes_aplicadas (nome) values ('${nome}');\ncommit;`,
    );
  }
  console.log(`[${alvo}] ${fila.length} migracao(oes) aplicada(s)`);
}
