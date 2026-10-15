// Consolida a narração de uma peça num módulo TypeScript: duração de cada clipe (ffprobe) e o
// instante de cada palavra (gerado por `elevenlabs.mjs narrar --tempos`). A composição importa o
// módulo e deriva o TIMING das cenas da fala, não o contrário (aprendizado A17).
//
// Uso: node scripts/tempos-narracao.mjs public/audio/erp src/composicoes/ApresentacaoERP/tempos.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [pasta, saida] = process.argv.slice(2);
if (!pasta || !saida) throw new Error("uso: node scripts/tempos-narracao.mjs <pasta dos mp3> <saida.ts>");

const cenas = {};
for (const arq of readdirSync(pasta).filter((a) => /^cena\d+\.mp3$/.test(a)).sort()) {
  const id = arq.replace(".mp3", "");
  const duracao = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(pasta, arq)], { encoding: "utf8" }).trim());
  const palavras = JSON.parse(readFileSync(join(pasta, `${id}.json`), "utf8"));
  cenas[id] = { duracao, palavras };
}
const corpo = `// GERADO por scripts/tempos-narracao.mjs a partir de ${pasta.replace(/\\/g, "/")}. Não editar à mão.
export type PalavraFalada = { palavra: string; inicio: number; fim: number };
export type CenaFalada = { duracao: number; palavras: PalavraFalada[] };
export const NARRACAO: Record<string, CenaFalada> = ${JSON.stringify(cenas, null, 1)};
`;
writeFileSync(saida, corpo);
console.log(`ok ${saida}: ${Object.keys(cenas).length} cena(s), ${Object.values(cenas).reduce((s, c) => s + c.duracao, 0).toFixed(1)} s de fala`);
