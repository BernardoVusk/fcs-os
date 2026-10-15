# Câmera virtual e tratamento de imagem

> O que separa "animação de código" de "vídeo". Ler quando a peça já passa nos portões
> de fluidez e ainda parece renderizada.
>
> **Status: nada aqui foi usado em peça entregue ainda.** As APIs estão conferidas contra
> os pacotes na versão 4.0.515; os *números* vêm da fonte externa e ainda não foram
> medidos aqui. Ao usar pela primeira vez, medir e gravar em `aprendizado.md` — do mesmo
> jeito que se faz com qualquer valor não verificado.

---

## 1. Motion blur

Toda câmera física expõe o sensor durante uma fração do frame. Objeto em movimento durante
a exposição = borrão. Animação renderizada frame a frame não tem isso: cada frame é
perfeitamente nítido, e o olho lê como falso antes de conseguir explicar por quê.

A referência é o **ângulo de obturador de 180°** — a exposição dura metade do intervalo do
frame. É o padrão cinematográfico.

### O pacote

`@remotion/motion-blur@4.0.515` existe e casa com a versão fixada do projeto. **Não está
instalado.** Instalar com versão exata, alinhada com os outros pacotes:

```bash
npm install @remotion/motion-blur@4.0.515 --save-exact
```

API conferida no `.d.ts` do pacote:

```tsx
<CameraMotionBlur shutterAngle={180} samples={10}>{children}</CameraMotionBlur>
<Trail layers={n} lagInFrames={n} trailOpacity={n}>{children}</Trail>
```

| componente | o que faz | props |
|---|---|---|
| `CameraMotionBlur` | amostragem sub-frame — o correto | `shutterAngle` (default 180), `samples` (default 10, inteiro ≥ 0) |
| `Trail` | rastro por cópias defasadas — mais barato, mais estilizado | `layers`, `lagInFrames`, `trailOpacity` (os três obrigatórios) |

### O custo

`CameraMotionBlur` renderiza os filhos **`samples` vezes por frame**. Com o default de 10,
o trecho envolvido custa ~10× o normal. Numa peça em que o render de entrega já leva
16,6s por 150 frames a 1920×1080, envolver o quadro inteiro é caro.

**Envolver só o que se move rápido**, nunca a composição inteira. E rodar em rascunho
enquanto itera.

### Onde não usar

- **Texto que precisa ser lido.** Blur em texto legível é pior que blur nenhum.
- Movimento lento. Não há borrão a simular, e o custo continua.
- Elemento parado dentro de uma cena que se move — só borra o que tem velocidade própria.

### A interação com o `fluidez.mjs` — medir, não supor

O `fluidez.mjs` mede a diferença entre frames consecutivos. Motion blur muda essa
diferença, e **não dá para prever o sinal sem medir**: o borrão aproxima frames vizinhos
(diferença menor), mas o rastro do `Trail` é conteúdo novo a cada frame (diferença maior).

Ao usar pela primeira vez: rodar o `fluidez.mjs` **antes e depois**, no tier de entrega, e
gravar o delta. Se a cobertura mudar de faixa por causa do efeito e não do movimento, os
limiares precisam de revisão.

### A alternativa barata

`filter: blur()` direcional proporcional à velocidade instantânea, só durante o pico do
movimento. Não é fisicamente correto, mas engana bem e custa um filtro em vez de dez
renders. Em Remotion `filter` é livre (não vale a regra web de "só transform e opacity").

---

## 2. Câmera virtual

### 2.0 Linguagem de câmera: todo movimento tem alvo

Movimento de câmera sem motivo desorienta. Em vez de "zoom de 10%", pensar "empurrar a
câmera até o número destacado". Em vez de "pan pra direita", "ir do componente atual da
máquina pro próximo". **Câmera fixa seguida de um push deliberado vale mais que câmera
que não para.**

| movimento | serve pra | na casa |
|---|---|---|
| **push in** | ênfase, descoberta, tensão, entrar no detalhe | **zoom de destaque** (`receitas.md` §1, A18): 1,12–1,25 em 12–18f, in-out, no instante da palavra |
| **pull out** | revelar contexto, escala, surpresa, fechar | recuo depois de uma sequência de destaques; abertura de mapa |
| **pan** | ligar objetos, revelar no espaço, seguir | pan entre alvos com a escala mantida (A → B → C) |
| **tilt** | revelar na vertical, altura, do chão ao objeto | do pneu à cabine do fora de estrada; da bancada ao topo da cava |
| **órbita** | produto, máquina, arquitetura (3D ou 2.5D) | só com 3D de verdade ou foto multi-plano; nunca em UI plana |
| **parallax** | profundidade sem 3D | 2.1 abaixo |
| **whip pan** | ligar cenas com energia | `transicoes.md` e `receitas.md` §11 |
| **handheld / shake** | presença física, impacto | 2.3 e 2.4 |
| **rack focus** | trocar o foco | 2.5 |

