# Receitas

> Padrões reutilizáveis, no formato: propósito · quando usar · quando não · frames (30fps) ·
> curva · anti-padrão · implementação. Frames são ponto de partida: a locução e o
> `TIMING` da cena mandam. Toda receita respeita a doutrina (ciclo de vida completo,
> nada congela, fluidez medida) e as regras da marca.
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

Curvas por papel (`vocabulario.md`): **chega** expo-out `(0.16,1,0.3,1)` · **atravessa**
cubic-in-out `(0.65,0,0.35,1)` ou a variante das emendas da casa `(0.62,0.04,0.34,1)` ·
**sai** expo-in `(0.7,0,0.84,0)` · **deriva** linear · **overshoot** `spring()`.

---

## 1. Zoom de destaque (a de maior impacto no dinamismo)

- **Propósito:** levar o olho pra informação que a locução está nomeando, no instante em
  que ela surge. É o que mais dá dinamismo à peça (A18).
- **Quando:** toda informação nomeada: área de risco, opção de quiz, número, ícone de
  regra, sigla, X de impacto.
- **Quando não:** em elemento que não é o foco; em toda cena de forma idêntica (varia a
  escala e a direção); por cima de texto que ainda está sendo lido.
- **Frames:** entra 12–18f · segura enquanto a fala explica · sai 12–16f **ou** desliza
  direto pro próximo alvo. Chega 2f antes da palavra.
- **Amplitude:** escala 1,12–1,25 (maior pra elemento pequeno).
- **Curva:** atravessa (in-out). Nunca expo-out: gasta o curso no começo e lê como pulo.
- **Sequência A → B → C:** pan entre alvos com a escala mantida; só no fim recua ao quadro
  inteiro.
- **Implementação:** wrapper de câmera por cena (div com `scale` + `translate`), alvo em
  px do quadro. Pra trazer o alvo `(ax, ay)` pro centro `(cx, cy)` com escala `s` e
  `transform-origin` no centro: `translate = (c − a) × (s − 1) / s`. Tabela de alvos no
  TIMING (`ZOOM_A`, `ZOOM_B`...), com interpolação do alvo entre eles. Título fora do
  wrapper quando precisar continuar legível; dentro quando o zoom é nele.
- **Anti-padrão:** push-in lento e global (E1); zoom em toda emenda.

## 2. Título herói

- **Propósito:** apresentar a mensagem principal.
- **Frames:** 0–4 antecipação (recuo 4–6px ou escala 0,96) · 4–16 entra (máscara por
  palavra, passo 3–5f) · 16–20 overshoot contido · 20–24 assenta · 24+ hold legível com o
  ambiente vivo. Linha de apoio entra 6–10f depois.
- **Curva:** expo-out; overshoot por `spring` (preset `seco`).
- **Não:** rotação grande; todas as palavras com pop gigante.
- **Secundário:** sublinhado diagonal que desenha depois que assenta.

## 3. Número em destaque (estatística)

- **Frames:** 0 oculto · 4 escala 0,92 · 6 opacidade 1 · 8–20 contador até o alvo
  (expo-out, `tabular-nums`) · 20–24 escala 1,04 · 24–30 assenta · depois zoom de destaque
  se a locução nomear o número.
- **Regra da marca:** antes/depois mostra os dois lados (`AntesDepois`); ano sem separador
  (E18); respeitar as restrições de divulgação de `_memoria/`.
- **Som:** impacto curto ou tique.

## 4. Callout técnico

Âncora (0–6, pop + pulso que afina) → linha-guia (4–16, desenha) → caixa (10–20,
desliza) → rótulo (14–24, máscara) → valor (20–30, contador ou destaque). Vive: âncora
pulsando, tracejado andando na linha. Detalhe em `dados-e-tecnico.md` §3.

## 5. Dashboard / painel

Fundo → cabeçalho → KPI principal → KPIs de apoio em diagonal (passo 4f) → gráfico
desenha → secundários → destaque → anotação. Tabela de frames em
`dados-e-tecnico.md` §2. Não: todos os cards juntos.

## 6. Legenda com destaque de palavra

Frase estável; palavra atual muda de cor pro acento com pulso 1,00 → 1,05 → 1,00 (6–10f)
e, opcional, pílula que cresce da esquerda. Páginas de 2–5 palavras com
`createTikTokStyleCaptions`. Preset de exemplo e regras em `tipografia-e-legendas.md` §4.

## 7. Batida (resposta, virada)

Palavra-chave em escala 1,8 → 1 com `spring` (damping ~11, massa ~0,55), opacidade
0 → 1 nos primeiros 25% do curso, tremida `sin(frame·2,6)·9·(1 − progresso)` por 12–16f
logo depois. Uma por cena no máximo. Modelo: Cena 3 do `ReelsPontoCego`.

## 8. Desenho de SVG

`pathLength=1` + dashoffset `1 − p`; expo-out pra orgânico, linear pra técnico. Cena
monta de trás pra frente com atraso escalonado (fundo → chão → estrutura → detalhe).
Depois de montado: pulso que afina, tracejado andando, balanço. Componentes `Traco`,
`Tracejado`, `Pulso` em `reels-ponto-cego/comum.tsx`.

## 9. Morph de SVG

`interpolatePath(p, A, B)` (`@remotion/paths`, 4.0.515 não tem `interpolatePaths`).
Curva in-out por segmento; escala ou brilho secundário no meio do morph. Só entre formas
com relação geométrica.

## 10. Foto → tomada cinematográfica (2.5D)

- **Propósito:** tirar vida de foto de acervo sem gerar vídeo novo.
- **Pilha:** foto separada em planos (fundo, sujeito, frente) → parallax 0,2× / 1,0× /
  1,4× → movimento de câmera com alvo → profundidade por leve desfoque no fundo → luz ou
  partícula na frente (opcional) → grão só no master → som.
- **Números da casa (corrigidos, E1):** a deriva precisa andar px de verdade: foto derivando
  60–120px ao longo da cena ou ±7% da largura (o que a Cena 6 do `ReelsPontoCego` usou),
  e troca de foto por varredura (A12). O "push de 1,04–1,08 imperceptível" de material
  externo **não** serve em MP4: é ruído de compressão.
- **Não:** cortar rosto, máquina ou texto da foto; foto com marca de terceiro grande
  (E20).

## 11. Whip pan

Antes: câmera acelera (expo-in, 6–8f) · durante: deslocamento de 1–2 larguras + blur
direcional proporcional à velocidade · corte no pico · depois: continua na mesma direção
e desacelera (expo-out, 8–10f). Som: whoosh com doppler. Máximo um a cada ~10s.

## 12. Máquina em 3D (só com modelo real)

Plano aberto → push → leve rotação → componente acende → rótulo (callout 2D) → vista
explodida → câmera assenta → mensagem. `@remotion/three` (`dados-e-tecnico.md` §6).
Sem modelo licenciado: fazer a receita 10 com foto real + callouts.

## 13. CTA

Mensagem → hold → CTA. CTA importante mas não explosivo: pílula que estoura com mola
seca, pulso contínuo sutil (anel ou `box-shadow` que respira), seta tracejada andando
até ela, ícone com um salto curto. Silêncio de 200–400ms na locução antes do CTA
(`audio.md`). No fim: assinatura da marca com as lâminas varrendo (A5) e ambiente
acelerando até o último frame.

## 14. Barra de progresso de retenção (Reels)

Segmentos iguais ao número de cenas, logo abaixo da zona segura do topo, preenchendo
linearmente pela duração de cada cena. É ao mesmo tempo gancho de retenção e camada de
movimento contínua (A16).
