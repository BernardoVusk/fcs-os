/**
 * Kit da peça "Apresentação do FCS ERP".
 *
 * Linguagem: a mesma do tutorial de primeiro acesso da Focus (texto palavra a
 * palavra com blur, telas em card 3D inclinado, cursor que clica, câmera com
 * zoom de destaque, emenda por whip vertical), traduzida para a marca FCS:
 * fundo preto com a malha da mesa, marca-texto ciano com o texto virando
 * preto por cima, cantos chanfrados a 45°, brilho ciano como impacto, Mira
 * nas informações nomeadas pela locução.
 *
 * As telas são prints reais do ERP (`public/erp/*.png`, 1440x900 a 2x),
 * exibidos pelo componente `Tela`, que recorta, rola e serve de alvo da câmera.
 */
import React from "react";
import { Audio, Easing, Img, interpolate, interpolateColors, Sequence, staticFile } from "remotion";

import { brilho, cantos, cores } from "../../marca/cores";
import { fontes, pesos } from "../../marca/tipografia";
import { chanfro } from "../../componentes/Corte";
import { NARRACAO, type PalavraFalada } from "./tempos";

/* ------------------------------------------------------------------ curvas */

export type Faixa = readonly [number, number];

/** Curvas por papel (`vocabulario.md`). */
export const CHEGA = Easing.bezier(0.16, 1, 0.3, 1); // expo-out
export const ATRAVESSA = Easing.bezier(0.62, 0.04, 0.34, 1); // cubic-in-out
export const SAI = Easing.bezier(0.7, 0, 0.84, 0); // expo-in

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 dentro da faixa, com a curva do papel. */
export const prog = (f: number, [a, b]: Faixa, easing = CHEGA) =>
  interpolate(f, [a, b], [0, 1], { ...CLAMP, easing });

/** Sobe e volta (0→1→0) dentro da faixa. Para reação, pulso, aceno. */
export const pulso = (f: number, [a, b]: Faixa) => {
  const t = interpolate(f, [a, b], [0, 1], CLAMP);
  return Math.sin(Math.PI * t);
};

/** Entra na faixa `entra` e sai na faixa `sai`: 0→1→0. */
export const vida = (f: number, entra: Faixa, sai?: Faixa) =>
  prog(f, entra) * (sai ? 1 - prog(f, sai, SAI) : 1);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Valor de `de` a `ate` ao longo da faixa, com a curva do papel (padrão: atravessa). */
export const interpolar = (f: number, faixa: Faixa, de: number, ate: number, easing = ATRAVESSA) =>
  lerp(de, ate, prog(f, faixa, easing));

export const FPS = 30;
/** Segundos da narração em frames da cena. */
export const seg = (s: number) => Math.round(s * FPS);
/** Sobreposição entre cenas na emenda (whip). */
export const EMENDA = 12;
/** Frame da cena em que a locução começa: 4f antes de a emenda terminar (J-cut, `audio.md`). */
export const INICIO_FALA = EMENDA - 4;
/** Respiro depois da última palavra, antes do whip de saída. */
export const RESPIRO = 16;
/** Duração padrão de uma cena: fala + respiro + emenda de saída. */
export const duracaoCena = (id: keyof typeof NARRACAO, extra = 0) =>
  INICIO_FALA + seg(NARRACAO[id].duracao) + RESPIRO + EMENDA + extra;

/* --------------------------------------------------------------- narração */

/**
 * Palavras de uma cena, em frames. `a(i)` devolve o frame em que a palavra `i`
 * começa (2 frames antes da sílaba, `audio.md`), e `ate(texto)` acha a
 * primeira palavra que começa com o texto, a partir de uma posição.
 */
