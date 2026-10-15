# Doutrina de fluidez

> O núcleo da skill. Ler na etapa 4 (mapa de fluidez) e sempre que o `fluidez.mjs`
> reprovar uma peça.

## O critério

Uma peça é fluida quando, em **qualquer** frame, alguma coisa se move de forma
perceptível. Não é "tem animação no começo e no fim" — é cobertura contínua.

Isso é medível. `scripts/fluidez.mjs` roda o vídeo por
`tblend=all_mode=difference` + `signalstats` e devolve, para cada par de frames
consecutivos, o brilho médio da diferença (YAVG). Alto = muita coisa mudou. Perto de zero
= quadro parado.

| YAVG | classificação | o que é |
|---|---|---|
| < 0,10 | **morto** | indistinguível do ruído de compressão do h264 |
| 0,10 – 0,40 | fraco | um elemento pequeno se mexendo |
| > 0,40 | real | movimento legível na tela |

**O tier de render altera a medição.** A mesma peça lê ~18% mais alto em rascunho
(JPEG, CRF 23) do que em entrega (PNG, CRF 8) — mediana 0,699 contra 0,594, pico 16,4
contra 13,05. Não é mais movimento: é o ruído de bloco do JPEG somando à diferença entre
frames. **A medição da entrega é a honesta.** Medir sempre no tier em que a peça sai.

**Regras de aprovação:**

1. Nenhum trecho acima de **8 frames** (0,27s a 30fps) abaixo de 0,10.
2. Nenhum trecho acima de **30 frames** (1s) abaixo de 0,30.
3. O último frame não pode estar em trecho morto — a peça fecha em saída ou acento, nunca
   em hold parado.

A regra 1 mata o ar morto. A regra 2 mata o "tecnicamente tem uma coisinha se mexendo, mas
a peça parou". A regra 3 mata o final que congela esperando o loop.

### O que contamina a medição

O `fluidez.mjs` mede diferença de luma entre frames. **Qualquer efeito de quadro cheio que
muda por frame infla o número por construção**, sem que uma única coisa de conteúdo esteja
acontecendo:

| efeito | o que faz com a métrica |
|---|---|
| grão animado (2–4%, regenerado por frame) | todo pixel muda em todo frame → 100% "real" numa peça parada |
| handheld / gate weave | desloca o quadro inteiro; sub-pixel por elemento, mas afeta tudo |
| motion blur | muda a diferença entre frames vizinhos, e o **sinal não é previsível** |
| tier de render | rascunho lê ~18% mais alto que entrega (ruído de bloco do JPEG) |

**Regra:** medir a fluidez na peça **sem** camada de finalização, e compor grão, vinheta e
blur por último. Peça cujo número foi medido com grão em cima não está aprovada — está
mascarada. Detalhe em `camera-e-imagem.md`.

O sintoma clássico continua sendo o mesmo: **cobertura alta com densidade baixa**. Se a
cobertura subiu sem que o `TIMING` tenha mudado, foi efeito, não coreografia.

---

## Ciclo de vida: todo elemento tem quatro fases

**Esta é a principal fonte de fluidez.** Um elemento que entra e congela até o fim
desperdiça tempo de tela e obriga o fundo a carregar a peça sozinho.

| fase | o que é |
|---|---|
| **entra** | como aparece — wipe, spring, tracking, desenho |
| **vive** | o que faz enquanto está em cena — pulsa, deriva, brilha, conta |
| **reage** | como responde a outra batida — escurece, destaca, escala, recua |
| **sai** | como deixa a cena — some, encolhe, é varrido, recua pro fundo |

O contraste que define a disciplina:

> Um card que entra no frame 0, fica parado até o 80 e some é **um** evento de animação.
> Um card que entra (0–10), pisca a borda (60–61), escurece quando a batida seguinte chega
> (50–60) e escurece mais com escala 0,95 no próximo beat (75–85) são **quatro**.

Nem todo elemento precisa das quatro fases, mas **todo elemento significativo precisa de
mais de uma**. Se o `TIMING` tem cada nome aparecendo uma vez só, a peça é um slide com
transição, não uma animação.

