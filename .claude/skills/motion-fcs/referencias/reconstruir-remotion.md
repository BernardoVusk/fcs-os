# Reconstruir em Remotion

> Etapa 5. Adaptado do PROMPT 4 do `claude-motion-prompts_1.md`, com as regras da casa
> pra vídeo em Remotion.

## Antes de escrever

Ter em mãos: a spec (etapa 3) e o mapa de fluidez aprovado (etapa 4). Sem o mapa, não
codar — a peça vai reprovar no portão (c) e o retrabalho é re-render dos três formatos.

Ler `motion/CLAUDE.md` (do projeto Remotion do negócio) para paleta, tipografia e
componentes existentes.

---

## Esqueleto

```tsx
/**
 * <Nome da peça> — <duração>s.
 *
 * <Uma frase sobre o que a peça faz.>
 *
 * Referência: motion/referencias/<arquivo>  (ou "sem referência — grade da casa")
 */
import React from "react";
import {
  AbsoluteFill, Easing, interpolate, spring,
  useCurrentFrame, useVideoConfig,
} from "remotion";

import { cores } from "../marca/cores";
import { empresa } from "../marca/empresa";
import { useLayout } from "../marca/layout";
import { escalaTipo, fontes } from "../marca/tipografia";

/**
 * Todos os tempos em frames, a 30fps. Conversão da spec:
 *   0ms → 0f · 467ms → 14f · 800ms → 24f ...
 *
 * Nome no padrão ELEMENTO_FASE: cada elemento significativo aparece mais de uma
 * vez, porque tem ciclo de vida (entra → vive → reage → sai).
 */
const TIMING = {
  LAMINAS_VARRE:      [0, 30],

  WORDMARK_REVELA:    [12, 38],
  WORDMARK_ASSENTA:   [14, 44],
  WORDMARK_BRILHO:    [42, 68],
  WORDMARK_REAGE:     [70, 84],
  WORDMARK_RECUA:     [112, 138],

  EYEBROW_ENTRA:      [28, 46],
  EYEBROW_RECUA:      [84, 100],

  SAIDA_VARRE:        [106, 150],
  AMBIENTE_ACELERA:   [100, 150],
} as const;
```

O objeto `TIMING` no topo, em frames, é obrigatório: é o que o usuário ajusta sem caçar
número no meio do JSX, o que torna o mapa de fluidez auditável contra o código, e o que o
`densidade.mjs` lê para contar eventos.

**Alvo: 3 a 4 eventos por segundo.** Peça de 5s = 15 a 20 entradas. Se cada nome aparece
uma vez só, os elementos entram e congelam — ver `doutrina-fluidez.md`.

### Pulso, não rampa

Fase de "reage" quase sempre é um pulso (sobe e volta), não uma rampa. Interpolar com três
pontos:

```tsx
const reage = interpolate(
  frame,
  [inicio, (inicio + fim) / 2, fim],
  [0, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);
```

## Helper de rampa

Repetir as opções de `interpolate` em cada linha polui. Definir uma vez:

```tsx
const frame = useCurrentFrame();
const rampa = ([de, ate]: readonly [number, number]) =>
  interpolate(frame, [de, ate], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
```

**Clamp dos dois lados, sempre.** Sem clamp o valor vaza fora do range e o elemento
continua se movendo para fora do quadro depois da batida acabar.

---

## Regras

### Timing
- Toda batida vem do `TIMING`. Nenhum número de frame solto no JSX.
- Sobreposição de 50–70% entre batidas vizinhas — conferir no `TIMING` que o `de` de cada
  uma cai dentro do range da anterior.
- A última batida tem que alcançar o fim da composição. Ver `doutrina-fluidez.md` regra 3.
- Stagger entre irmãos: **3–6 frames**.
- Todo elemento significativo com mais de uma fase. Um nome que aparece uma vez só é
  elemento que entra e congela.

#### Duração escala com a distância — mas não linearmente

O erro comum é usar a mesma duração para andar 20px e para andar 800px. O primeiro parece
lento; o segundo, teletransporte.

```
duração ≈ base × (distância / 100) ^ 0.5
```

| distância | frames a 30fps | token |
|---|---|---|
| 100px | 7–8 | rápido |
| 400px | 12 | padrão |
| 900px | 16–17 | amplo |