export const fala = (id: keyof typeof NARRACAO) => {
  const c = NARRACAO[id];
  const palavras: PalavraFalada[] = c.palavras;
  const limpa = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const acha = (texto: string, aPartir = 0) => {
    const alvo = limpa(texto);
    // Palavra exata primeiro ("fila" não pode casar com "filamento"); prefixo só se não houver.
    const exata = palavras.findIndex((p, k) => k >= aPartir && limpa(p.palavra) === alvo);
    const i = exata >= 0 ? exata : palavras.findIndex((p, k) => k >= aPartir && limpa(p.palavra).startsWith(alvo));
    if (i < 0) throw new Error(`palavra "${texto}" não está na cena ${id}`);
    return i;
  };
  return {
    /** Frame da cena em que a fala termina. */
    fimFala: INICIO_FALA + seg(c.duracao),
    palavras,
    /** Frame de início da palavra `texto` (2f antes da fala). */
    em: (texto: string, aPartir = 0) => INICIO_FALA + seg(palavras[acha(texto, aPartir)].inicio) - 2,
    /** Frame de fim da palavra `texto`. */
    fim: (texto: string, aPartir = 0) => INICIO_FALA + seg(palavras[acha(texto, aPartir)].fim),
    /** Frames de entrada de uma sequência de palavras da tela, cada uma ancorada na palavra falada. */
    instantes: (ancoras: string[]) => {
      let de = 0;
      return ancoras.map((a) => {
        const i = acha(a, de);
        de = i;
        return INICIO_FALA + seg(palavras[i].inicio) - 2;
      });
    },
    indice: acha,
  };
};

/* ---------------------------------------------------------------- áudio */

/**
 * Som posicionado no tempo da cena: `<Audio>` dentro de um `<Sequence>` (o
 * `from` direto no `<Audio>` só existe em versões mais novas do Remotion).
 */
export const Som: React.FC<{ src: string; em: number; volume?: number | ((f: number) => number); nome?: string }> = ({ src, em, volume = 1, nome }) => (
  <Sequence from={Math.max(0, Math.round(em))} layout="none" name={nome}>
    <Audio src={src} volume={volume} name={nome} />
  </Sequence>
);

/* --------------------------------------------------------------- layout */

/** Coluna de texto fixa, à esquerda, fora da câmera. */
export const COLUNA = { x: 110, y: 170, largura: 600 } as const;
/** Card da tela do ERP: centro e tamanho (1120 de largura = print a 0,778). */
export const TELA = { x: 1270, y: 575, largura: 1120, altura: 754 } as const;

/* --------------------------------------------------------------- câmera */

export type Tomada = { faixa: Faixa; x: number; y: number; s: number; puxa?: number };

/**
 * Câmera da cena (zoom de destaque, receita 1). Cada tomada leva a câmera, na
 * sua faixa, a ampliar `s` vezes em volta do ponto (x, y) do quadro 1920×1080,
 * puxando o ponto `puxa` (0–1) do caminho até o centro (padrão 0: o zoom
 * cresce em volta do próprio elemento e não invade a coluna de texto fixo,
 * E21). Entre tomadas a câmera desliza direto (pan com escala mantida).
 */
export const camera = (f: number, tomadas: Tomada[], W = 1920, H = 1080) => {
  let x = W / 2;
  let y = H / 2;
  let s = 1;
  let k = 0;
  for (const t of tomadas) {
    const p = prog(f, t.faixa, ATRAVESSA);
    if (p <= 0) break;
    x = lerp(x, t.x, p);
    y = lerp(y, t.y, p);
    s = lerp(s, t.s, p);
    k = lerp(k, t.puxa ?? 0, p);
  }
  const px = x + (W / 2 - x) * k;
  const py = y + (H / 2 - y) * k;
  const tx = (px - W / 2) / s - x + W / 2;
  const ty = (py - H / 2) / s - y + H / 2;
  return `scale(${s}) translate(${tx}px, ${ty}px)`;
};

/* ---------------------------------------------------------------- texto */

type Palavra = { texto: string; destaque: boolean };

const quebra = (texto: string): Palavra[] => {
  const out: Palavra[] = [];
  texto.split("*").forEach((trecho, i) => {
    trecho
      .split(" ")
      .filter(Boolean)
      .forEach((p) => out.push({ texto: p, destaque: i % 2 === 1 }));
  });
  return out;
};

