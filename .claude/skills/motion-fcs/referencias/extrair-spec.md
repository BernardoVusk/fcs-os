# Extrair a spec de uma referência

> Etapa 3, quando há vídeo de referência. Adaptado do PROMPT 1 do
> `claude-motion-prompts_1.md`, com a grade em **frames da composição alvo** além de ms.

## O princípio

Nunca juntar medir e gerar no mesmo passo. Se juntar, o modelo improvisa números e sai um
`transition: all 0.3s ease` triste. Primeiro extrair uma spec numérica, depois reconstruir
a partir dela.

Referências ficam em `motion/referencias/` (na raiz do projeto Remotion do negócio).

---

## Método A — com ffmpeg (padrão)

O ffmpeg do sistema (8.1.2 full) tem todos os filtros. O `npx remotion ffmpeg` **não
serve**: o build embutido vem com a maioria dos filtros desabilitada.

### 1. Sondar

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=r_frame_rate,width,height,nb_frames,duration \
  -of default=nw=1 referencia.mp4
```

Anotar fps real, resolução e duração. Não assumir 30fps — referência de rede social vem
com frequência a 24, 25, 50 ou 60.

### 2. Extrair os frames do trecho de interesse

```bash
ffmpeg -i referencia.mp4 -ss 00:00:03 -to 00:00:08 \
  -vf fps=<FPS_NATIVO> frames/f_%04d.png
```

Na taxa nativa, nunca reamostrado — reamostrar destrói justamente o que se quer medir.

### 3. Localizar as batidas mecanicamente

Antes de olhar frame a frame, deixar o ffmpeg apontar onde há movimento:

```bash
ffmpeg -i referencia.mp4 -vf \
  "scale=320:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" \
  -f null - 2>/dev/null | grep -oE "YAVG=[0-9.]+"
```

Picos = início de batida. Vales = hold. Isso reduz muito o número de frames a inspecionar
no olho, e já dá o mapa de fluidez da referência — útil para saber se ela própria é fluida
antes de copiar o ritmo dela.

### 4. Inspecionar

Ler os PNGs nos frames que os picos indicaram. Para cada elemento que se move, achar o
frame exato em que começa e em que para.

### 5. Converter

`ms = frame / fps_nativo * 1000` e `frame_alvo = ms / 1000 * 30`.

Sempre registrar os dois. O ms é o que se compara com a referência; o frame alvo é o que
vai para o `TIMING` da composição.

---

## Método B — sem ffmpeg (o PROMPT 2 que faltava no arquivo original)

Quando só há prints, um GIF, ou um link que não dá para baixar.

1. Pedir ao usuário de 8 a 12 frames espaçados uniformemente pelo trecho, **numerados**,
   e o tempo total do trecho.
2. `intervalo_ms = duracao_total_ms / (n_frames - 1)`.
3. Medir ordem, sobreposição e deslocamento relativo entre os frames dados.
4. **Marcar tudo como [ESTIMADO].** Com 10 amostras num trecho de 5s, cada amostra cobre
   500ms — dá para extrair ordem, sobreposição e stagger grosso; não dá para extrair
   easing nem constante de mola.

Este método serve para coreografia. Para "feel", pedir o vídeo.

---

## O princípio da spec: traduzir, não interpretar

A spec é **blueprint de código**, não descrição em prosa. Ela responde toda pergunta que o
builder teria, antes de ele precisar perguntar.

| spec fraca | spec boa |
|---|---|
| "o texto entra com spring" | `titulo, 52px, laranja, entrada slideUp, spring seco, frame 50` |
| "o selo desliza do canto" | `rotateZ -30 → 0 (spring seco), depois translateX ±3px, 3 ciclos, 12 frames` |
| "grande", "azul", "devagar" | `84px`, `#f26f21`, `24 frames` |
| tempos soltos na prosa | objeto `BEATS` no fim de cada cena |
| um evento por elemento | ciclo de vida: entra → vive → reage → sai, cada fase com sua entrada |
| blocos de 40+ frames | micro-blocos de 10–20 frames |
| texto sobre fundo | 3 camadas: fundo + estrutura + conteúdo |

Regras que decorrem disso:

1. **Cada bloco de frames é autossuficiente** — dá pra implementar sem ler os vizinhos
2. **Props inline** com valores exatos, junto da descrição visual
3. **Valor exato, nunca faixa** — "52px", não "grande"
4. **Preset de mola pelo nome** — `(spring: seco)`, não "com bounce"
5. **Posição em px quando o layout importa** — "y 384", não "perto do topo"
6. **Stagger explícito** — "4 frames entre cada", não "escalonado"

---

## Formato da spec

Entregar exatamente assim:

### RESUMO
Uma frase: o que a animação faz e qual a sensação dominante.

