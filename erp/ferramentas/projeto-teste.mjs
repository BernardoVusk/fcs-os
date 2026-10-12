import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { carregarEnv } from "./env.mjs";
import { api } from "./supabase-api.mjs";

carregarEnv();
const NOME = "fcs-os-teste";
const comando = process.argv[2] ?? "status";
const ENV_RAIZ = resolve(process.cwd(), "..", ".env");

async function encontrar() {
  const projetos = await api.get("/projects");
  return projetos.find((p) => p.name === NOME) ?? null;
}

async function esperarAtivo(ref) {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const p = await api.get(`/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") return p;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("Projeto nao ficou ativo em 10 minutos");
}

async function gravarChaves(ref) {
  const chaves = await api.get(`/projects/${ref}/api-keys?reveal=true`);
  const anon = chaves.find((c) => c.name === "anon")?.api_key;
  const servico = chaves.find((c) => c.name === "service_role")?.api_key;
  if (!anon || !servico) throw new Error("Chaves anon/service_role nao encontradas");
  const linhas = [
    "",
    "# --- Projeto de teste do ERP (gerado por erp/ferramentas/projeto-teste.mjs) ---",
    `SUPABASE_TESTE_PROJECT_REF=${ref}`,
    `SUPABASE_TESTE_URL=https://${ref}.supabase.co`,
    `SUPABASE_TESTE_ANON_KEY=${anon}`,
    `SUPABASE_TESTE_SERVICE_ROLE_KEY=${servico}`,
  ];
  appendFileSync(ENV_RAIZ, linhas.join("\n") + "\n");
  console.log("Chaves gravadas no .env da raiz (SUPABASE_TESTE_*)");
}

if (comando === "status") {
  const p = await encontrar();
  console.log(
    p ? `${p.name} | ${p.region} | ${p.status} | ${p.id}` : "projeto de teste nao existe",
  );
} else if (comando === "criar") {
  if (await encontrar()) throw new Error("ja existe; use status, chaves ou restaurar");
  const orgs = await api.get("/organizations");
  const org = orgs.find((o) => o.name === "LABSFCS") ?? orgs[0];
  const senha = randomBytes(24).toString("base64url");
  const criado = await api.post("/projects", {
    name: NOME,
    organization_id: org.id,
    region: "sa-east-1",
    db_pass: senha,
  });
  appendFileSync(ENV_RAIZ, `\nSUPABASE_TESTE_DB_PASSWORD=${senha}\n`);
  console.log(`criado ${criado.id}, aguardando ficar ativo...`);
  await esperarAtivo(criado.id);
  await gravarChaves(criado.id);
} else if (comando === "restaurar") {
  const p = await encontrar();
  if (!p) throw new Error("projeto de teste nao existe");
  if (p.status === "ACTIVE_HEALTHY") {
    console.log("ja ativo");
  } else {
    await api.post(`/projects/${p.id}/restore`, {});
    await esperarAtivo(p.id);
    console.log("restaurado");
  }
} else if (comando === "chaves") {
  const p = await encontrar();
  if (!p) throw new Error("projeto de teste nao existe");
  await gravarChaves(p.id);
} else {
  throw new Error("comandos: status | criar | restaurar | chaves");
}