/**
 * Frase cinética. `*trecho*` marca o destaque: marca-texto ciano que corre da
 * esquerda para a direita logo depois de a palavra assentar, e o texto por
 * cima vira preto (o par botão da marca). Cada palavra entra com blur e sobe
 * 0,35em; a cor vai do cinza ao branco. Sai em cascata rápida para cima.
 *
 * `instantes`: frame de entrada de cada palavra (da narração). Sem isso, as
 * palavras entram a `passo` frames a partir de `inicio`.
 */
export const Frase: React.FC<{
  f: number;
  texto: string;
  inicio?: number;
  instantes?: number[];
  saida?: number;
  tamanho: number;
  peso?: number;
  cor?: string;
  passo?: number;
  alinha?: "left" | "center" | "right";
  largura?: number;
  entrelinha?: number;
  caixaAlta?: boolean;
  style?: React.CSSProperties;
}> = ({
  f,
  texto,
  inicio = 0,
  instantes,
  saida,
  tamanho,
  peso = pesos.titulo,
  cor = cores.branco,
  passo = 6,
  alinha = "left",
  largura,
  entrelinha = 1.1,
  caixaAlta,
  style,
}) => {
  const palavras = quebra(texto);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: alinha === "center" ? "center" : alinha === "right" ? "flex-end" : "flex-start",
        width: largura,
        fontFamily: fontes.titulo,
        fontWeight: peso,
        fontSize: tamanho,
        lineHeight: entrelinha,
        letterSpacing: "-0.01em",
        textTransform: caixaAlta ? "uppercase" : undefined,
        ...style,
      }}
    >
      {palavras.map((p, i) => {
        const s = instantes ? (instantes[i] ?? instantes[instantes.length - 1]) : inicio + i * passo;
        const e = prog(f, [s, s + 12]);
        const x = saida !== undefined ? prog(f, [saida + i * 2, saida + i * 2 + 10], SAI) : 0;
        const marca = p.destaque ? prog(f, [s + 6, s + 18], ATRAVESSA) * (1 - x) : 0;
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              marginRight: "0.28em",
              opacity: e * (1 - x),
              filter: `blur(${(1 - e) * 12 + x * 14}px)`,
              transform: `translateY(${(1 - e) * 0.35 - x * 0.45}em)`,
              color: interpolateColors(Math.max(prog(f, [s, s + 16]), marca * 2), [0, 1, 2], [cores.cinzaTexto, cor, cores.preto]),
            }}
          >
            {p.destaque ? (
              <span
                style={{
                  position: "absolute",
                  left: "-0.1em",
                  right: "-0.1em",
                  top: "0.02em",
                  bottom: "-0.02em",
                  background: cores.ciano,
                  clipPath: chanfro(tamanho * 0.12, ["se", "id"]),
                  transform: `scaleX(${marca})`,
                  transformOrigin: "left center",
                  zIndex: 0,
                }}
              />
            ) : null}
            <span style={{ position: "relative", zIndex: 1 }}>{p.texto}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Etiqueta de seção: barra ciano chanfrada que corre + rótulo em maiúsculas. */
export const Etiqueta: React.FC<{ f: number; texto: string; entra: Faixa; sai?: Faixa; tamanho?: number; cor?: string }> = ({
  f,
  texto,
  entra,
  sai,
  tamanho = 22,
  cor = cores.cinzaTexto,
}) => {
  const p = prog(f, entra);
  const x = sai ? prog(f, sai, SAI) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 1 - x }}>
      <div
        style={{
          width: 44 * p * (1 - x),
          height: 8,
          background: cores.ciano,
          clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
        }}
      />
      <div
        style={{
          fontFamily: fontes.etiqueta,
          fontWeight: pesos.etiqueta,
          fontSize: tamanho,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: cor,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          transform: `translateX(${(1 - p) * -20 + x * -30}px)`,
        }}
      >
        {texto}
      </div>
    </div>
  );
};

/** Digitação: devolve o trecho já digitado em `f`. */
export const digitado = (texto: string, f: number, inicio: number, cps = 22) => {
  const n = Math.floor(((f - inicio) / 30) * cps);
  return texto.slice(0, Math.max(0, Math.min(texto.length, n)));
};

