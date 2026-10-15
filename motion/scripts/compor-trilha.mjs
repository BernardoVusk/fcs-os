// Trilha de fundo composta em código, sem dependência: a música do ElevenLabs exige plano pago
// (A20 da Focus resolveu do mesmo jeito). Sai um WAV estéreo 44,1 kHz, 16 bits.
//
// Uso: node scripts/compor-trilha.mjs <segundos> <saida.wav> [--bpm 105] [--marcos 12.4,24.1,...]
//   --marcos: instantes (s) em que a música dá um acento (início de capítulo): a batida cai ali
//             e o filtro abre por um compasso.
//
// Som: pulso de sintetizador escuro (dente de serra com polyBLEP, dois osciladores desafinados,
// filtro passa-baixa de 2 polos), baixo em oitava, bumbo e chimbal sintetizados, sidechain do
// bumbo sobre o pulso, e um eco curto. Progressão em lá menor, o tom "tech, minimal" da marca.
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: op, positionals: pos } = parseArgs({
  allowPositionals: true,
  options: { bpm: { type: "string", default: "105" }, marcos: { type: "string", default: "" } },
});
const [durArg, saida] = pos;
if (!durArg || !saida) throw new Error("uso: node scripts/compor-trilha.mjs <segundos> <saida.wav> [--bpm 105] [--marcos s,s,...]");
const SR = 44100;
const DUR = Number(durArg);
const BPM = Number(op.bpm);
const BATIDA = 60 / BPM; // s por tempo
const COMPASSO = BATIDA * 4;
const marcos = op.marcos ? op.marcos.split(",").map(Number).filter(Number.isFinite) : [];
const N = Math.ceil(DUR * SR);

/* ------------------------------------------------------------ utilidades */
const nota = (semitom) => 440 * Math.pow(2, (semitom - 69) / 12); // MIDI -> Hz
// Progressão (MIDI): Am, F, C, G, em dois compassos cada, grave.
const ACORDES = [
  [57, 60, 64], // A3 C4 E4
  [53, 57, 60], // F3 A3 C4
  [48, 52, 55], // C3 E3 G3
  [55, 59, 62], // G3 B3 D4
];
const BAIXO = [45, 41, 36, 43];

// Dente de serra com polyBLEP (sem aliasing audível).
function serra(fase, inc) {
  let v = 2 * fase - 1;
  if (fase < inc) {
    const t = fase / inc;
    v -= t + t - t * t - 1;
  } else if (fase > 1 - inc) {
    const t = (fase - 1) / inc;
    v -= t * t + t + t + 1;
  }
  return v;
}

