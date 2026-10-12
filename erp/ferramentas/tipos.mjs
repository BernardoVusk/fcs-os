import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const ref = exigirEnv("SUPABASE_PROJECT_REF");
if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error("SUPABASE_PROJECT_REF invalido");
const saida = execSync(
  `npx --yes supabase@latest gen types typescript --project-id ${ref} --schema public`,
  { env: process.env, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
);
mkdirSync("src/tipos", { recursive: true });
writeFileSync("src/tipos/banco.ts", `// Gerado por npm run tipos. Nao editar a mao.\n${saida}`);
console.log("src/tipos/banco.ts atualizado");