export const fimDigitacao = (texto: string, inicio: number, cps = 22) =>
  inicio + Math.ceil((texto.length / cps) * 30);

/** Cursor de texto piscando (2 Hz), aceso enquanto digita. */
export const Caret: React.FC<{ f: number; cor?: string; altura?: number; digitando?: boolean }> = ({
  f,
  cor = cores.ciano,
  altura = 28,
  digitando,
}) => (
  <span
    style={{
      display: "inline-block",
      width: 3,
      height: altura,
      marginLeft: 3,
      verticalAlign: "middle",
      background: cor,
      opacity: digitando || Math.floor(f / 12) % 2 === 0 ? 1 : 0,
    }}
  />
);

/* ------------------------------------------------------------------ 3D */

/** Palco com perspectiva: tudo que for card 3D mora dentro dele. */
export const Palco: React.FC<{ children: React.ReactNode; perspectiva?: number }> = ({
  children,
  perspectiva = 2400,
}) => (
  <div style={{ position: "absolute", inset: 0, perspective: perspectiva, transformStyle: "preserve-3d" }}>
    {children}
  </div>
);

/**
 * Card 3D centrado em (x, y). Entra girando de lado e vindo do fundo, com blur;
 * vive flutuando (rotação e deriva vertical em seno, amplitude visível: a
 * borda anda alguns px por quadro, E1); sai subindo e girando para o outro
 * lado. `pose` soma uma pose controlada pela cena. Card que recua para outro
 * passar à frente recua em Z (E22).
 */
