# Tipografia cinética e legendas

> Ler quando a peça tiver texto em movimento, locução ou legenda. Tipografia não é
> decoração: é hierarquia de informação em movimento. API de legenda:
> `remotion-best-practices` → `remotion-captions/` (transcribe, display, import-srt) e
> `remotion-markup/text-highlights.md` (marcador, círculo, sublinhado, riscado, caixa).
> Pisos de tamanho e tempo: `doutrina-fluidez.md` (Mínimos de tipografia).
>
> **Exemplos da FX Minas.** Caminhos `RemotionFX/...` e `reels-ponto-cego/...` citados aqui são do
> projeto de referência onde a técnica foi provada (grupo FX Minas, marca industrial). No seu
> negócio o equivalente vive em `motion/src/`. Colunas "ex. FX" mostram como essa marca decidiu;
> pra outra marca, decidir pelo feel dela (`vocabulario.md` Feel da marca → vocabulário de movimento).

---

## 1. Hierarquia tipográfica

Contraste vem de diferença. Antes de animar, conferir se a hierarquia estática existe:

| nível | papel | tamanho (reels, escala 1) | peso | tracking | entrelinha |
|---|---|---|---|---|---|
| 1 herói | a mensagem | 100–210 | 800–900 | levemente negativo (−0,005em) | 0,84–0,95 |
| 2 apoio | explica em uma linha | 40–60 | 600–800 | 0 | 1,0–1,2 |
| 3 corpo | lê-se | 34–40 | 400–500 | 0 | 1,35–1,5 |
| 4 metadado / etiqueta | contexto | 22–30 | 500 mono | largo, 0,12–0,24em, uppercase | 1,2–1,5 |

- Peso antes de movimento: 400 → 700 ou 500 → 900 resolve hierarquia que animação
  nenhuma resolve.
- Tamanho: 96 / 42 / 22 hierarquiza melhor que tudo em 48.
- Tracking: display grande aperta; metadado pequeno em caixa alta abre. Não aplicar
  tracking em tudo.
- Pisos da casa (nunca abaixo): display 72, título 56, subtítulo 40, corpo 32, legenda
  24, eyebrow 20. `tamanhoTipo()` aplica e avisa.
- Poucas famílias: a marca manda. ex. FX Minas = Barlow (título), IBM Plex Sans (corpo), IBM Plex
  Mono (etiqueta). Lista genérica de fontes por feel só vale quando a marca não definiu.

---

## 2. Técnicas de texto em movimento

Duração a 30fps. Easing pelo papel (`vocabulario.md`). Coluna ex. FX (decisão da FX Minas, marca industrial): ✓ padrão da marca,
◐ com parcimônia, ✗ fora do tom.

| técnica | uso | duração | curva | anti-padrão | implementação | ex. FX |
|---|---|---|---|---|---|---|
| fade + sobe | corporativo, documental | 12–18f | expo-out, y +40 → 0 | tudo entrando igual | `opacity` + `translate` | ◐ |
| **máscara por palavra** | título, locução | 14–16f por palavra, passo 3–6f | expo-out | fade letra a letra | span `overflow:hidden`, filho `translate: 0 110% → 0` (componente `Palavras` em `reels-ponto-cego/comum.tsx`) | ✓ |
| máscara por linha | parágrafo curto, manifesto | 18f, passo 5–6f | expo-out | linhas demais | mesma máscara por linha | ✓ |
| wipe / clip reveal | editorial, título | 12–20f | atravessa | direção aleatória | `clip-path: inset()` animado | ✓ |
| scale pop | gancho, número | 8–12f | `spring` seco | pop em todo texto | 0,85 → 1,04 → 1 | ◐ |
| **batida (slam)** | resposta, virada | 16–20f + tremida 12–16f | `spring` damping ~11 | em tudo | escala 1,8 → 1 + shake com envelope | ✓ (Cena 3 do ReelsPontoCego) |
| blur reveal | premium, cinema | 12–18f | expo-out | em texto de leitura | `filter: blur(12px → 0)` + opacidade | ✗ |
| tracking reveal | wordmark, abertura | 18–24f | expo-out | tracking que muda a largura sem compensar | `letterSpacing` 0,3em → 0 com padding compensando | ◐ |
| typewriter / digitação | terminal, sigla, nome técnico | 1–2 caracteres por frame | linear | em frase longa | `slice(0, n)` + cursor piscando a cada 8f | ✓ (nome do DDS) |
| decode / scramble | tech | 16–24f | — | em marca séria | troca de caracteres com `random(semente)` | ✗ |
| destaque de palavra | ênfase dentro da frase | 6–10f | pulso | animar a frase inteira | ver §3 | ✓ |
| sublinhado que desenha | ênfase, link | 10–18f | expo-out | sublinhar tudo | régua diagonal `scaleX 0 → 1` | ✓ |
| riscado que desenha | correção, antes/depois | 10–14f | expo-out | — | traço por cima | ✓ |
| contador | número | 30–60f | expo-out, `tabular-nums` | linear; ano com separador (E18) | componente `Contador` | ✓ |
| brilho (brightness) | reagir sem mexer | 14–16f | pulso | glow em tudo | `filter: brightness(1 → 1,3 → 1)` (E9) | ✓ |
| bounce / elastic | lúdico | 10–16f | spring elástico | em peça séria | spring damping 8–12 | ✗ |
| glitch / RGB split | instabilidade digital | 4–8f em rajada | corte | vídeo inteiro glitchado | deslocamento horizontal + canais | ✗ |
| flip / perspectiva 3D | UI, lúdico | 12–18f | expo-out | — | `rotateX` com `perspective` | ✗ |
| texto em caminho | mapa, rota | segue o traço | linear | — | `<textPath>` | ◐ |
| morph de texto | transformação | 20–30f | in-out | entre palavras sem relação | morph de path (`dados-e-tecnico.md`) | ◐ |
| texto como máscara de vídeo | abertura, anúncio | — | — | texto fino demais | `background-clip: text` ou `clipPath` com o texto | ◐ |
| câmera atravessa o texto | transição | 20–30f | expo-in → expo-out | — | zoom no contador de uma letra até vazar a próxima cena | ◐ |

