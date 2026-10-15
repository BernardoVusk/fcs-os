# Qualidade de render

> Ler antes de entregar peça, e sempre que aparecer texto borrado, cor deslocada ou
> banding.

## O pipeline degrada em três estágios

```
Componente React → Chrome headless (screenshot por frame) → FFmpeg (encode) → .mp4
```

Cada estágio tem seu próprio botão de qualidade, e **maximizar um sem os outros não
adianta**. Capturar frame em JPEG e depois encodar com CRF baixo é jogar fora nitidez
antes do encode começar — o dano já está no pixel de origem.

| estágio | o que controla | flag |
|---|---|---|
| captura | formato do screenshot de cada frame | `--image-format` (`png` \| `jpeg`) |
| captura | resolução da captura | `--scale` |
| encode | qualidade do codec | `--crf` (menor = melhor) |
| encode | esforço de compressão | `--x264-preset` (mais lento = melhor por byte) |
| encode | reprodução de cor | `--color-space=bt709` |

---

## Os dois tiers

Configurados em `motion/remotion.config.ts` (entrega é o padrão) e em
`package.json` (rascunho sobrepõe pela linha de comando).

| tier | comando | captura | CRF | preset |
|---|---|---|---|---|
| **rascunho** | `npm run rascunho -- <Composição> <saída>` | jpeg 80 | 23 | fast |
| **entrega** | `npm run render -- <Composição> <saída>` | png | 8 | slow |

**Medido em 2026-08-23**, `AberturaMarca` 1920×1080, 150 frames:

| tier | tempo | arquivo |
|---|---|---|
| rascunho | 7,9s | 851 KB |
| entrega | 16,6s | 1160 KB |

2,1× mais lento e 1,4× maior. Barato pelo ganho — usar rascunho só enquanto itera.

**Scale fica em 1 (nativo).** O `--scale=2` sairia em 2160×3840 e quadruplicaria arquivo e
tempo, sem ganho real para Instagram e LinkedIn, que reencodam de qualquer jeito. Vale
considerar só se a peça for para TV de recepção, projeção ou arquivo mestre.

---

## O terceiro tier: master

h264 é entrega final. Quando a peça vai para **edição, pós ou sobreposição** em cima de
outro material, h264 é o codec errado — é destrutivo e não tem canal alfa.

| destino | comando |
|---|---|
| master para edição | `npx remotion render <Comp> out/x.mov --codec=prores --prores-profile=hq` |
| **overlay com alfa** — lower third, selo, callout | `--codec=prores --prores-profile=4444` |

Conferido em `node_modules` na 4.0.515 — codecs válidos: `h264`, `h265`, `vp8`, `vp9`,
`av1`, `mp3`, `aac`, `wav`, `prores`, `h264-mkv`, `h264-ts`, `gif`. Perfis de ProRes:
`4444`, `4444-xq`, `hq`, `light`, `proxy`, `standard`.

Alfa limpo elimina masking e limpeza de chroma na edição: o overlay assenta sobre o
material bruto na primeira tentativa. Se o pedido for "peça para entrar por cima de
filmagem", é `prores` `4444` — nunca h264 com fundo verde.

**Fluidez não se mede em master.** O `fluidez.mjs` foi calibrado no h264 de entrega;
ProRes praticamente não tem ruído de compressão e leria mais baixo. Medir sempre no
arquivo h264.

---

## O tier afeta a medição de fluidez

A mesma peça mede **~18% mais alto em rascunho** do que em entrega — mediana 0,699 contra
0,594, pico 16,4 contra 13,05. O movimento é idêntico; o que muda é que o ruído de bloco
do JPEG soma à diferença entre frames e infla o número.

Consequência prática: **rodar o `fluidez.mjs` no arquivo de entrega**, não no rascunho.
Medir no rascunho dá uma leitura otimista.

Os limiares atuais (morto < 0,10 · fraco < 0,40 · real ≥ 0,40) foram escolhidos para dar
o mesmo veredito nos dois tiers. Um limiar de "real" em 0,60 caía em cima da faixa onde a
camada de ambiente pousa (0,5–0,7) e fazia a mesma peça classificar 83% real no rascunho
contra 48% na entrega.

---

## Diagnóstico

| sintoma | causa | correção |
|---|---|---|
| texto ou vetor borrado | captura em jpeg, ou escala baixa | `--image-format=png`; considerar `--scale=2` |
| banding em gradiente | artefato de compressão JPEG na captura | `--image-format=png` |
| cor deslocada | espaço de cor errado | `--color-space=bt709` |
| arquivo enorme e ainda ruim | encode por hardware | usar encode por software com CRF |
| render estoura memória | concorrência alta com PNG | baixar `--concurrency` |
| render lento demais | tier de entrega em iteração | usar `npm run rascunho` |

**GPU não muda a qualidade da saída**, só a velocidade da captura. Encode por hardware
existe só no macOS, produz arquivo maior pela mesma qualidade e não aceita CRF. Encode por
software com preset lento sempre ganha.
