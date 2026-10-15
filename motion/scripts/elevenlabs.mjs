// Áudio dos vídeos da FCS 3D STUDIO pelo ElevenLabs: narração do roteiro, efeito sonoro e música de fundo.
// A chave fica só na variável de ambiente do usuário FCS_ELEVENLABS_API_KEY (nunca em arquivo do
// repositório). Variável própria da FCS para nunca pegar por engano a chave da Focus (ELEVENLABS_API_KEY),
// que pode existir nesta máquina. Script trazido do estúdio da Focus em 2026-10-13 (validação de entrada,
// tempo limite, nova tentativa, aviso de plano gratuito).
//
// Uso (de dentro de motion/):
//   node scripts/elevenlabs.mjs conta
//   node scripts/elevenlabs.mjs narrar <roteiro.json> [--saida public/audio] [--voz <id>] [--refazer] [--tempos]
//       roteiro.json = [{ "id": "cena01", "texto": "..." }, ...]  ->  <saida>/cena01.mp3 ...
//       --tempos grava também <saida>/cena01.json com o início e o fim de cada palavra, em segundos
//   node scripts/elevenlabs.mjs sfx "<descrição em inglês>" <segundos 0,5 a 22> <saida.mp3>
//   node scripts/elevenlabs.mjs musica "<descrição em inglês>" <segundos 3 a 300> <saida.mp3>
//
// Todo arquivo gerado ganha uma linha em CREDITOS.md na mesma pasta (recurso, voz/modelo, plano,
// data): é o registro de licença pedido pela doutrina de áudio (referencias/audio.md).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const API = "https://api.elevenlabs.io";
// Voz padrão: ponto de partida herdado da Focus ("Davi Andrei", português do Brasil, masculina, da
// biblioteca de vozes). A FCS ainda não escolheu voz: trocar aqui quando escolher. Voz da biblioteca
// pela API exige plano pago.
const VOZ_PADRAO = { id: "2CECaLAGTS5NRGxgbcxr", nome: "Davi Andrei" };
const MODELO_FALA = "eleven_multilingual_v2";
// Ajuste fixo para a voz soar igual entre regerações (cena refeita não muda de entonação).
const AJUSTE_VOZ = { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true };
const TEMPO_LIMITE_MS = 120000;

function chave() {
  if (process.env.FCS_ELEVENLABS_API_KEY) return process.env.FCS_ELEVENLABS_API_KEY;
  // A sessão do Claude Code aberta antes de a variável existir não a enxerga: lê do registro.
  if (process.platform === "win32") {
    try {
      const saida = execFileSync("reg", ["query", "HKCU\\Environment", "/v", "FCS_ELEVENLABS_API_KEY"], { encoding: "utf8" });
      const m = saida.match(/FCS_ELEVENLABS_API_KEY\s+REG_\w+\s+(\S+)/);
      if (m) return m[1];
    } catch { /* sem a variável */ }
  }
  throw new Error(
    "FCS_ELEVENLABS_API_KEY não definida nesta máquina. Crie a conta ElevenLabs da FCS e rode no PowerShell:\n" +
    "  $k = Read-Host 'Chave ElevenLabs' -AsSecureString; [Environment]::SetEnvironmentVariable('FCS_ELEVENLABS_API_KEY', [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k)), 'User')",
  );
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(caminho, corpo, { binario = true, metodo = "POST" } = {}) {
  // até 3 tentativas, só para limite de uso (429) e falha do servidor (5xx)
  for (let tentativa = 1; ; tentativa++) {
    let r;
    try {
      r = await fetch(API + caminho, {
        method: metodo,
        headers: { "xi-api-key": chave(), "Content-Type": "application/json" },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      });
    } catch (e) {
      if (tentativa < 3) { await espera(2000 * tentativa); continue; }
      throw new Error(`ElevenLabs sem resposta (${e.name === "TimeoutError" ? "tempo esgotado" : e.message})`);
    }
    if (r.ok) return binario ? Buffer.from(await r.arrayBuffer()) : r.json();
    if ((r.status === 429 || r.status >= 500) && tentativa < 3) { await espera(3000 * tentativa); continue; }
    let det = await r.text().catch(() => "");
    try { det = JSON.parse(det).detail?.message ?? det; } catch { /* texto puro */ }
    if (r.status === 402) det += "\n  -> recurso exige plano pago na conta da FCS 3D STUDIO (voz da biblioteca e música).";
    throw new Error(`ElevenLabs ${r.status}: ${det || r.statusText}`);
  }
}

let plano = null;
async function conferirPlano() {
  const s = await chamar("/v1/user/subscription", null, { binario: false, metodo: "GET" });
  plano = s.tier;
  if (plano === "free") console.warn("ATENÇÃO: conta no plano gratuito. Áudio só para teste interno: o plano gratuito não permite uso comercial, não publicar.");
  return s;
}

function gravar(arquivo, dados, credito) {
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, dados);
  const cred = join(dirname(arquivo), "CREDITOS.md");
  if (!existsSync(cred)) writeFileSync(cred, "# Créditos de áudio\n\nGerado pelo ElevenLabs na conta da FCS 3D STUDIO.\n\n");
  const aviso = plano === "free" ? " · PLANO GRATUITO: uso não comercial" : ` · plano ${plano}`;
  appendFileSync(cred, `- ${new Date().toISOString().slice(0, 10)} · ${arquivo.split(/[\\/]/).pop()} · ${credito}${aviso}\n`);
  console.log(`ok  ${arquivo} (${(dados.length / 1024).toFixed(0)} KB)`);
}