Regras da casa que não mudam: máscara, nunca fade letra a letra; texto que escala
compensa tracking; todo bloco legível pelo menos 24f; legível não é parado (o ambiente
segue).

---

## 3. Destaque de palavra (a técnica que mais parece profissional)

A frase fica estável e só a palavra-chave reage, no instante em que é falada (2f antes
da sílaba, `audio.md`):

- cor: base → acento (laranja na FX);
- escala 1,00 → 1,05 → 1,00 (pulso de 6–10f);
- opcional: pílula de fundo que cresce da esquerda (`scaleX`), sublinhado que desenha,
  `brightness` curto;
- opcional: deslocamento vertical de 2–4px.

Nada de rotação gigante, bounce ou blur. Combina com o zoom de destaque (`receitas.md`)
quando a palavra é a informação principal da cena.

---

## 4. Legendas

Reels e stories rodam **sem som** na maioria das vezes. Peça narrada pra rede social deve
ter legenda queimada, a não ser que o texto na tela já carregue a fala.

### Modelo de dados (Remotion 4.0.515, conferido no pacote instalado)

```ts
import type { Caption } from "@remotion/captions";
// { text, startMs, endMs, timestampMs: number | null, confidence: number | null }
```

- O `text` **é sensível a espaço em branco**: o espaço à esquerda faz parte do token
  (é assim que o whisper devolve). Não dar `trim()` antes de agrupar.
- `pageBreakAfter`, citado em documentação mais nova, **não existe** na 4.0.515.
- Paginar com `createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds,
  breakOnSilenceAfterMilliseconds })` → `pages[{ text, startMs, durationMs,
  tokens[{ text, fromMs, toMs }] }]`. Os tokens permitem destaque palavra a palavra.
- Outras utilidades: `parseSrt`, `serializeSrt`.
- Gerar os captions da locução com `RemotionFX/scripts/transcrever.mjs` (whisper.cpp,
  `language: "pt"`; A17), que já grava no formato `Caption`. Conferir fronteiras de frase
  contra `silencedetect`.
- Escrever o texto certo da copy por cima da transcrição quando o whisper errar grafia
  ("DDS", nomes, siglas): o tempo vem do whisper, a grafia vem da copy.

### Presets

Cada preset define: família, peso, tamanho, entrelinha, tracking, largura máxima,
alinhamento, posição, preenchimento, cor de destaque, contorno, sombra, fundo e
opacidade, padding, raio, animação da palavra, ênfase, entrada, saída.

| preset | quando | desenho |
|---|---|---|
| limpo | padrão institucional | corpo 600, 44–52px, sombra suave, sem fundo |
| mínimo | peça elegante | 400, 40px, sem animação por palavra |
| TikTok / social | Reels de gancho | 800–900 caixa alta, 60–72px, 2–4 palavras por página, palavra atual em acento |
| karaokê | locução guiando leitura | frase inteira, a palavra atual preenche de cor |
| destaque de palavra | educativo | frase estável, palavra-chave com pílula de acento |
| palavra-soco | frase de impacto | uma palavra por vez, grande, batida |
| editorial | marca de design | serifa ou grotesca fina, entrada por máscara |
| documental | depoimento, obra | 400–500, rodapé, fundo translúcido |
| tech / industrial | técnico, obra, máquina | mono na etiqueta + sans na fala, fundo sólido escuro com cantos 14 |
| corporativo | vaga, institucional | sans 600, fundo em pílula |
| educativo | explicação passo a passo | destaque de palavra + número da etapa |
| cinematográfico | abertura, manifesto | caixa alta, tracking largo, fade lento |
| luxo, gaming | só se a marca pedir | — |

**Exemplo, preset FX Minas (industrial/educativo):** IBM Plex Sans 600, 46–52px, creme sobre pílula
basalto (raio 14, padding 14×22) ou creme com sombra quando o fundo já é basalto;
palavra atual em laranja cheio com pulso de escala 1,05; 2 a 5 palavras por página
(`combineTokensWithinMilliseconds` ≈ 900); posição no terço inferior **acima de y=1536**
no reels (zona segura, E12), nunca por cima do desenho principal da cena.

### Legibilidade e contraste

Fundo complexo (foto): usar, do menos pro mais intrusivo, sombra → contorno → fundo
semitransparente → degradê escuro local → backdrop blur. Laranja sobre foto clara precisa
de cama escura (E16).

Checklist de legenda no portão (c): nada estourando a largura, nenhuma palavra cortada,
fora das zonas inseguras, no máximo 2 linhas, contraste, não cobre o sujeito, animação
contida, tempo certo, espaços certos.