Convenção de nome: `ELEMENTO_FASE` — `WORDMARK_REVELA`, `WORDMARK_REAGE`,
`WORDMARK_RECUA`. O `densidade.mjs` usa a raiz do nome para apontar elementos de uma fase só.

---

## Densidade: 3 a 4 eventos nomeados por segundo

| duração | eventos no `TIMING` |
|---|---|
| 5s (150 frames) | 15 – 20 |
| 10s (300 frames) | 30 – 40 |
| 15s (450 frames) | 45 – 60 |

Abaixo de 3 por segundo a peça está subespecificada. `scripts/densidade.mjs` mede isso
lendo o `TIMING` da composição.

**Como aumentar densidade sem inchar a peça:** dar ciclo de vida completo ao que já
existe, nunca inventar elemento novo. Elemento a mais é poluição; fase a mais é vida.

A unidade é o **evento nomeado**. Uma faixa `wordmark: [12, 38]` é um evento com começo e
fim, não dois — contar faixa como dois inflaria o número sem que nada a mais se mova.

### 3–4 por segundo é piso, não distribuição uniforme

Vídeo bem editado tem **curva** de densidade, não densidade constante:

| trecho | densidade | por quê |
|---|---|---|
| gancho (0–3s) | máxima | é onde se ganha ou se perde o espectador |
| corpo | média | respiração entre blocos |
| fecho / CTA | menor, um foco só | tempo para absorver a informação |

Densidade constante cansa mesmo quando cada cena é boa.

Isso **não conflita** com a regra: o `densidade.mjs` mede a média da peça, então uma curva
com gancho denso e fecho enxuto passa normalmente. O que não pode é o fecho cair para
*zero* — ele afina, mas continua com ciclo de vida rodando (a régua alcançando, o ambiente
acelerando, o brilho assentando). Fecho com foco único ≠ fecho parado.

---

## As três camadas

Toda peça se organiza em três camadas de movimento. Elas somam — a cobertura de uma tapa a
lacuna da outra.

### 1. Narrativa (as batidas)

As entradas e saídas que contam a coisa: título entra, foto entra, número conta, bloco sai.
É onde mora o conteúdo, e de onde vem a maior parte da cobertura numa peça bem
coreografada.

### 2. Ambiente

Movimento contínuo de fundo, que existe justamente para cobrir os intervalos entre
batidas. **Precisa ser um elemento que se desloca**, não um parâmetro global sendo
arrastado. Ver "O erro da rampa global" abaixo.

### 3. Detalhe / follow-through

O que continua depois que o principal parou: um acento que assenta, uma sombra que
alcança, um sublinhado que termina de desenhar. Cobre a cauda de cada batida.

**Camada não é só cobertura de movimento — é profundidade de composição.** Toda cena
precisa de fundo + estrutura + conteúdo simultâneos. Um texto sozinho sobre fundo escuro
é um slide, não uma animação, mesmo que o texto esteja se mexendo.

---

## Ordem de ataque

Quando a peça não é fluida, atacar nesta ordem. As três primeiras resolvem pelo conteúdo;
a última é a mais fraca porque resolve por decoração.

1. **Ciclo de vida** — dar fases aos elementos que já existem
2. **Densidade** — chegar a 3–4 eventos por segundo
3. **Sobreposição** — a batida seguinte entra a 50–70% da anterior
4. **Camada de ambiente** — elemento que se desloca cobrindo o que sobrar

Uma peça que só passa na fluidez por causa da camada 4 está tecnicamente aprovada e
perceptualmente vazia: o conteúdo está parado e o fundo é que se mexe.

---

## Sobreposição — a principal ferramenta

**A batida seguinte entra quando a anterior está a 50–70% do percurso.** Nunca depois que
ela termina.

```
ruim  |███ A ███|          |███ B ███|          |███ C ███|
         ↑ lacuna     ↑ lacuna     ↑ lacuna

bom   |███ A ███|
            |███ B ███|
                  |███ C ███|
```