**2.5D a partir de foto:** separar a foto em planos (fundo, meio, sujeito, frente),
mover cada plano na sua velocidade (2.1), usar máscara pra **oclusão** (um caminhão ou
uma coluna passa na frente do texto ou do sujeito), e desfocar de leve o fundo. Receita
completa em `receitas.md` §10, com os números corrigidos pela medição (2.2).

**Espaço de tela contra espaço de câmera:** legenda, CTA e UI ficam no espaço de tela
(fixos no quadro, fora do wrapper da câmera). Rótulo técnico, seta e anotação que
pertencem ao objeto ficam no espaço de câmera (dentro do wrapper, acompanham o zoom).

**Micro-movimento de câmera:** a intenção de "respiração" do quadro é boa, mas a
amplitude que material externo recomenda (1,00 → 1,025 em segundos) é ruído de
compressão em MP4 (2.2, E1). A respiração se faz com elemento discreto andando px de
verdade, não com escala global.

### 2.1 Parallax por profundidade

Separar a cena em 3–4 planos e mover cada um em velocidade diferente durante o mesmo
movimento de câmera. Transforma imagem estática em cena com volume.

| plano | velocidade relativa |
|---|---|
| fundo | 0,2× |
| meio | 0,5× |
| sujeito | 1,0× |
| frente | 1,4× |

É o truque mais barato para dar volume a foto de acervo. Casa direto com a camada de
ambiente: o plano de fundo derivando **é** ambiente, desde que ande px de verdade por
frame (ver 2.2).

### 2.2 Deriva contínua de câmera — CORRIGIDO PELA MEDIÇÃO

> A fonte externa recomenda "escala de 1,0 para 1,04 ao longo de 6 segundos" e "moving
> hold de 0,5–2px ou 0,3% de escala em 2–3s". **Nós medimos e isso não funciona em MP4.**

A intenção está certa — nenhum frame totalmente congelado. A **amplitude** está abaixo do
piso de visibilidade depois do h264:

| recomendação da fonte | deslocamento por frame | veredito |
|---|---|---|
| escala 1,0 → 1,04 em 6s (180f) | 0,022%/frame ≈ 0,12px na borda | 8× abaixo do piso |
| translação de 2px em 2s (60f) | 0,033px/frame | sub-pixel |
| escala 0,3% em 3s (90f) | 0,036px/frame | sub-pixel |

O piso, calculado em `doutrina-fluidez.md`: num quadro de 1080 de altura, o pixel da borda
só anda 1px por frame se a escala mudar **0,185% por frame**. Medido na prática, um
push-in de 1,0 → 1,025 em 150 frames deu YAVG 0,02–0,05 — o mesmo do ruído de compressão
(`aprendizado.md` E1).

**A regra da casa continua valendo:** moving hold se faz movendo um **elemento discreto com
contraste de luma**, não arrastando um parâmetro global. A diferença é que a fonte escreve
para canvas ao vivo, sem compressão; nós entregamos MP4, onde o piso de ruído é mais alto.

### 2.3 Handheld

Movimento de câmera perfeitamente suave lê como CGI. Ruído coerente de baixa amplitude em
X, Y e rotação resolve.

- Amplitude: 2–5px em posição, 0,2–0,5° em rotação
- Frequência: 0,5–1,5 Hz (a 30fps, um ciclo a cada 20–60 frames)

**`Math.random()` por frame não serve** — cada frame é um render novo e independente, então
sai tremor epilético, e o resultado muda entre renders. Precisa de ruído coerente e com
semente.

`@remotion/noise@4.0.515` existe e casa com a versão do projeto (não instalado). API
conferida no `.d.ts`:

```tsx
noise2D(seed: string | number, x: number, y: number): number
noise3D(seed: string | number, x: number, y: number, z: number): number
noise4D(seed: string | number, x: number, y: number, z: number, w: number): number
```

```tsx
// frequência 1Hz a 30fps = frame/30; eixos separados por semente, não por offset
const x = noise2D("camera-x", frame / 30, 0) * 4;
const y = noise2D("camera-y", frame / 30, 0) * 4;
const rot = noise2D("camera-rot", frame / 30, 0) * 0.4;
```

