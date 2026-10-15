#!/usr/bin/env node
/**
 * Verificador de densidade — conta os eventos de animação declarados numa
 * composição e compara com a duração.
 *
 *   node densidade.mjs <composicao.tsx> --frames <n> [--fps 30] [--json]
 *
 * Alvo: 3 a 4 eventos nomeados por segundo. Peça de 5s a 30fps = 15 a 20
 * entradas no objeto TIMING (ou BEATS).
 *
 * LIMITAÇÃO, e ela importa: isto conta eventos **declarados**, não movimento
 * observado. É um piso, não uma prova — dá para inflar o número com entradas
 * que não animam nada. Quem prova cobertura real é o `fluidez.mjs`, medindo o
 * vídeo renderizado. Os dois se complementam: densidade olha a intenção no
 * código, fluidez olha o resultado na tela.
 */

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

/** Eventos por segundo abaixo disso = subespecificado. */
const PISO = 3;

const ajuda = `
Uso: node densidade.mjs <composicao.tsx> --frames <n> [opções]

  --frames <n>  duração da composição em frames (obrigatório)
  --fps <n>     padrão 30
  --json        emite JSON
`;

const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith("--") && a.endsWith(".tsx"));
const valorFlag = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};

const frames = valorFlag("--frames");
const fps = valorFlag("--fps") ?? 30;

if (!arquivo || !frames) {
  console.error(ajuda);
  process.exit(2);
}
if (!existsSync(arquivo)) {
  console.error(`Arquivo não encontrado: ${arquivo}`);
  process.exit(2);
}

const fonte = readFileSync(arquivo, "utf8");

/**
 * Extrai o corpo do objeto TIMING/BEATS por contagem de chaves — regex sozinha
 * erra quando há objetos aninhados (config de spring, por exemplo).
 */
function corpoDoObjeto(texto, nome) {
  const abertura = new RegExp(`(?:const|let)\\s+${nome}\\s*[:=][^{]*\\{`).exec(texto);
  if (!abertura) return null;
  let i = abertura.index + abertura[0].length;
  let nivel = 1;
  const inicio = i;
  while (i < texto.length && nivel > 0) {
    if (texto[i] === "{") nivel++;
    else if (texto[i] === "}") nivel--;
    i++;
  }
  return texto.slice(inicio, i - 1);
}

const corpo = corpoDoObjeto(fonte, "TIMING") ?? corpoDoObjeto(fonte, "BEATS");

if (corpo === null) {
  console.error(
    `\n${basename(arquivo)} não declara TIMING nem BEATS.\n\n` +
      `Toda composição precisa do objeto de tempos no topo, em frames — é o que\n` +
      `o usuário ajusta sem caçar número no meio do JSX, e o que torna o mapa de\n` +
      `fluidez auditável contra o código.\n` +
      `Ver referencias/reconstruir-remotion.md.\n`,
  );
  process.exit(2);
}

/**
 * Conta as chaves do primeiro nível. A unidade é o **evento nomeado**: uma
 * faixa `wordmark: [12, 38]` é um evento com começo e fim, não dois. Contar a
 * faixa como dois inflaria o número sem que nada a mais se mova na tela.
 */
function contarEventos(corpoObj) {
  // Tirar comentarios ANTES de separar por virgula: comentario com virgula
  // dentro ("desenha, parte por parte") partiria a entrada em duas e inventaria
  // um evento que nao existe.
  const limpo = corpoObj
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  const entradas = [];
  let nivel = 0;
  let atual = "";
  for (const ch of limpo) {
    if (ch === "{" || ch === "[" || ch === "(") nivel++;
    else if (ch === "}" || ch === "]" || ch === ")") nivel--;
    if (ch === "," && nivel === 0) {
      entradas.push(atual);
      atual = "";
    } else {
      atual += ch;
    }
  }
  entradas.push(atual);

  return entradas
    .map((e) => e.split(":")[0].trim())
    .filter((nome) => nome && /^[A-Za-z_][A-Za-z0-9_]*$/.test(nome));
}

const entradas = contarEventos(corpo);
const eventos = entradas.length;
const segundos = frames / fps;
const porSegundo = eventos / segundos;
const alvo = Math.ceil(PISO * segundos);

/**
 * Elementos cujo nome aparece uma vez só provavelmente entram e congelam — o
 * padrão que o ciclo de vida de 4 fases existe para eliminar.
 */
const raizes = {};
for (const nome of entradas) {
  // Serve as duas convenções: WORDMARK_ENTRA (corta no underscore) e
  // wordmarkEntra (corta na primeira maiúscula).
  const raiz = nome.includes("_")
    ? nome.slice(0, nome.indexOf("_"))
    : nome.replace(/([a-z0-9])[A-Z].*$/, "$1");
  raizes[raiz.toLowerCase()] = (raizes[raiz.toLowerCase()] ?? 0) + 1;
}
const umaFase = Object.entries(raizes)
  .filter(([, n]) => n === 1)
  .map(([r]) => r);

const aprovado = porSegundo >= PISO;

if (args.includes("--json")) {
  console.log(
    JSON.stringify({ arquivo, eventos, segundos, porSegundo, alvo, aprovado, umaFase }, null, 2),
  );
  process.exit(aprovado ? 0 : 1);
}

console.log(`\nDENSIDADE — ${basename(arquivo)}`);
console.log(`${frames} frames a ${fps}fps (${segundos.toFixed(2)}s)\n`);
console.log(`Eventos declarados   ${eventos}`);
console.log(`Por segundo          ${porSegundo.toFixed(2)}   (piso ${PISO})`);
console.log(`Alvo para a duração  ${alvo}–${Math.ceil(4 * segundos)} eventos\n`);

if (umaFase.length) {
  console.log(`Elementos com uma fase só: ${umaFase.join(", ")}`);
  console.log(`  Provavelmente entram e congelam. Ver ciclo de vida de 4 fases.\n`);
}

if (aprovado) {
  console.log("APROVADO — densidade dentro do alvo.");
  console.log(
    "Lembrete: isto conta eventos declarados. Quem prova movimento na tela é o fluidez.mjs.\n",
  );
  process.exit(0);
}

console.log("REPROVADO");
console.log(
  `  · ${eventos} eventos em ${segundos.toFixed(1)}s = ${porSegundo.toFixed(2)}/s. ` +
    `Faltam ${alvo - eventos} para o piso.\n`,
);
console.log(
  "Como corrigir: dar ciclo de vida completo aos elementos que já existem, em vez\n" +
    "de inventar elemento novo. Todo elemento significativo tem entra → vive → reage\n" +
    "→ sai. Elemento que entra e congela é um evento; devia ser quatro.\n" +
    "Ver referencias/doutrina-fluidez.md.\n",
);
process.exit(1);