// Filtro passa-baixa de 2 polos (estado por canal).
class Biquad {
  constructor() { this.z1 = 0; this.z2 = 0; this.set(1000, 0.7); }
  set(fc, q) {
    const w = (2 * Math.PI * Math.min(fc, SR * 0.45)) / SR;
    const a = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const a0 = 1 + a;
    this.b0 = (1 - c) / 2 / a0; this.b1 = (1 - c) / a0; this.b2 = this.b0;
    this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/* ------------------------------------------------------------ vozes */
const oscs = []; // pulso: 3 notas x 2 osciladores desafinados
for (let i = 0; i < 6; i++) oscs.push(Math.random());
let faseBaixo = 0;
const filtroL = new Biquad();
const filtroR = new Biquad();
const filtroBaixo = new Biquad();
filtroBaixo.set(180, 0.9);

// Eco curto (pontuado), estéreo cruzado.
const ECO = Math.round(BATIDA * 0.75 * SR);
const ecoL = new Float32Array(ECO);
const ecoR = new Float32Array(ECO);
let iEco = 0;

const L = new Float32Array(N);
const R = new Float32Array(N);

for (let n = 0; n < N; n++) {
  const t = n / SR;
  const tempo = t / BATIDA; // em batidas
  const compasso = Math.floor(t / COMPASSO);
  const acorde = ACORDES[Math.floor(compasso / 2) % ACORDES.length];
  const baixoNota = BAIXO[Math.floor(compasso / 2) % BAIXO.length];
  const posBatida = tempo - Math.floor(tempo); // 0..1 dentro do tempo
  const semicolcheia = Math.floor(tempo * 4) % 16;

  // Entrada gradual nos primeiros 4 s, saída nos últimos 3 s.
  const env = Math.min(1, t / 4) * Math.min(1, Math.max(0, (DUR - t) / 3));

  // Acento de capítulo: 1 no marco, decai ao longo de um compasso.
  let acento = 0;
  for (const m of marcos) {
    const d = t - m;
    if (d >= -0.02 && d < COMPASSO) acento = Math.max(acento, Math.exp(-d / (COMPASSO * 0.6)));
  }

  // Bumbo: a cada tempo; envelope de tom 150 -> 45 Hz.
  const tb = posBatida * BATIDA;
  const bumbo = Math.sin(2 * Math.PI * (45 * tb + (150 - 45) * 0.03 * (1 - Math.exp(-tb / 0.03)))) * Math.exp(-tb / 0.12) * (t > 4 ? 1 : 0);
  // Chimbal fechado nas contratempos (ruído curto).
  const tc = ((tempo + 0.5) % 1) * BATIDA;
  const chimbal = (Math.random() * 2 - 1) * Math.exp(-tc / 0.025) * 0.35 * (t > 8 ? 1 : 0);
  // Sidechain: o pulso cede ao bumbo.
  const side = 1 - 0.55 * Math.exp(-tb / 0.1);

  // Pulso rítmico: padrão de semicolcheias (x.x.xx.x x.x.xx.x) com gate curto.
  const padrao = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];
  const tg = ((tempo * 4) % 1) * (BATIDA / 4);
  const gate = padrao[semicolcheia] ? Math.exp(-tg / 0.09) : 0;
  let pulso = 0;
  for (let k = 0; k < 3; k++) {
    const f = nota(acorde[k]);
    for (let d = 0; d < 2; d++) {
      const freq = f * (d ? 1.004 : 0.996);
      const inc = freq / SR;
      oscs[k * 2 + d] = (oscs[k * 2 + d] + inc) % 1;
      pulso += serra(oscs[k * 2 + d], inc) * 0.11;
    }
  }
  pulso *= gate * side;
  // Filtro respira com a batida e abre no acento.
  const corte = 500 + 900 * Math.pow(gate, 0.5) + 1800 * acento;
  filtroL.set(corte, 1.1);
  filtroR.set(corte * 1.02, 1.1);

  // Baixo: oitava do acorde, sustentado, com leve pulsação por tempo.
  const fb = nota(baixoNota);
  faseBaixo = (faseBaixo + fb / SR) % 1;
  const baixo = filtroBaixo.run(serra(faseBaixo, fb / SR) * 0.5) * (0.65 + 0.35 * Math.exp(-tb / 0.2)) * side * (t > 2 ? 1 : 0);

  const seco = bumbo * 0.9 + chimbal + baixo * 0.9;
  const pl = filtroL.run(pulso) * (1 + 0.5 * acento);
  const pr = filtroR.run(pulso) * (1 + 0.5 * acento);

  // eco cruzado do pulso
  const eL = ecoL[iEco];
  const eR = ecoR[iEco];
  ecoL[iEco] = pl * 0.35 + eR * 0.3;
  ecoR[iEco] = pr * 0.35 + eL * 0.3;
  iEco = (iEco + 1) % ECO;

  L[n] = (seco + pl + eL) * env;
  R[n] = (seco + pr + eR) * env;
}

/* ------------------------------------------------------------ normaliza e grava */
let pico = 0;
for (let n = 0; n < N; n++) pico = Math.max(pico, Math.abs(L[n]), Math.abs(R[n]));
const ganho = 0.89 / (pico || 1); // -1 dBFS de pico
const bytes = Buffer.alloc(44 + N * 4);
bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + N * 4, 4); bytes.write("WAVE", 8);
bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(SR, 24); bytes.writeUInt32LE(SR * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
bytes.write("data", 36); bytes.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n] * ganho)) * 32767), 44 + n * 4);
  bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n] * ganho)) * 32767), 46 + n * 4);
}
writeFileSync(saida, bytes);
console.log(`ok ${saida}: ${DUR}s a ${BPM} BPM, ${marcos.length} marco(s), pico -1 dBFS`);