**Cuidado com a métrica:** handheld move o quadro inteiro. A 0,5px/frame é sub-pixel por
elemento mas afeta todos os pixels — pode inflar o YAVG sem que nada de conteúdo esteja
acontecendo. Isso é exatamente o padrão "cobertura alta, densidade baixa" que a doutrina
manda desconfiar. Medir antes e depois.

### 2.4 Shake com decaimento

Impacto sem envelope é videogame ruim. A amplitude é máxima no frame do impacto e decai
exponencialmente ao longo de 250–400ms (8–12 frames a 30fps):

```tsx
const t = (frame - IMPACTO) / fps;
const amplitude = t < 0 ? 0 : 8 * Math.exp(-t * 8);
```

Combinar com o ruído coerente de 2.3 para a direção, e nunca com `Math.random()`.

### 2.5 Rack focus

Fundo de `blur(8px)` → `blur(0)` enquanto o primeiro plano faz o inverso. Dirige o olhar
sem mover nada. Funciona bem em transição entre camadas de informação — e é uma fase
"reage" legítima no ciclo de vida, então conta como evento no `TIMING`.

---

## 3. Tratamento de imagem

### 3.1 A ordem importa

Composição de baixo para cima:

```
1. Conteúdo
2. Correção de cor / LUT
3. Bloom nas altas luzes
4. Aberração cromática
5. Halation
6. Vinheta
7. Grão
8. Letterbox / máscara de formato
```

Grão **antes** da vinheta faz o grão escurecer nos cantos — fisicamente errado: o grão está
no filme, não na lente.

### 3.2 Grão — e a armadilha que ele cria para a nossa métrica

Grão estático denuncia na hora; o grão precisa mudar a cada frame. Opacidade 2–4%,
monocromático (grão colorido lê como ruído digital), mais forte nas sombras que nas altas
luzes.

> ⚠ **Grão animado em quadro cheio invalida o `fluidez.mjs`.**
>
> A métrica é a diferença de luma entre frames consecutivos. Grão regenerado por frame faz
> **todo pixel mudar em todo frame**, por construção. O YAVG sobe em toda a peça,
> uniformemente, e a peça passa em 100% "real" mesmo estando completamente parada.
>
> Isto não é hipótese, é aritmética do que o filtro mede.

**Como conviver:** medir a fluidez na peça **sem** a camada de grão, e compor o grão por
último — ou como passo de finalização em cima do render aprovado. Nunca aprovar uma peça
cujo número foi medido com grão em cima.

Vale o mesmo raciocínio para qualquer efeito de quadro cheio que se regenera por frame.

### 3.3 Vinheta

- Opacidade 15–30% no canto, feather amplo (~60% do raio)
- **Descentralizar 3–5%.** Vinheta perfeitamente centrada e simétrica lê como filtro.
- Nunca vinheta dura. Se a borda é perceptível, está errado.

### 3.4 Elevação do ponto preto

Filme não tem preto absoluto. Levantar os pretos de `#000000` para algo entre `#0A0A0C` e
`#12121A`.

Conferir se o "preto" da marca do negócio (o token mais escuro de `motion/src/marca/`) já
cai fora dessa faixa — é comum, cor "preta" de marca raramente é hex puro. Exemplo real
(FX Minas): `basalto #1c1e20` já resolvia por construção, nenhuma peça usava `#000000`.
Vale conferir uma vez por projeto e registrar em `aprendizado.md`, para não "corrigir" na
direção errada algum dia.

### 3.5 Aberração cromática, halation e bloom — precisam de decisão de marca

Os três introduzem **matiz que não está na paleta**, e a regra "nenhuma cor fora da paleta"
é dura. Não aplicar por conta própria; propor ao usuário com still lado a lado.

| efeito | o que faz | risco na nossa paleta |
|---|---|---|
| aberração cromática | separa R e B em 0,5–2px nas bordas | arruína texto pequeno; introduz ciano/magenta |
| halation | brilho alaranjado em volta de altas luzes, `screen` 20–40% | **lê como o laranja da marca fora de lugar** |
| bloom | altas luzes sangram, threshold ~80%, `screen` 15–30% | mais seguro: é luminância, não matiz |

Grão e vinheta são operações de **luma** e não têm esse problema — passam sem decisão.

### 3.6 Gate weave

Deslocamento de 0,3–0,8px do quadro inteiro, coerente, simulando o filme deslizando no
mecanismo. Praticamente subliminar. Só se o objetivo for estética de película — e cai na
mesma armadilha de métrica de 2.3.

---

## 4. Render mestre

Peça que vai para edição ou entra como overlay não sai em h264 — sai em ProRes, com canal
alfa quando for sobreposição. Comandos e perfis em `qualidade-render.md`, seção "O terceiro
tier: master".