Numa peça de 150 frames com 5 batidas de 20 frames cada:
- sem sobreposição: 100 frames de movimento, 50 de ar morto, e as batidas terminam no
  frame 100 deixando 50 frames de hold no final;
- com sobreposição de 60%: as mesmas 5 batidas se espalham por 148 frames.

**A sobreposição não é enfeite: é o que faz as batidas alcançarem o fim da peça.** Se a
coreografia termina bem antes da duração, ou a peça é longa demais ou faltou sobrepor.

---

## O erro da rampa global

Push-in lento, fade lento, rotação lenta aplicados ao quadro inteiro ao longo da peça
**não produzem fluidez**. Este é o erro mais tentador e já foi cometido aqui.

A conta: num quadro de 1080 de altura, para o pixel da borda andar 1px por frame, a escala
precisa mudar **0,185% por frame**. Ao longo de 150 frames isso é 1,0 → 1,28 — uma
aproximação agressiva, não um respiro de fundo. Qualquer coisa mais sutil que isso é
sub-pixel, e sub-pixel some no ruído de compressão.

Medido na prática: push-in de 1,0 → 1,025 em 150 frames deu YAVG **0,02–0,05**, o mesmo do
ruído. Ver `aprendizado.md` E1.

**Camada de ambiente que funciona:**

| recurso | por que funciona |
|---|---|
| acento diagonal viajando pelo fundo, 3–8px/frame | desloca área grande, e é o grafismo da marca |
| parallax de foto, 60–120px ao longo da peça | mudança concentrada, não diluída no quadro todo |
| contador trocando glifo | cada troca é um delta grande e local |
| máscara / wipe atravessando | revela área nova a cada frame |
| linha que se desenha continuamente | pequena, mas contínua e com direção |

**Não funciona:** escala global lenta, opacidade global lenta, gradiente derivando devagar,
qualquer "respiro" de menos de 1px por frame.

### Duas regras duras da camada de ambiente

**1. Sempre linear.** Easing serve para batida, que tem começo e fim. Ambiente não tem fim.
Curva de saída (expo-out) desacelera até quase parar e mata a peça justamente no trecho
final, em que o ambiente deveria carregar sozinho.

**2. Contraste medido, não token escolhido.** Ao levar o ambiente para outro fundo,
calcular o delta de luma — não confiar no papel da cor na paleta. O par que funciona no
escuro é grafite `#3f4448` sobre basalto `#1c1e20` (delta ~38). No claro, `concreto`
`#c3c3c3` sobre `fundo` `#e7e2d8` (delta ~32). Usar `borda #e4ddd0` sobre `fundo #e7e2d8`
dá delta ~3: invisível, e a peça reprova com 33% de frames mortos.

---

## O mapa de fluidez

Montar **antes de codar**, na etapa 4. É uma tabela de cobertura por faixa de frames:

```
frames    ambiente              narrativa                  detalhe
0–20      lâmina varrendo       —                          —
15–40     lâmina varrendo       wordmark entra (wipe)      —
34–60     acento derivando      eyebrow entra              wordmark assenta
52–80     acento derivando      régua desenha              —
70–100    acento derivando      assinatura (tracking)      régua alcança
95–130    acento derivando      —                          assinatura assenta
120–150   acento sai            selo final entra           —
```

**Como ler:** cada linha tem que ter pelo menos uma coluna preenchida com movimento
perceptível, e as faixas têm que encostar umas nas outras sem buraco. Uma linha só com
"—" nas três colunas é defeito garantido.

Mostrar essa tabela ao usuário antes de escrever código. Corrigir aqui custa uma
conversa; corrigir depois custa re-render dos três formatos.

---

## Quando o `fluidez.mjs` reprova

Ler o veredito e agir pela regra que falhou:

**Regra 1 (trecho morto):** localizar a faixa de frames apontada no mapa. Ou não havia
batida ali, ou a camada de ambiente é sub-pixel. Sobrepor a batida vizinha para dentro da
faixa, ou trocar o ambiente por um elemento que se desloca de verdade.