export const Cartao3D: React.FC<{
  f: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
  entra: Faixa;
  sai?: Faixa;
  rx?: number;
  ry?: number;
  pose?: { rx?: number; ry?: number; s?: number; tx?: number; ty?: number; tz?: number; rz?: number };
  fase?: number;
  amplitude?: number;
  /** Multiplicador de opacidade controlado pela cena (recuo, escurecimento). */
  opacidade?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ f, x, y, largura, altura, entra, sai, rx = 6, ry = -12, pose = {}, fase = 0, amplitude = 1, opacidade = 1, children, style }) => {
  const e = prog(f, entra);
  const s = sai ? prog(f, sai, SAI) : 0;
  const t = (f + fase) / 30;
  const flutRy = Math.sin(t * 1.6) * 3.2 * amplitude;
  const flutRx = Math.sin(t * 1.25 + 1) * 2.2 * amplitude;
  const flutY = Math.sin(t * 1.9 + 2) * 9 * amplitude;
  const ryT = ry + (1 - e) * 42 - s * 38 + flutRy + (pose.ry ?? 0);
  const rxT = rx + (1 - e) * 10 + s * 14 + flutRx + (pose.rx ?? 0);
  const z = (1 - e) * -520 + s * -300 + (pose.tz ?? 0);
  const ty = (1 - e) * 140 - s * 260 + flutY + (pose.ty ?? 0);
  const tx = (1 - e) * 120 + s * -80 + (pose.tx ?? 0);
  return (
    <div
      style={{
        position: "absolute",
        left: x - largura / 2,
        top: y - altura / 2,
        width: largura,
        height: altura,
        opacity: Math.min(1, e * 1.6) * (1 - s) * opacidade,
        filter: `blur(${(1 - e) * 16 + s * 18}px)`,
        transform: `translate3d(${tx}px, ${ty}px, ${z}px) rotateX(${rxT}deg) rotateY(${ryT}deg) rotateZ(${pose.rz ?? 0}deg) scale(${pose.s ?? 1})`,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------- janelas */

const Controles: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width={120} height={20} style={{ display: "block" }}>
    <line x1={8} x2={26} y1={10} y2={10} stroke={cor} strokeWidth={2.4} />
    <rect x={50} y={2} width={16} height={16} fill="none" stroke={cor} strokeWidth={2.4} />
    <line x1={94} x2={110} y1={2} y2={18} stroke={cor} strokeWidth={2.4} />
    <line x1={110} x2={94} y1={2} y2={18} stroke={cor} strokeWidth={2.4} />
  </svg>
);

/**
 * Janela de programa: barra de título com controles, canto chanfrado (a marca
 * não arredonda), borda fina e brilho ciano opcional (`acende` 0–1) que
 * substitui a sombra.
 */
export const Janela: React.FC<{
  titulo: string;
  largura: number;
  altura: number;
  icone?: React.ReactNode;
  acende?: number;
  children: React.ReactNode;
}> = ({ titulo, largura, altura, icone, acende = 0, children }) => (
  <div style={{ width: largura, height: altura, filter: brilho(acende * 0.9) }}>
    <div
      style={{
        width: largura,
        height: altura,
        background: cores.grafite,
        border: `1.5px solid ${acende > 0.05 ? cores.ciano : cores.borda}`,
        clipPath: chanfro(cantos.chanfroGrande, ["se", "id"]),
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 54,
          flexShrink: 0,
          background: cores.preto,
          borderBottom: `1px solid ${cores.borda}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px 0 30px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {icone}
          <span style={{ fontFamily: fontes.corpo, fontWeight: pesos.destaque, fontSize: 21, color: cores.cinzaTexto }}>{titulo}</span>
        </div>
        <Controles cor={cores.cinzaTexto} />
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  </div>
);

/**
 * Print real do ERP dentro da janela. O arquivo tem 1440 px de largura em CSS
 * (2880 reais); `largura` define a escala. `rola` desloca o print para cima,
 * em px CSS do print (para mostrar o fim de uma página longa).
 */
export const Tela: React.FC<{
  arquivo: string;
  largura: number;
  altura: number;
  rola?: number;
  /** Altura real do print em px CSS (900 para tela cheia, maior para página inteira). */
  alturaPrint?: number;
}> = ({ arquivo, largura, altura, rola = 0, alturaPrint = 900 }) => {
  const k = largura / 1440;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: cores.preto }}>
      <Img
        src={staticFile(`erp/${arquivo}.png`)}
        style={{
          position: "absolute",
          left: 0,
          top: -rola * k,
          width: largura,
          height: alturaPrint * k,
          display: "block",
        }}
      />
      {/* o print já está em tema escuro; a borda inferior some no chanfro */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 0 1px ${cores.borda}` }} />
      <div style={{ display: "none" }}>{altura}</div>
    </div>
  );
};

/**
 * Card 3D com a janela e o print do ERP dentro: o bloco padrão das cenas de
 * tela. `rola` em px CSS do print; `recua` 0–1 manda o card para trás em Z e
 * escurece (quando outro card passa à frente, E22).
 */
export const CardTela: React.FC<{
  f: number;
  arquivo: string;
  titulo: string;
  entra: Faixa;
  sai?: Faixa;
  rola?: number;
  alturaPrint?: number;
  recua?: number;
  acende?: number;
  fase?: number;
  x?: number;
  y?: number;
}> = ({ f, arquivo, titulo, entra, sai, rola = 0, alturaPrint = 900, recua = 0, acende = 0, fase = 0, x = TELA.x, y = TELA.y }) => (
  <Cartao3D
    f={f}
    x={x}
    y={y}
    largura={TELA.largura}
    altura={TELA.altura}
    entra={entra}
    sai={sai}
    rx={5}
    ry={-10}
    amplitude={0.8}
    fase={fase}
    pose={{ tz: -recua * 420, ty: recua * -40 }}
    opacidade={1 - recua * 0.55}
  >
    <Janela titulo={titulo} largura={TELA.largura} altura={TELA.altura} acende={acende}>
      <Tela arquivo={arquivo} largura={TELA.largura} altura={TELA.altura - 54} rola={rola} alturaPrint={alturaPrint} />
    </Janela>
  </Cartao3D>
);

/** Escala e geometria para converter px CSS do print (1440 de largura) em px do quadro. */
export const geometriaTela = (cx: number, cy: number, largura: number, altura: number) => {
  const k = largura / 1440;
  const left = cx - largura / 2;
  const top = cy - altura / 2 + 54; // barra de título
  return {
    k,
    /** Ponto do print (px CSS) -> ponto do quadro. */
    ponto: (px: number, py: number, rola = 0) => ({ x: left + px * k, y: top + (py - rola) * k }),
    /** Caixa do print -> caixa do quadro (para a Mira). */
    caixa: (px: number, py: number, pw: number, ph: number, rola = 0) => ({
      x: left + px * k,
      y: top + (py - rola) * k,
      largura: pw * k,
      altura: ph * k,
    }),
  };
};

/* ---------------------------------------------------------------- cursor */

export type Ponto = readonly [number, number, number]; // [frame, x, y]

/**
 * Seta do mouse. Percorre os pontos (curva atravessa entre eles); em cada
 * clique afunda e solta um anel ciano (o pulso da marca).
 */
export const Cursor: React.FC<{
  f: number;
  caminho: Ponto[];
  cliques?: number[];
  entra?: Faixa;
  sai?: Faixa;
}> = ({ f, caminho, cliques = [], entra, sai }) => {
  let x = caminho[0][1];
  let y = caminho[0][2];
  for (let i = 1; i < caminho.length; i++) {
    const [f1, x1, y1] = caminho[i];
    const f0 = caminho[i - 1][0];
    const p = prog(f, [f0, f1], ATRAVESSA);
    if (p <= 0) break;
    x = lerp(x, x1, p);
    y = lerp(y, y1, p);
  }
  const op = (entra ? prog(f, entra) : 1) * (sai ? 1 - prog(f, sai, SAI) : 1);
  let aperto = 0;
  const aneis: React.ReactNode[] = [];
  cliques.forEach((c, i) => {
    aperto = Math.max(aperto, pulso(f, [c - 2, c + 6]));
    const r = prog(f, [c, c + 18]);
    if (f >= c && r < 1) {
      aneis.push(
        <circle key={i} cx={0} cy={0} r={12 + 46 * r} fill="none" stroke={cores.ciano} strokeWidth={9 * (1 - r)} />,
      );
    }
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: op, pointerEvents: "none", zIndex: 50 }}>
      <svg width={1} height={1} style={{ overflow: "visible", position: "absolute" }}>
        {aneis}
      </svg>
      <svg
        width={46}
        height={58}
        viewBox="0 0 23 29"
        style={{ position: "absolute", left: -4, top: -3, transform: `scale(${1 - aperto * 0.16})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}
      >
        <path d="M2 2 L2 23 L7.5 18 L11 26.5 L14.6 25 L11.2 16.8 L18.5 16.8 Z" fill={cores.branco} stroke={cores.preto} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ----------------------------------------------------------------- teclas */

/** Tecla do teclado em relevo. Afunda e acende em ciano a cada aperto. */
export const Tecla: React.FC<{
  f: number;
  rotulo: React.ReactNode;
  apertos?: number[];
  largura?: number;
  altura?: number;
  tamanho?: number;
}> = ({ f, rotulo, apertos = [], largura = 150, altura = 120, tamanho = 30 }) => {
  const a = Math.max(0, ...apertos.map((c) => pulso(f, [c - 3, c + 9])));
  const prof = 14 * (1 - a * 0.75);
  return (
    <div style={{ position: "relative", width: largura, height: altura + 14 }}>
      <div style={{ position: "absolute", left: 0, top: 14, width: largura, height: altura, background: cores.borda, clipPath: chanfro(cantos.chanfroMedio) }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 14 - prof,
          width: largura,
          height: altura,
          background: interpolateColors(a, [0, 1], [cores.grafite, cores.ciano]),
          border: `2px solid ${interpolateColors(a, [0, 1], [cores.grafiteTrama, cores.ciano])}`,
          boxSizing: "border-box",
          clipPath: chanfro(cantos.chanfroMedio),
          transform: `translateY(${a * 10}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontes.titulo,
          fontWeight: pesos.titulo,
          fontSize: tamanho,
          color: interpolateColors(a, [0, 1], [cores.branco, cores.preto]),
          filter: brilho(a * 0.8),
        }}
      >
        {rotulo}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ ícones */

export const Check: React.FC<{ p: number; tamanho?: number; cor?: string; fundo?: string }> = ({
  p,
  tamanho = 40,
  cor = cores.preto,
  fundo = cores.ciano,
}) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" style={{ display: "block", transform: `scale(${0.6 + 0.4 * Math.min(1, p * 2)})` }}>
    <polygon points="8,2 38,2 38,32 32,38 2,38 2,8" fill={fundo} transform={`translate(20 20) scale(${Math.min(1, p * 2)}) translate(-20 -20)`} />
    <path d="M11 20.5 L17.5 27 L29.5 14" fill="none" stroke={cor} strokeWidth={4.2} strokeLinecap="square" strokeLinejoin="miter" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.max(0, p * 2 - 1)} />
  </svg>
);

/** Ícone do Claude no terminal: estrela de raios, desenhada geometricamente. */
export const IconeClaude: React.FC<{ tamanho?: number; cor?: string; giro?: number }> = ({
  tamanho = 40,
  cor = cores.ciano,
  giro = 0,
}) => {
  const raiosN = 10;
  return (
    <svg width={tamanho} height={tamanho} viewBox="-20 -20 40 40" style={{ transform: `rotate(${giro}deg)` }}>
      {Array.from({ length: raiosN }).map((_, i) => {
        const a = (i / raiosN) * Math.PI * 2;
        const r = i % 2 === 0 ? 17 : 13;
        return <line key={i} x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke={cor} strokeWidth={4.4} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/* ----------------------------------------------------------------- blocos */

/** Card grafite de canto chanfrado, borda fina. */
export const Card: React.FC<{ children: React.ReactNode; acende?: number; chanfroPx?: number; style?: React.CSSProperties }> = ({
  children,
  acende = 0,
  chanfroPx = cantos.chanfroGrande,
  style,
}) => (
  <div style={{ filter: brilho(acende * 0.8), ...style }}>
    <div
      style={{
        background: cores.grafite,
        border: `1.5px solid ${interpolateColors(Math.min(1, acende), [0, 1], [cores.borda, cores.ciano])}`,
        boxSizing: "border-box",
        clipPath: chanfro(chanfroPx, ["se", "id"]),
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  </div>
);

/** Botão da marca: ciano com texto preto, canto chanfrado. `aceso` 0–1 pulsa no clique. */
export const Botao: React.FC<{ texto: string; aceso?: number; tamanho?: number; secundario?: boolean; style?: React.CSSProperties }> = ({
  texto,
  aceso = 0,
  tamanho = 24,
  secundario,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: `${tamanho * 0.6}px ${tamanho * 1.3}px`,
      background: secundario ? "transparent" : cores.ciano,
      border: `2px solid ${cores.ciano}`,
      boxSizing: "border-box",
      color: secundario ? cores.ciano : cores.preto,
      fontFamily: fontes.etiqueta,
      fontWeight: pesos.botao,
      fontSize: tamanho,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      clipPath: chanfro(tamanho * 0.5, ["se", "id"]),
      transform: `scale(${1 - aceso * 0.05})`,
      filter: brilho(aceso),
      ...style,
    }}
  >
    {texto}
  </div>
);

/**
 * Dica: bloco grafite chanfrado com o ponto ciano e o texto. Entra subindo
 * com blur, o ponto pulsa enquanto vive, sai para baixo.
 */
export const Dica: React.FC<{ f: number; texto: string; entra: Faixa; sai?: Faixa; tamanho?: number; style?: React.CSSProperties }> = ({
  f,
  texto,
  entra,
  sai,
  tamanho = 28,
  style,
}) => {
  const e = prog(f, entra);
  const s = sai ? prog(f, sai, SAI) : 0;
  const pul = (Math.sin((f - entra[0]) / 6) + 1) / 2;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 32px 18px 24px",
        background: cores.grafite,
        border: `1.5px solid ${cores.borda}`,
        boxSizing: "border-box",
        clipPath: chanfro(14, ["se", "id"]),
        color: cores.branco,
        fontFamily: fontes.corpo,
        fontWeight: pesos.destaque,
        fontSize: tamanho,
        opacity: Math.min(1, e * 1.5) * (1 - s),
        filter: `blur(${(1 - e) * 10 + s * 10}px)`,
        transform: `translateY(${(1 - e) * 50 + s * 40}px) scale(${0.9 + 0.1 * e})`,
        ...style,
      }}
    >
      <div style={{ width: 18, height: 18, background: cores.ciano, clipPath: chanfro(5), transform: `scale(${0.8 + pul * 0.35})`, flexShrink: 0 }} />
      {texto}
    </div>
  );
};

/** Chip de módulo ou canal: contorno fino, acende em ciano cheio. */
export const Chip: React.FC<{ texto: string; aceso?: number; entra?: number; tamanho?: number; icone?: React.ReactNode }> = ({
  texto,
  aceso = 0,
  entra = 1,
  tamanho = 26,
  icone,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: `${tamanho * 0.5}px ${tamanho * 0.95}px`,
      background: interpolateColors(aceso, [0, 1], [cores.grafite, cores.ciano]),
      border: `1.5px solid ${interpolateColors(aceso, [0, 1], [cores.borda, cores.ciano])}`,
      boxSizing: "border-box",
      color: interpolateColors(aceso, [0, 1], [cores.branco, cores.preto]),
      fontFamily: fontes.etiqueta,
      fontWeight: pesos.etiqueta,
      fontSize: tamanho,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      clipPath: chanfro(tamanho * 0.4, ["se", "id"]),
      opacity: Math.min(1, entra * 1.5),
      filter: `blur(${(1 - entra) * 10}px) ${brilho(aceso * 0.7)}`,
      transform: `translateY(${(1 - entra) * 40}px) scale(${1 + aceso * 0.05})`,
    }}
  >
    {icone}
    {texto}
  </div>
);

/**
 * Chip com o ciclo de vida completo: entra (desliza e tira o blur), acende na
 * palavra (pulso ciano), reage quando o vizinho chega (afunda 5%) e sai em
 * blur. Cada fase é uma faixa do `TIMING` da cena.
 */
export const ChipVivo: React.FC<{
  f: number;
  texto: string;
  entra: number;
  acende: Faixa;
  reage?: Faixa;
  sai: Faixa;
  /** Aceso fixo somado ao pulso (0–1), para o chip da vez. */
  aceso?: number;
  tamanho?: number;
  /** Direção de entrada: da esquerda (coluna) ou de baixo (fileira). */
  de?: "esquerda" | "baixo";
}> = ({ f, texto, entra, acende, reage, sai, aceso = 0, tamanho = 21, de = "esquerda" }) => {
  const e = prog(f, [entra, entra + 12]);
  const s = prog(f, sai, SAI);
  const dip = reage ? pulso(f, reage) : 0;
  const vivo = e * (1 - s);
  return (
    <div
      style={{
        transform:
          de === "esquerda"
            ? `translateX(${(1 - e) * -40 - s * 30}px) scale(${1 - dip * 0.05})`
            : `translateY(${(1 - e) * 40 + s * 30}px) scale(${1 - dip * 0.05})`,
        opacity: vivo,
        filter: `blur(${s * 10}px)`,
      }}
    >
      <Chip texto={texto} aceso={Math.min(1, pulso(f, acende) * 0.9 + aceso)} entra={e} tamanho={tamanho} />
    </div>
  );
};

/** Faixas de ciclo de vida de uma lista de chips, a partir do frame de entrada de cada um. */
export const cicloChips = (entradas: number[], sai: number, folga = 2) =>
  entradas.map((em, i) => ({
    entra: em,
    acende: [em, em + 20] as const,
    reage: i + 1 < entradas.length ? ([entradas[i + 1], entradas[i + 1] + 10] as const) : undefined,
    sai: [sai + i * folga, sai + 12 + i * folga] as const,
  }));

export const estiloCorpo = (tamanho: number, cor: string = cores.cinzaTexto): React.CSSProperties => ({
  fontFamily: fontes.corpo,
  fontWeight: pesos.destaque,
  fontSize: tamanho,
  color: cor,
  lineHeight: 1.3,
});

export { cores, cantos, brilho, fontes, pesos, chanfro };