Não é fórmula sagrada — é ponto de partida melhor que constante. Bate com os tokens de
`vocabulario.md`, que foram derivados por outro caminho.

#### Stagger diagonal em grid

Em grade, escalonar pela **diagonal** (`atraso = (linha + coluna) × passo`), não pelo
índice do array. O olho lê a onda atravessando a grade em vez de uma varredura de leitura
linha a linha. Diferença grande, custo zero. Aplica-se ao `GradeKpi`.

### Proibições do Remotion

Estas quebram o render, não só o estilo:

- **CSS `transition`, `animation` e classes de animação de framework não renderizam.**
  O Remotion tira um screenshot por frame; não há tempo correndo no browser para uma
  transição CSS avançar. Todo movimento sai de `useCurrentFrame()` com `interpolate()` ou
  `spring()`.
- **`Math.random()` e `Date.now()` sem semente** dão resultado diferente a cada frame
  (cada frame é um render novo). Usar `random()` do Remotion com semente fixa.
- **`<Sequence>` sem `premountFor`** pode piscar no primeiro frame, com fonte ou imagem
  ainda não carregada. Passar `premountFor={fps}` em todas.

### Movimento
- **Curva pelo papel, não pelo padrão do arquivo.** `chega` → expo-out · `atravessa` →
  cubic-in-out · `sai de quadro` → expo-in · `deriva` → linear · `overshoot` → `spring()`.
  A tabela completa e os erros que ela evita estão em `vocabulario.md`. Reutilizar a rampa
  de entrada numa varredura transforma a transição em corte seco (`aprendizado.md` E15).
- `interpolate` para movimento controlado; `spring()` onde a spec indicou overshoot. Não
  simular mola com bezier.
- `spring({ frame: frame - inicio, fps, config: { damping, mass } })` — o offset de frame
  é o que atrasa a mola; `delay` também existe mas dificulta compor com o `TIMING`.
- Camada de ambiente presente desde o primeiro frame até o último, e deslocando **vários
  px por frame**. Rampa global lenta não conta (`aprendizado.md` E1).
- Animação dependente termina junto com o gatilho, ou antes (`aprendizado.md` E4).

#### Antecipação e follow-through

Dois dos doze princípios clássicos, e justamente os dois que mais faltam em motion feito
por código — porque `interpolate(frame, [de, ate], [0, 1])` vai direto do repouso ao
destino, que é o que nada na vida real faz.

**Antecipação:** antes de ir para a direita, o elemento recua 3–8px para a esquerda,
durante 2–3 frames. O olho registra intenção. Em `interpolate`, é um ponto a mais:

```tsx
interpolate(frame, [de, de + 3, ate], [0, -6, destino], { /* clamp nos dois lados */ });
```

**Follow-through:** nada para junto. O elemento principal para no frame 300; a sombra, o
texto interno e o ícone param 2–4 frames depois. Elementos que param todos no mesmo frame
são um dos sinais mais fortes de animação automática.

**As duas são fases nomeadas do ciclo de vida, não enfeite.** Entram no `TIMING` e contam
na densidade — é a forma mais barata de subir de 3 para 3,5 eventos por segundo sem
inventar elemento novo.

### Layout
- **Todos os elementos montados desde o frame 0.** Animar opacidade e transform, nunca
  montar condicionalmente — a caixa pula (`aprendizado.md` E5).
- `letterSpacing` animado muda a largura do texto: compensar com `padding` no lado oposto.
- **Texto que escala precisa de compensação de tracking.** Ao escalar de 0,9 para 1,0 o
  espacejamento aparente aumenta junto. Compensar animando `letterSpacing` na direção
  oposta (ex.: `0.02em → 0em`). Detalhe pequeno, diferença grande — é o que faz a
  revelação de wordmark parecer tipografada em vez de esticada.
- **Revelação de texto por máscara, nunca por fade de opacidade letra a letra.** Container
  com `overflow: hidden`, o texto sobe de `translateY(100%)` para `0`. Custo idêntico,
  resultado incomparável. Fade letra a letra é o clichê mais datado do motion.
- `useLayout()` para os três formatos. Um componente só; duplicar apenas se a composição
  mudar de verdade entre orientações.