function segundos(valor, min, max, oQue) {
  const n = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${oQue}: duração deve ser número entre ${min} e ${max} segundos (recebi "${valor}")`);
  return n;
}

const { values: op, positionals: pos } = parseArgs({
  allowPositionals: true,
  options: { saida: { type: "string" }, voz: { type: "string" }, refazer: { type: "boolean" }, tempos: { type: "boolean" } },
});
const [cmd, ...args] = pos;

try {
  if (cmd === "conta") {
    const s = await conferirPlano();
    console.log(`plano ${s.tier} · caracteres ${s.character_count} de ${s.character_limit} · renova ${new Date(s.next_character_count_reset_unix * 1000).toLocaleDateString("pt-BR")}`);
  } else if (cmd === "narrar") {
    if (!args[0] || !existsSync(args[0])) throw new Error("uso: node scripts/elevenlabs.mjs narrar <roteiro.json> [--saida public/audio] [--voz <id>] [--refazer]");
    // tira o BOM que o PowerShell e o Bloco de Notas gravam no início do arquivo
    const roteiro = JSON.parse(readFileSync(args[0], "utf8").replace(/^﻿/, ""));
    if (!Array.isArray(roteiro) || !roteiro.length) throw new Error("roteiro deve ser uma lista [{ id, texto }]");
    for (const c of roteiro) {
      if (typeof c.id !== "string" || !/^[\w-]+$/.test(c.id)) throw new Error(`id de cena inválido: "${c.id}" (só letras, números, _ e -)`);
      if (typeof c.texto !== "string" || !c.texto.trim()) throw new Error(`cena ${c.id} sem texto`);
    }
    const saida = op.saida ?? "public/audio";
    const voz = op.voz ?? VOZ_PADRAO.id;
    await conferirPlano();
    let chars = 0;
    for (const cena of roteiro) {
      const arq = join(saida, `${cena.id}.mp3`);
      if (existsSync(arq) && !op.refazer) { console.log(`--  ${arq} já existe (use --refazer)`); continue; }
      const corpo = { text: cena.texto, model_id: MODELO_FALA, voice_settings: AJUSTE_VOZ };
      const credito = `fala · voz ${voz === VOZ_PADRAO.id ? VOZ_PADRAO.nome : voz} · ${MODELO_FALA}`;
      if (op.tempos) {
        // Com --tempos o ElevenLabs devolve o instante de cada caractere; agrupado por palavra vira
        // <id>.json [{ palavra, inicio, fim }] em segundos, que a composição usa para sincronizar o
        // texto na tela com a fala (sem precisar do whisper).
        const r = await chamar(`/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, corpo, { binario: false });
        gravar(arq, Buffer.from(r.audio_base64, "base64"), credito);
        const al = r.alignment;
        const palavras = [];
        let atual = null;
        al.characters.forEach((ch, i) => {
          if (/\s/.test(ch)) { if (atual) palavras.push(atual); atual = null; return; }
          if (!atual) atual = { palavra: "", inicio: al.character_start_times_seconds[i], fim: 0 };
          atual.palavra += ch;
          atual.fim = al.character_end_times_seconds[i];
        });
        if (atual) palavras.push(atual);
        writeFileSync(join(saida, `${cena.id}.json`), JSON.stringify(palavras));
      } else {
        gravar(arq, await chamar(`/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, corpo), credito);
      }
      chars += cena.texto.length;
    }
    console.log(`${chars} caractere(s) gastos nesta rodada.`);
  } else if (cmd === "sfx" || cmd === "musica") {
    const [descricao, dur, arq] = args;
    if (!descricao || !dur || !arq) throw new Error(`uso: node scripts/elevenlabs.mjs ${cmd} "<descrição em inglês>" <segundos> <saida.mp3>`);
    await conferirPlano();
    if (cmd === "sfx") {
      const s = segundos(dur, 0.5, 22, "efeito");
      gravar(arq, await chamar("/v1/sound-generation", { text: descricao, duration_seconds: s }), `efeito · /v1/sound-generation · "${descricao}" · ${s}s`);
    } else {
      const s = segundos(dur, 3, 300, "música");
      gravar(arq, await chamar("/v1/music", { prompt: descricao, music_length_ms: Math.round(s * 1000) }), `música · /v1/music · "${descricao}" · ${s}s`);
    }
  } else {
    console.log('comandos: conta | narrar <roteiro.json> | sfx "<descr>" <s> <saida> | musica "<descr>" <s> <saida>');
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e.message);
  // exitCode, não process.exit(): no Node 24 do Windows sair à força com conexão aberta derruba o
  // processo ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)")
  process.exitCode = 1;
}