### ESTILO
Linguagem de cor + tipografia + espaço + forma + movimento + câmera + efeito + som, em
uma linha cada. Ex.: "tech: fundo escuro, grade fina, tipo branco, acento elétrico,
desaceleração rápida, micro-parallax, HUD, glow contido". Dizer qual estilo de
`efeitos-e-estilos.md` §2 é o mais próximo e o que dele serve à marca.

### ROTEIRO DE TOMADAS (shot list)
Uma linha por tomada, antes de descer ao detalhe por elemento:

| # | início–fim (ms) | frames alvo | propósito | primário | secundário | câmera | transição de saída | som | Remotion |
|---|---|---|---|---|---|---|---|---|---|

Ex.: `03 · 2100–3200 · 63–96 · revelar estatística · contador à direita · anel desenhando
· micro-push [ESTIMADO] · corte seco na batida · impacto curto · SVG + interpolate + spring`.

A coluna **propósito** é a mais importante: é o que se copia de uma referência, junto com
tempo, curva e ordem. Layout e visual continuam nossos.

### GRADE TEMPORAL
| t (ms) | frame nativo | frame alvo (30fps) | elemento | evento |
|---|---|---|---|---|

`t=0` no primeiro movimento, não no início do arquivo.

### POR ELEMENTO
Para cada elemento animado:
- **Elemento:** descrição visual
- **Propriedades:** cada uma com valor DE → PARA (opacity, translateX/Y em px ou %, scale,
  rotate em graus, blur, clip-path, cor em hex)
- **Duração:** ms e frames alvo
- **Delay:** a partir do t=0 global
- **Easing:** cubic-bezier estimada. Se houver overshoot (passa do destino e volta), dizer
  que é spring e estimar damping/mass
- **Transform-origin:** se houver scale ou rotate

### COREOGRAFIA
- Stagger entre irmãos, em frames
- O que dispara junto e o que dispara em sequência
- **Sobreposição:** onde B começa antes de A terminar, e em que percentual

### BEATS
Objeto TypeScript fechando cada cena — é o esqueleto que o builder copia direto pro
código. Nome no padrão `ELEMENTO_FASE`, `SCREAMING_SNAKE_CASE`, `CENA_FIM` como última
entrada. Declarar no topo se os frames são locais à cena ou globais à peça.

```typescript
const BEATS = {
  WORDMARK_REVELA: 12,
  WORDMARK_REAGE: 70,
  EYEBROW_ENTRA: 28,
  EYEBROW_RECUA: 84,
  CENA_FIM: 150,
};
```

**Densidade alvo: 3–4 entradas por segundo de cena.** Cena de 3s com menos de 9 entradas
está subespecificada — provavelmente os elementos entram e congelam.

### FLUIDEZ DA REFERÊNCIA
Rodar o passo 3 na referência inteira e reportar cobertura real/fraco/morto. Se a
referência tiver ar morto, **não copiar esse ritmo** — copiar as batidas e fechar as
lacunas com o método da `doutrina-fluidez.md`.

Referências comerciais costumam ser bem mais paradas do que o nosso padrão. Medido num
logo sting de 12s: ~3s de animação real e 8s de espera, incluindo 5s de logo congelada no
fim. A coreografia era ótima; o ritmo, inflado.

**Armadilha:** pico periódico e de valor exatamente repetido (ex.: 1,16 / 0,00 / 0,00 /
1,16…) em vídeo de terceiro costuma ser **keyframe de compressão**, não movimento. Conferir
extraindo os frames e comparando — se a imagem é idêntica, é artefato de encode.

### FEEL TAGS
3 a 5 adjetivos de `vocabulario.md`.

### PONTOS CEGOS
O que não deu para medir com confiança, e por quê. **Não inventar número para preencher
lacuna.** Movimento de menos de 2 frames: dizer que não é mensurável.

### PARÂMETROS DERIVADOS
Os tokens de duração e easing que reproduziriam essa animação, no vocabulário de
`vocabulario.md`.

---

## Regras

- Trabalhar só com o que foi medido nos frames.
- Cada easing marcado como **[MEDIDO]** ou **[ESTIMADO]**.
- **Não gerar código nesta etapa.**
- Números redondos demais (tudo em 200/400/600ms) são sinal de arredondamento em vez de
  medição. Voltar aos frames brutos.
- Se a spec não mencionar stagger, perguntar explicitamente — é o parâmetro que mais
  separa motion profissional de motion genérico, e o mais omitido.

## O que se copia e o que não

Copia-se **tempo, easing, ordem e sobreposição**. Não se copia layout, ícone, composição
visual nem paleta. A identidade é sempre a do negócio, lida de `motion/src/marca/`.