- `transform-origin` explícito sempre que houver `scale` ou `rotate`.
- **Conteúdo crítico dentro da `zonaSegura`** em formato vertical: topo 15% e base 20% do
  quadro ficam sob a interface da rede. Fundo e grafismo podem sangrar.
- Texto pelo `tamanhoTipo(papel, escala)`, que aplica o piso de legibilidade e avisa no
  console quando o pedido não passa.

### Multi-cena

#### Transições

Escolha da transição (hierarquia da mais forte pra mais fraca, matriz semântica, corte
seco contra transição, match cut, overlays, emenda diagonal da casa e
`<TransitionSeries>`) **mudou-se para `transicoes.md`**. Regra que fica aqui: dentro de
uma cena, `useCurrentFrame()` recomeça do zero, então o `TIMING` da cena é local.
Escolher uma convenção (local ou global) e declarar no topo do arquivo.

#### Código novo: propriedades de transformação separadas

A skill oficial (`remotion-markup`) prefere `scale`, `translate` e `rotate` como
propriedades CSS separadas, com o `interpolate` inline, em vez de montar uma string
`transform`. Fica editável no Studio. Em escala, usar `output: "perceptual-scale"` no
`interpolate` (existe na 4.0.515, conferido em `remotion/dist/cjs/interpolate.d.ts`):
a escala anima em progressão perceptual, não linear. As peças antigas com `transform`
em string continuam válidas; não é pra reescrever.

#### Morph de forma

`interpolatePath(p, A, B)` de `@remotion/paths` (só no singular na 4.0.515). Detalhe e
cadeia A → B → C em `dados-e-tecnico.md` §5.

### Identidade
- Cores de `src/marca/cores.ts`. Nenhum hex solto no componente.
- Fontes de `src/marca/tipografia.ts` — `fontes.titulo`, `fontes.corpo`, `fontes.mono`,
  cada uma a fonte real da marca do negócio (ex. na FX Minas: Barlow no título, IBM Plex
  Sans no corpo, IBM Plex Mono em uppercase com tracking nas etiquetas).
- Conteúdo real de `src/marca/empresa.ts`. Nunca lorem, nunca número inventado.
- Em fundo escuro, hierarquia por espessura e timing — não por opacidade
  (`aprendizado.md` E2).

### O que **não** se aplica aqui
Renderizando MP4 não há compositor de browser em tempo real nem usuário com preferência de
movimento. Então:
- `clip-path`, `filter`, `width`, `height` são **livres** — a regra "só transform e
  opacity" é de performance web e não vale;
- `prefers-reduced-motion`, `AnimatePresence` e `motion/react` não existem em vídeo.

---

## `<Sequence>` ou `TIMING`?

`<Sequence from={}>` reinicia o `useCurrentFrame()` do filho em zero, o que é ótimo para
blocos independentes — cenas de uma peça institucional, por exemplo.

Para batidas que se **sobrepõem** dentro de uma cena, o `TIMING` com `interpolate` é mais
direto: dá para ler as sobreposições todas num lugar só. Usar `<Sequence>` para cenas,
`TIMING` para batidas dentro da cena.

---

## Registro

Em `src/Root.tsx`, uma `<Composition>` por formato, id `<Peça>-<Formato>`:

```tsx
<Composition
  id="NomeDaPeca-Reels"
  component={NomeDaPeca}
  durationInFrames={DURACAO}
  {...FORMATOS.reels}
/>
```

---

## Ao terminar de escrever

Não renderizar os três formatos ainda. Passar um pelos portões da etapa 6 primeiro:

```bash
npx tsc --noEmit
node ../.claude/skills/motion-fcs/scripts/densidade.mjs src/composicoes/<Peça>.tsx --frames <N>
npx remotion still <Peça>-Landscape out/f<N>.png --frame=<N>     # 4–6 frames, e OLHAR
npx remotion render <Peça>-Landscape out/<peca>.mp4              # tier de entrega
node ../.claude/skills/motion-fcs/scripts/fluidez.mjs out/<peca>.mp4
```

Medir fluidez no arquivo de **entrega**, não no rascunho — o rascunho lê ~18% mais alto
por causa do ruído do JPEG (`qualidade-render.md`).

Só depois de aprovado, renderizar os outros formatos.
