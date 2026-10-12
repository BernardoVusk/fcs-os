/*
 * Hook opcional do Claude Code (evento Stop). Lê a última resposta do assistente
 * e, se parecer conhecimento (decisão, causa de falha, procedimento), mostra um
 * aviso ao usuário sugerindo /kb-salvar. Não grava nada, não lê transcript.
 *
 * Ligar em .claude/settings.local.json:
 * { "hooks": { "Stop": [ { "hooks": [ { "type": "command",
 *   "command": "node erp/ferramentas/hooks/sugerir-captura.mjs" } ] } ] } }
 */
import { readFileSync } from "node:fs";

let entrada = "";
try {
  entrada = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}
let dados;
try {
  dados = JSON.parse(entrada);
} catch {
  process.exit(0);
}
if (dados.stop_hook_active) process.exit(0);
const texto = String(dados.last_assistant_message ?? "");
const MARCADORES = /\b(decidimos|decis[aã]o tomada|a causa era|causa raiz|procedimento|passo a passo|resolvido|solu[cç][aã]o foi|configura[cç][aã]o que funcionou)\b/i;
if (texto.length > 200 && MARCADORES.test(texto)) {
  process.stdout.write(
    JSON.stringify({ systemMessage: "Parece conhecimento reaproveitável. Salvar na base com /kb-salvar?" }),
  );
}
process.exit(0);
