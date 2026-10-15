# Transições: a emenda tem que dizer alguma coisa

> Ler na etapa 3 (quando a peça tem mais de uma cena) e na etapa 5. Esta seção saiu de
> `reconstruir-remotion.md` (Multi-cena) e ganhou a semântica do estudo de motion
> (2026-09-28). A API está em `remotion-best-practices` → `remotion-markup/transitions.md`
> e `light-leaks.md`.
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

Peça que parece slideshow não sofre de corte seco, sofre de **corte não motivado**: nada
na cena A prepara a cena B. Crossfadear tudo mascara o problema e cria outro, um vídeo
mole e sem ritmo. O objetivo não é eliminar o corte, é **motivá-lo**.

---

## 1. Hierarquia: da mais forte pra mais fraca

| # | transição | por que funciona | custo |
|---|---|---|---|
| 1 | **match cut / match gráfico** | algo em A tem forma, posição ou cor equivalente em B; o olho continua | zero |
| 2 | **continuidade de velocidade** | o elemento sai de A a X px/f; B entra na mesma velocidade e direção | zero |
| 3 | **shared element** | o mesmo objeto persiste e se transforma entre cenas: o corte que não é corte | médio |
| 4 | **máscara / wipe** | `clip-path` revelando área nova. Exemplo FX Minas: a diagonal de 20° com aresta acesa | baixo |
| 5 | **corte seco na batida** | sempre válido quando o áudio motiva | zero |
| 6 | **whip pan + blur direcional** | funciona; envelhece rápido se abusado | alto |
| 7 | **crossfade** | default de segurança quando nada acima se aplica | zero |

**Regra: mais de 40% dos cortes em crossfade = problema de edição, não de transição.**

Ex.: na FX Minas a #4 é a assinatura: a lâmina do logo é literalmente um wipe diagonal (A12, A14,
A16). A #2 é gratuita e quase nunca usada: se a lâmina de ambiente sai de A pra esquerda a
8px/f, B entrar com algo a 8px/f pela direita já amarra as duas.

---

## 2. Matriz semântica: relação entre as cenas → transição

Escolher pela relação, nunca porque "fica bonito":

| relação entre A e B | transição |
|---|---|
| mesmo lugar, outro momento ou outro detalhe | corte seco, pan |
| deslocamento espacial (lado a lado, próximo item) | slide, push, pan |
| entrar no detalhe | zoom (push through) |
| alta energia, virada | whip pan, flash |
| tecnologia, sistema, dado | wipe, scan, varredura de HUD |
| elegante, passagem suave | dissolve, blur suave |
| transformação de uma coisa em outra | morph, match cut |
| dado mudando | wipe, scan, desenho de traço |
| passagem de tempo | crossfade, dissolve, relógio / radial |
| impacto, revelação dura | flash, corte seco |
| revelar algo escondido | máscara, wipe |

**Continuidade através do corte:** carregar uma propriedade de A pra B: direção,
escala, cor, forma, som, velocidade de câmera, posição do objeto. Se a câmera anda pra
direita em A, continua pra direita em B. Mesmo com cenas totalmente diferentes, o corte
parece intencional.

**Eco visual:** repetir um motivo entre cenas (o círculo da cena 1 volta na cena 2; o
acento laranja volta). Dá coesão sem transição nenhuma.

---

## 3. Corte seco ou transição?

**Corte seco quando:** a informação muda de forma abrupta; o ritmo é rápido; o áudio já
faz a transição (batida, palavra nova); a relação visual já é forte. Muitas vezes o
corte seco é mais profissional que uma transição rebuscada.

**Transição quando:** a continuidade ganha com ela; a relação espacial precisa ser
explicada; a própria transição comunica algo.

**Nunca:** esconder um corte fraco embaixo de um efeito enorme. Nem usar zoom, glitch ou
whip em toda emenda.

---

## 4. Match cut e match gráfico: exemplos pro nosso universo

| cena A | cena B |
|---|---|
| roda do fora de estrada girando | anel de progresso / rosca de KPI |
| lâmina diagonal do logo | braço da escavadeira, rampa da mina, talude |
| traço de estrada que se desenha | linha de gráfico |
| círculo do marcador de mapa | pneu, holofote, capacete visto de cima |
| barra laranja | faixa refletiva do uniforme |
| retângulo de card | caçamba vista de cima |

Montar pelo **contorno**: alinhar posição e tamanho do elemento no último frame de A com
o primeiro de B, e deixar a escala ou a rotação continuar através do corte.

---

## 5. Transição contra overlay

`TransitionSeries` distingue:

- **Transição:** muda a relação entre as cenas e **sobrepõe o tempo delas** (a duração
  total encurta pela duração da transição).
- **Overlay:** efeito por cima do corte, sem mexer na duração das cenas: light leak,
  flash, film burn, textura, poeira, impacto.

Usar overlay curto, com direção consistente e opacidade controlada. Overlay não conserta
corte ruim. Na FX Minas (exemplo), light leak e film burn estão fora do tom (`efeitos-e-estilos.md`);
flash curto de impacto pode, em momento de revelação.

---

## 6. Implementação

### Emenda com o grafismo da marca (exemplo FX Minas: diagonal)

No seu negócio, trocar a lâmina diagonal pelo elemento gráfico assinatura do `identidade/design-guide.md`.
**Na FCS 3D STUDIO:** duas emendas da casa, nesta ordem de preferência. (1) **Camadas**: a
cena nova se imprime por cima da anterior, de baixo para cima, com a linha da camada ativa
acesa em ciano cheio (`Camadas` em `Mesa.tsx`). (2) **Chanfro**: máscara com aresta a 45° (o
canto cortado das letras do logo, `mascaraCorte`) com a aresta acesa em ciano enquanto varre.
A malha da mesa (`Grade`) acelera a deriva durante a emenda e liga as duas cenas.

`<Sequence>` por cena com início encadeado por sobreposição fixa (20–24f) e
`clipPath: polygon(...)` com a aresta correndo em `Easing.bezier(0.62, 0.04, 0.34, 1)`
(atravessa, E15), mais uma `Diagonal` laranja acesa por cima enquanto varre. Modelos:
`RemotionFX/src/composicoes/institucional/Institucional.tsx` e
`reels-ponto-cego/ReelsPontoCego.tsx`. Duração total = soma das cenas − (n−1) ×
sobreposição.

### `<TransitionSeries>` (quando servir uma apresentação pronta)

```tsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={90} premountFor={fps}>
    <CenaA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 15 })}
  />
  <TransitionSeries.Sequence durationInFrames={90} premountFor={fps}>
    <CenaB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

Apresentações prontas: fade, slide, wipe, flip, clock wipe. A skill oficial recomenda
escrever cada `TransitionSeries.Sequence` explícita, com `durationInFrames` inline, quando
a editabilidade no Studio importar; gerar por `.map()` é aceitável em peça que não vai
ser editada no Studio. Dentro de cada cena, `useCurrentFrame()` recomeça do zero: o
TIMING é local.

### Whip pan (receita completa em `receitas.md`)

Antes: câmera acelera (expo-in) · durante: deslocamento grande + blur direcional ·
corte: no pico de energia · depois: continua na mesma direção e desacelera (expo-out).
Som: whoosh. Não mais que um a cada ~10s de peça.

### Zoom como transição

Push through: a câmera entra num objeto ou numa palavra de A e sai dentro de B (ex.:
entra no círculo do marcador e o círculo vira a roda). Variações: zoom blur, zoom através
de tela, match zoom. Não usar entre todas as cenas.

---

## 7. Biblioteca de transições e feel

✓ = combina com o feel da FX Minas, dado como exemplo (industrial, sério, sem gloss) · ◐ = com parcimônia · ✗ = fora
do tom da FX (pode valer pra outra marca: decidir pelo feel dela).

| transição | feel | ex. FX |
|---|---|---|
| corte seco | qualquer | ✓ |
| crossfade | documental, tempo | ◐ (≤40%) |
| fade pelo preto | encerramento, pausa | ◐ |
| fade pelo branco | leve, clean | ✗ |
| slide / push | espacial, UI | ✓ |
| wipe / máscara | editorial, técnico | ✓ |
| **wipe diagonal com aresta acesa** | marca FX | ✓ assinatura |
| círculo / radial | tempo, foco | ◐ |
| zoom / push through | detalhe, energia | ✓ |
| zoom blur | social, energia | ◐ |
| whip pan | energia, virada | ◐ |
| spin / flip / cubo | lúdico, UI | ✗ |
| glitch / RGB split | tech, instabilidade | ✗ |
| flash | impacto | ◐ |
| light leak / film burn | cinema, analógico | ✗ |
| match cut / morph / shape | transformação | ✓ |
| oclusão por objeto (caminhão passa na frente) | cinematográfico | ✓ |
| passagem de câmera / parallax pass | profundidade | ✓ |
| data scan / HUD scan | técnico | ◐ |
| noise / particle dissolve | tech, etéreo | ✗ |
| máscara orgânica / líquida | lúdico, beleza | ✗ |