**Regra 2 (sem respiro por mais de 1s):** a peça tem batidas, mas todas pequenas e
espaçadas. Provavelmente falta a camada de ambiente por inteiro.

**Regra 3 (termina parada):** a última batida acaba cedo demais. Fechar com uma saída (o
acento sai de quadro), um selo final entrando, ou puxar a última batida para mais perto do
fim.

**Não corrigir aumentando a duração das transições existentes** — isso deixa a peça lenta
em vez de fluida. Cobertura vem de sobreposição e de camada, não de arrastar easing.

---

## Zonas seguras das redes

Instagram, TikTok e YouTube desenham perfil, legenda, botões e descrição **por cima** do
vídeo em formato vertical. Conteúdo crítico nessas faixas fica tapado no feed, mesmo
aparecendo certo no Studio.

| formato | topo coberto | base coberta | faixa útil |
|---|---|---|---|
| reels / stories 1080×1920 | 15% (288px) | 20% (384px) | y 288 – 1536 |
| feed 1080×1350 | 10% (135px) | 12% (162px) | y 135 – 1188 |
| landscape 1920×1080 | — | — | tudo |

Número, CTA, contato e assinatura ficam na faixa útil. Fundo e grafismo podem sangrar
para fora — é justamente o que dá profundidade sob a interface da rede.

`useLayout()` devolve `zonaSegura` já calculada por formato.

---

## Mínimos de tipografia

Vídeo não é página: não dá para aproximar nem reler. O texto precisa ser legível na
velocidade de reprodução, num celular, depois de a rede reencodar o arquivo.

| papel | mínimo (px do quadro final) |
|---|---|
| display / número de destaque | 72 |
| título | 56 |
| subtítulo | 40 |
| corpo | 32 |
| legenda | 24 |
| eyebrow / etiqueta | 20 |

Conferir contra o tamanho **renderizado** (`escalaTipo × escala`), não contra o valor da
tabela de escalas. `tamanhoTipo()` em `src/marca/tipografia.ts` aplica o piso e avisa no
console quando o pedido não passa.

Regra de composição que vem junto: **se sobra espaço vazio grande, os elementos estão
pequenos demais.** Preencher o quadro ou aumentar.

### Piso de tempo, além do piso de tamanho

Tamanho legível não basta: o texto precisa **ficar** legível tempo suficiente para ser
lido. Mínimo de **0,8s — 24 frames a 30fps** — por bloco de texto, contados entre o fim da
entrada e o começo da saída.

Isso limita o quanto se pode acelerar a densidade num trecho de texto: quatro linhas com
stagger de 5 frames e 24 frames de leitura cada não cabem em 2 segundos. Se não couber, o
problema é a duração da peça ou a quantidade de texto — **não** o piso.

**Legível não quer dizer parado.** O bloco fica legível enquanto a camada de ambiente
corre, enquanto a régua abaixo dele termina de desenhar e enquanto o elemento vizinho
reage. O que não pode acontecer nesses 24 frames é o próprio texto se mexer, borrar ou
mudar de opacidade.

Junto com isso: **nunca aplicar motion blur, aberração cromática ou grão pesado sobre texto
que precisa ser lido** (`camera-e-imagem.md`).

---

## Cobertura saudável

Referência para a saída do `fluidez.mjs`:

| métrica | alvo |
|---|---|
| frames "real" (> 0,40) | ≥ 60% |
| frames "morto" (< 0,10) | ≤ 5% |
| maior trecho morto | ≤ 8 frames |
| eventos por segundo | ≥ 3 |

Referência medida: `AberturaMarca` com ciclo de vida e 3,2 eventos/s fecha em **99–100%
real, 0% morto** nos três formatos. A versão anterior, com 1,4 evento/s e tudo congelando
após entrar, passava nas três regras de cobertura mas só porque a camada de ambiente
carregava a peça.

**Cobertura alta com densidade baixa é o sinal de alerta:** quer dizer que o fundo está
animado e o conteúdo, parado.
