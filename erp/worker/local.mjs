// Roda o worker no próprio computador, sem Fly.io: `npm run local` (ou iniciar-worker.cmd).
// Lê do .env da raiz só as variáveis que o worker usa; service role, token do Supabase e as
// demais chaves do .env ficam de fora do processo (a Baileys é código de terceiros).
// Se o worker cair, sobe de novo com espera crescente. Ctrl+C encerra liberando as travas.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url));
const arquivoEnv = aqui("../../.env");
const pacote = aqui("./dist/index.mjs");

const DO_WORKER = [
  "OFERTAS_WORKER_DB_URL",
  "OFERTAS_CHAVE_CRIPTO",
  "OFERTAS_CHAVE_CRIPTO_ANTERIOR",
  "SUPABASE_URL",
  "OFERTAS_WORKER_ID",
];
// Do sistema, para o Node e o DNS funcionarem no Windows; nada com cara de segredo.
const DO_SISTEMA = [
  "PATH",
  "Path",
  "PATHEXT",
  "SystemRoot",
  "SystemDrive",
  "windir",
  "COMSPEC",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "HOMEDRIVE",
  "HOMEPATH",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "LANG",
  "TZ",
];

function lerEnv(arquivo) {
  if (!existsSync(arquivo)) throw new Error(`não achei ${arquivo}`);
  const valores = {};
  for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    valores[m[1]] = v;
  }
  return valores;
}

const lido = lerEnv(arquivoEnv);
const env = {};
for (const k of DO_SISTEMA) if (process.env[k]) env[k] = process.env[k];
for (const k of DO_WORKER) if (lido[k]) env[k] = lido[k];
env.NODE_ENV = "production";
env.OFERTAS_WORKER_ID ||= `pc-${hostname().toLowerCase()}`;

const faltando = ["OFERTAS_WORKER_DB_URL", "OFERTAS_CHAVE_CRIPTO", "SUPABASE_URL"].filter(
  (k) => !env[k],
);
if (faltando.length) {
  console.error(`Faltam no .env da raiz: ${faltando.join(", ")}.`);
  if (faltando.includes("OFERTAS_WORKER_DB_URL"))
    console.error("Gere com: cd erp && node ferramentas/papel-worker.mjs --alvo dev");
  process.exit(1);
}
if (!existsSync(pacote)) {
  console.error(
    "Pacote do worker não encontrado. Rode antes: npm run build (dentro de erp/worker).",
  );
  process.exit(1);
}

let filho = null;
let parando = false;
let espera = 5_000;

function subir() {
  const inicio = Date.now();
  console.log(`[local] subindo o worker ${env.OFERTAS_WORKER_ID}`);
  filho = spawn(process.execPath, ["--enable-source-maps", pacote], {
    env,
    stdio: "inherit",
    cwd: aqui("."),
  });
  filho.on("exit", (codigo) => {
    filho = null;
    if (parando) process.exit(0);
    if (Date.now() - inicio > 5 * 60_000) espera = 5_000;
    console.log(`[local] worker saiu (código ${codigo}); sobe de novo em ${espera / 1000} s`);
    setTimeout(subir, espera);
    espera = Math.min(espera * 2, 5 * 60_000);
  });
}

function parar() {
  if (parando) return;
  parando = true;
  console.log("[local] encerrando: o worker libera as travas dos números antes de sair");
  if (!filho) process.exit(0);
  // No Windows o Ctrl+C já chega ao filho pelo console; o kill cobre o caso sem console.
  setTimeout(() => filho?.kill("SIGTERM"), 500);
  setTimeout(() => process.exit(0), 35_000);
}

process.on("SIGINT", parar);
process.on("SIGTERM", parar);
subir();
