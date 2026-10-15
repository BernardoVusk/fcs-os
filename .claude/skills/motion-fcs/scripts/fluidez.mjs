#!/usr/bin/env node
/**
 * Verificador de fluidez — mede movimento por frame num vídeo renderizado.
 *
 *   node fluidez.mjs <arquivo.mp4> [--fps 30] [--json]
 *
 * Como funciona: `tblend=all_mode=difference` produz a diferença entre cada par
 * de frames consecutivos, e `signalstats` devolve o brilho médio (YAVG) dessa
 * diferença. YAVG alto = muita coisa se moveu; YAVG ~0 = quadro parado.
 *
 * O vídeo é reescalado para 320px de largura antes da comparação: os limiares
 * abaixo foram calibrados nessa escala, e comparar em resolução cheia deixa o
 * número dependente do formato da peça.
 *
 * Limiares calibrados em 2026-08-23 sobre AberturaMarca (Grupo FX Minas):
 *   varredura de lâmina cruzando o quadro ....... 8–15
 *   lâminas de ambiente derivando a ~8px/frame .. 0.5–0.7
 *   texto entrando por fade + régua fina ........ 0.12–0.29
 *   push-in global de 0,017% por frame .......... 0.02–0.05  (= ruído de h264)
 *
 * ATENÇÃO AO TIER DE RENDER. A mesma peça medida em rascunho (JPEG, CRF 23) lê
 * ~18% MAIS ALTO do que em entrega (PNG, CRF 8) — mediana 0.699 contra 0.594,
 * pico 16.4 contra 13.05. Não é mais movimento: é ruído de compressão do JPEG
 * somando à diferença entre frames. A medição da entrega é a honesta.
 *
 * Por isso o limiar de "real" fica em 0.40, longe da faixa onde a camada de
 * ambiente pousa (0.5–0.7) nos dois tiers. Antes estava em 0.60, em cima dessa
 * faixa, e a mesma peça classificava 83% real no rascunho contra 48% na
 * entrega. Medir sempre no tier em que a peça vai ser entregue.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";

/** Abaixo disso o frame é indistinguível de ruído de compressão. */
const MORTO = 0.1;
/** Abaixo disso só um elemento pequeno se mexe. */
const FRACO = 0.4;
/** Piso da regra 2 — trecho longo precisa de pelo menos isso. */
const RESPIRO = 0.3;

/** Regras de aprovação, em frames. Ver referencias/doutrina-fluidez.md. */
const MAX_MORTO = 8; // 0,27s a 30fps
const MAX_SEM_RESPIRO = 30; // 1s a 30fps

const ajuda = `
Uso: node fluidez.mjs <arquivo.mp4> [opções]

  --fps <n>   fps da peça, para converter frames em segundos (padrão: lê do arquivo)
  --json      emite JSON em vez do relatório de texto
  --quieto    só o veredito, sem o gráfico
`;

// ---------------------------------------------------------------- argumentos

const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith("--"));
const temFlag = (f) => args.includes(f);
const valorFlag = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!arquivo) {
  console.error(ajuda);
  process.exit(2);
}
if (!existsSync(arquivo)) {
  console.error(`Arquivo não encontrado: ${arquivo}`);
  process.exit(2);
}

// ------------------------------------------------------------------- ffmpeg

/** Roda um comando e devolve stdout+stderr juntos (o ffmpeg fala em stderr). */
const rodar = (cmd, argv) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { windowsHide: true });
    let saida = "";
    p.stdout.on("data", (d) => (saida += d));
    p.stderr.on("data", (d) => (saida += d));
    p.on("error", (e) =>
      reject(
        e.code === "ENOENT"
          ? new Error(
              `${cmd} não encontrado no PATH. O verificador de fluidez depende do ffmpeg do sistema.`,
            )
          : e,
      ),
    );
    p.on("close", () => resolve(saida));
  });

async function lerFps() {
  const flag = valorFlag("--fps");
  if (flag) return Number(flag);
  const saida = await rodar("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=r_frame_rate",
    "-of", "default=nw=1:nk=1",
    arquivo,
  ]);
  const [num, den] = saida.trim().split("/").map(Number);
  return den ? num / den : num || 30;
}

