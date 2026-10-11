#!/usr/bin/env node
/**
 * Gera uma foto via API da OpenAI e salva em disco.
 * Usado pela skill /carrossel (tipo 2 — carrossel com foto).
 *
 * Uso:
 *   node --env-file=.env scripts/gerar-imagem.js "PROMPT EM INGLES" "caminho/saida.png" [tamanho]
 *
 * Tamanhos: 1024x1536 (retrato, padrão pro 4:5), 1024x1024, 1536x1024
 * Precisa no .env: OPENAI_API_KEY
 */

const { writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");

const MODELO = "gpt-image-1";
const TAMANHO_PADRAO = "1024x1536";

function morrer(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const [prompt, saida, tamanho = TAMANHO_PADRAO] = process.argv.slice(2);

  if (!prompt || !saida) {
    morrer('Uso: node --env-file=.env scripts/gerar-imagem.js "PROMPT" "caminho/saida.png" [tamanho]');
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) morrer("OPENAI_API_KEY não encontrada. Confere o .env na raiz do projeto.");

  console.log(`→ Gerando imagem ${tamanho}...`);

  const resposta = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO, prompt, size: tamanho, n: 1 }),
  }).catch((e) => morrer(`Falha de rede ao chamar a OpenAI: ${e.message}`));

  if (!resposta.ok) {
    morrer(`OpenAI respondeu ${resposta.status}:\n${await resposta.text()}`);
  }

  const { data } = await resposta.json();
  const b64 = data?.[0]?.b64_json;
  if (!b64) morrer("A OpenAI não devolveu imagem. Resposta em formato inesperado.");

  await mkdir(path.dirname(saida), { recursive: true });
  await writeFile(saida, Buffer.from(b64, "base64"));

  console.log(`✓ Imagem salva: ${saida}`);
}

main().catch((e) => morrer(e.message));
