// Transcreve uma locução com whisper.cpp e grava as palavras com tempo (ms).
// Uso: node scripts/transcrever.mjs <audio-16khz.wav> <saida.json>
// O whisper.cpp e o modelo ficam em ./whisper.cpp (fora do versionamento).
import path from "node:path";
import fs from "node:fs";
import { downloadWhisperModel, installWhisperCpp, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const [entrada, saida] = process.argv.slice(2);
const to = path.join(process.cwd(), "whisper.cpp");
const VERSAO = "1.5.5";
const MODELO = "small"; // multilíngue: a locução é em português

await installWhisperCpp({ to, version: VERSAO });
await downloadWhisperModel({ model: MODELO, folder: to });

const saidaWhisper = await transcribe({
  model: MODELO,
  whisperPath: to,
  whisperCppVersion: VERSAO,
  inputPath: path.resolve(entrada),
  tokenLevelTimestamps: true,
  language: "pt",
});
const { captions } = toCaptions({ whisperCppOutput: saidaWhisper });
fs.writeFileSync(saida, JSON.stringify(captions, null, 2));
console.log(captions.map((c) => `${(c.startMs / 1000).toFixed(2)} ${c.text}`).join("\n"));