async function medir() {
  const saida = await rodar("ffmpeg", [
    "-i", arquivo,
    "-vf",
    "scale=320:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
    "-f", "null", "-",
  ]);
  const valores = [...saida.matchAll(/YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
  if (valores.length === 0) {
    throw new Error(
      "Nenhuma medição saiu do ffmpeg. O arquivo tem trilha de vídeo? Saída bruta:\n" +
        saida.slice(-800),
    );
  }
  // tblend não emite nada para o primeiro frame (não há par anterior); o índice
  // 0 da lista corresponde ao frame 1 do vídeo.
  return valores;
}

// ------------------------------------------------------------------ análise

/** Maiores trechos consecutivos em que `teste` vale para todos os frames. */
function trechos(valores, teste) {
  const achados = [];
  let inicio = null;
  valores.forEach((v, i) => {
    if (teste(v)) {
      if (inicio === null) inicio = i;
    } else if (inicio !== null) {
      achados.push({ de: inicio + 1, ate: i, tamanho: i - inicio });
      inicio = null;
    }
  });
  if (inicio !== null) {
    achados.push({
      de: inicio + 1,
      ate: valores.length,
      tamanho: valores.length - inicio,
    });
  }
  return achados.sort((a, b) => b.tamanho - a.tamanho);
}

function analisar(valores, fps) {
  const mortos = trechos(valores, (v) => v < MORTO);
  const semRespiro = trechos(valores, (v) => v < RESPIRO);

  const falhas = [];

  const piorMorto = mortos[0];
  if (piorMorto && piorMorto.tamanho > MAX_MORTO) {
    falhas.push(
      `Regra 1 — trecho morto de ${piorMorto.tamanho} frames ` +
        `(${(piorMorto.tamanho / fps).toFixed(2)}s) nos frames ${piorMorto.de}–${piorMorto.ate}. ` +
        `Limite: ${MAX_MORTO} frames.`,
    );
  }

  const piorSemRespiro = semRespiro[0];
  if (piorSemRespiro && piorSemRespiro.tamanho > MAX_SEM_RESPIRO) {
    falhas.push(
      `Regra 2 — ${piorSemRespiro.tamanho} frames ` +
        `(${(piorSemRespiro.tamanho / fps).toFixed(2)}s) abaixo de ${RESPIRO} ` +
        `nos frames ${piorSemRespiro.de}–${piorSemRespiro.ate}. ` +
        `Limite: ${MAX_SEM_RESPIRO} frames.`,
    );
  }

  const ultimo = valores[valores.length - 1];
  if (ultimo < MORTO) {
    falhas.push(
      `Regra 3 — a peça termina parada (último frame em ${ultimo.toFixed(3)}). ` +
        `Fechar em saída ou acento, não em hold.`,
    );
  }

  const conta = (teste) => valores.filter(teste).length;
  return {
    falhas,
    aprovado: falhas.length === 0,
    mortos,
    cobertura: {
      real: conta((v) => v >= FRACO),
      fraco: conta((v) => v >= MORTO && v < FRACO),
      morto: conta((v) => v < MORTO),
    },
  };
}

// ---------------------------------------------------------------- relatório

const LARGURA = 40;

function grafico(valores) {
  // Escala logarítmica: os picos de varredura (10+) achatariam tudo numa
  // escala linear, e o que importa enxergar é justamente a região baixa.
  const barra = (v) => {
    const n = Math.min(LARGURA, Math.round(Math.log10(1 + v * 9) * LARGURA * 0.55));
    const marca = v < MORTO ? "·" : v < FRACO ? "▪" : "█";
    return marca.repeat(Math.max(1, n));
  };
  return valores
    .map((v, i) => {
      const f = String(i + 1).padStart(4);
      const n = v.toFixed(3).padStart(7);
      return `${f} ${n} ${barra(v)}`;
    })
    .join("\n");
}

const fps = await lerFps();
const valores = await medir();
const r = analisar(valores, fps);
const total = valores.length;
const pct = (n) => `${((n / total) * 100).toFixed(0)}%`;

if (temFlag("--json")) {
  console.log(JSON.stringify({ arquivo, fps, valores, ...r }, null, 2));
  process.exit(r.aprovado ? 0 : 1);
}

console.log(`\nFLUIDEZ — ${basename(arquivo)}`);
console.log(`${total + 1} frames a ${fps}fps (${((total + 1) / fps).toFixed(2)}s)\n`);

if (!temFlag("--quieto")) {
  console.log("frame   YAVG  movimento");
  console.log(grafico(valores));
  console.log("");
}

console.log(
  `Cobertura   real ${String(r.cobertura.real).padStart(4)} (${pct(r.cobertura.real)})  ` +
    `fraco ${String(r.cobertura.fraco).padStart(4)} (${pct(r.cobertura.fraco)})  ` +
    `morto ${String(r.cobertura.morto).padStart(4)} (${pct(r.cobertura.morto)})`,
);

if (r.mortos.length) {
  const lista = r.mortos
    .slice(0, 5)
    .map((t) => `${t.de}–${t.ate} (${t.tamanho}f)`)
    .join(", ");
  console.log(`Trechos mortos  ${lista}`);
}

console.log("");
if (r.aprovado) {
  console.log("APROVADO — a peça se mantém animada do começo ao fim.\n");
  process.exit(0);
}
console.log("REPROVADO");
r.falhas.forEach((f) => console.log(`  · ${f}`));
console.log(
  "\nComo corrigir: sobrepor as batidas (a próxima entra a 50–70% da anterior)\n" +
    "e cobrir o resto com um elemento que se desloca — nunca com rampa global lenta.\n" +
    "Ver referencias/doutrina-fluidez.md.\n",
);
process.exit(1);
