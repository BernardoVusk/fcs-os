/**
 * Apresentação do FCS ERP: motion com prints reais, locução e trilha, ~2min30,
 * landscape.
 *
 * Orquestrador (A14): uma cena por arquivo com TIMING local; aqui só a tabela
 * de cenas, o fundo contínuo (malha da mesa), o cabeçalho com a barra de 12
 * segmentos, as emendas e o áudio. Emenda = whip vertical com blur (medido nas
 * referências da Focus: 4 a 6 quadros de passagem): a cena que sai sobe, a nova
 * sobe de baixo, e a malha acompanha o mesmo deslocamento.
 *
 * Áudio: um clipe de locução por cena, começando 4f antes de a emenda terminar
 * (J-cut); trilha composta em código com ducking de −9 dB sob a fala; whoosh em
 * cada emenda. Mix final em −14 LUFS no master (aprendizado A15).
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";

import { Grade } from "../../componentes/Mesa";
import { Logo } from "../../componentes/Logo";
import { CHEGA, cores, EMENDA, fontes, INICIO_FALA, pesos, prog, SAI, seg, Som } from "./kit";
import { NARRACAO } from "./tempos";

import * as C01 from "./Cena01Abertura";
import * as C02 from "./Cena02Antes";
import * as C03 from "./Cena03Inicio";
import * as C04 from "./Cena04Catalogo";
import * as C05 from "./Cena05Estoque";
import * as C06 from "./Cena06Precificacao";
import * as C07 from "./Cena07Producao";
import * as C08 from "./Cena08Pedidos";
import * as C09 from "./Cena09Financeiro";
import * as C10 from "./Cena10Conhecimento";
import * as C11 from "./Cena11Planejamento";
import * as C12 from "./Cena12Fecho";

/** Curso do whip, em fração da altura. */
const CURSO = 0.6;
const H = 1080;

const CENAS: { id: keyof typeof NARRACAO; Componente: React.FC; dur: number; rotulo: string }[] = [
  { id: "cena01", Componente: C01.Cena01Abertura, dur: C01.DURACAO, rotulo: "FCS ERP" },
  { id: "cena02", Componente: C02.Cena02Antes, dur: C02.DURACAO, rotulo: "Antes" },
  { id: "cena03", Componente: C03.Cena03Inicio, dur: C03.DURACAO, rotulo: "Início" },
  { id: "cena04", Componente: C04.Cena04Catalogo, dur: C04.DURACAO, rotulo: "Catálogo" },
  { id: "cena05", Componente: C05.Cena05Estoque, dur: C05.DURACAO, rotulo: "Estoque" },
  { id: "cena06", Componente: C06.Cena06Precificacao, dur: C06.DURACAO, rotulo: "Precificação" },
  { id: "cena07", Componente: C07.Cena07Producao, dur: C07.DURACAO, rotulo: "Produção" },
  { id: "cena08", Componente: C08.Cena08Pedidos, dur: C08.DURACAO, rotulo: "Pedidos" },
  { id: "cena09", Componente: C09.Cena09Financeiro, dur: C09.DURACAO, rotulo: "Financeiro" },
  { id: "cena10", Componente: C10.Cena10Conhecimento, dur: C10.DURACAO, rotulo: "Conhecimento" },
  { id: "cena11", Componente: C11.Cena11Planejamento, dur: C11.DURACAO, rotulo: "Planejamento" },
  { id: "cena12", Componente: C12.Cena12Fecho, dur: C12.DURACAO, rotulo: "Busca" },
];

export const INICIOS = CENAS.reduce<number[]>((acc, c, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + CENAS[i - 1].dur - EMENDA);
  return acc;
}, []);
const ultima = CENAS.length - 1;
export const DURACAO_APRESENTACAO_ERP = INICIOS[ultima] + CENAS[ultima].dur;

/* ---------------------------------------------------------------- áudio */

/**
 * Volume da trilha por frame: 0,30 em pausa, 0,11 sob a fala (ducking de ~9 dB),
 * ataque de 3f e soltura de 12f (audio.md). Calculado uma vez, no módulo.
 */
const VOLUME_TRILHA: number[] = (() => {
  const ativo = new Uint8Array(DURACAO_APRESENTACAO_ERP + 1);
  CENAS.forEach((c, i) => {
    for (const p of NARRACAO[c.id].palavras) {
      const de = INICIOS[i] + INICIO_FALA + seg(p.inicio) - 3;
      const ate = INICIOS[i] + INICIO_FALA + seg(p.fim) + 9;
      for (let k = Math.max(0, de); k <= Math.min(ativo.length - 1, ate); k++) ativo[k] = 1;
    }
  });
  const v: number[] = [];
  let atual = 0.3;
  for (let k = 0; k < ativo.length; k++) {
    const alvo = ativo[k] ? 0.11 : 0.3;
    atual += (alvo - atual) * (alvo < atual ? 1 / 3 : 1 / 12);
    v.push(atual);
  }
  return v;
})();

/* ---------------------------------------------------------------- emenda */

/** Envolve a cena com a entrada e a saída do whip. */
const Emenda: React.FC<{ dur: number; primeira: boolean; ultima: boolean; children: React.ReactNode }> = ({ dur, primeira, ultima: fim, children }) => {
  const f = useCurrentFrame();
  const e = primeira ? 1 : prog(f, [0, EMENDA + 2]);
  const s = fim ? 0 : prog(f, [dur - EMENDA, dur], SAI);
  const y = (1 - e) * H * CURSO - s * H * CURSO;
  const blur = (1 - e) * 26 + s * 26;
  return (
    <AbsoluteFill style={{ transform: `translateY(${y}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: 1 - s * s }}>
      {children}
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------------- cabeçalho */

/** Cabeçalho fixo: logo à esquerda, rótulo do capítulo e barra de 12 segmentos à direita. */
const Cabecalho: React.FC<{ f: number }> = ({ f }) => {
  const entra = prog(f, [20, 44]);
  const fimPeca = INICIOS[ultima] + C12.INICIO_FECHO;
  const sai = prog(f, [fimPeca - 10, fimPeca + 14], SAI);
  const atual = INICIOS.filter((i) => f >= i + EMENDA / 2).length - 1;
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        top: 40,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: entra * (1 - sai),
        transform: `translateY(${(1 - entra) * -30 - sai * 30}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Logo altura={34} />
        <div style={{ width: 2, height: 30, background: cores.borda }} />
        <span style={{ fontFamily: fontes.etiqueta, fontWeight: pesos.etiqueta, fontSize: 20, letterSpacing: "0.22em", color: cores.cinzaTexto }}>ERP</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <span
          style={{
            fontFamily: fontes.etiqueta,
            fontWeight: pesos.etiqueta,
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: cores.branco,
            opacity: atual >= 0 ? prog(f, [INICIOS[Math.max(0, atual)] + 6, INICIOS[Math.max(0, atual)] + 20]) : 0,
          }}
        >
          {atual >= 0 ? `${String(atual + 1).padStart(2, "0")} ${CENAS[atual].rotulo}` : ""}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {CENAS.map((c, i) => {
            const de = INICIOS[i];
            const ate = de + c.dur;
            const p = interpolate(f, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const ativa = f >= de && f < ate;
            const acende = prog(f, [de, de + 14], CHEGA);
            return (
              <div key={c.id} style={{ width: 34, height: 6, background: cores.borda, clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)", overflow: "hidden", transform: `translateY(${-Math.sin(Math.PI * Math.min(1, acende)) * 4}px)` }}>
                <div style={{ width: `${(ativa ? p : f >= ate ? 1 : 0) * 100}%`, height: "100%", background: cores.ciano }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ApresentacaoERP: React.FC = () => {
  const f = useCurrentFrame();
  // A malha deriva o tempo todo (~3 px/quadro, A22) e acompanha cada whip.
  let whip = 0;
  INICIOS.forEach((ini, i) => {
    if (i > 0) whip += prog(f, [ini - 2, ini + EMENDA + 2], CHEGA) * H * CURSO;
  });
  const total = interpolate(f, [0, DURACAO_APRESENTACAO_ERP - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: cores.preto }}>
      <Grade largura={1920} altura={1080} passo={48} progresso={prog(f, [0, 36])} deriva={{ x: f * 1.6, y: f * 2.4 - whip }} espessura={1.5} />

      {CENAS.map((c, i) => (
        <Sequence key={c.id} from={INICIOS[i]} durationInFrames={c.dur} premountFor={30} name={c.id}>
          <Emenda dur={c.dur} primeira={i === 0} ultima={i === ultima}>
            <c.Componente />
          </Emenda>
          <Som src={staticFile(`audio/erp/${c.id}.mp3`)} em={INICIO_FALA} nome={`fala ${c.id}`} />
          {i > 0 ? <Audio src={staticFile("audio/erp/sfx-whoosh.mp3")} volume={0.45} name="whoosh" /> : null}
        </Sequence>
      ))}

      <Audio src={staticFile("audio/erp/trilha.mp3")} volume={(frame) => VOLUME_TRILHA[Math.min(VOLUME_TRILHA.length - 1, Math.max(0, frame))]} name="trilha" />

      <Cabecalho f={f} />

      <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${total * 100}%`, background: cores.ciano }} />
    </AbsoluteFill>
  );
};
